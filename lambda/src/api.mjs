// Capa HTTP: traduce eventos de API Gateway (payload v2) a llamadas del motor.
import { buscarConsultas, detalleConsulta } from './consultas.mjs';
import { EntradaInvalida, recomendar, siguientePregunta } from './motor.mjs';

const MAX_CUERPO_BYTES = 2048; // Ocho respuestas cortas y los datos del viajero caben de sobra.

function respuestaJson(status, cuerpo, origen) {
  const headers = { 'content-type': 'application/json; charset=utf-8' };
  if (origen) headers['access-control-allow-origin'] = origen;
  return { statusCode: status, headers, body: JSON.stringify(cuerpo) };
}

function leerCuerpo(evento) {
  const crudo = evento.isBase64Encoded
    ? Buffer.from(evento.body ?? '', 'base64').toString('utf8')
    : evento.body ?? '';
  if (Buffer.byteLength(crudo, 'utf8') > MAX_CUERPO_BYTES) {
    throw new EntradaInvalida(['El cuerpo es demasiado grande.']);
  }
  try {
    return JSON.parse(crudo);
  } catch {
    throw new EntradaInvalida(['El cuerpo no es JSON válido.']);
  }
}

export function crearManejador(db, { origenPermitido, registrarError = console.error }) {
  return async function manejar(evento) {
    const metodo = evento.requestContext?.http?.method;
    const ruta = evento.rawPath;
    const responder = (status, cuerpo) => respuestaJson(status, cuerpo, origenPermitido);

    try {
      if (metodo === 'POST' && ruta === '/recomendar') {
        return responder(200, await recomendar(db, leerCuerpo(evento)));
      }
      if (metodo === 'GET' && ruta === '/preguntas') {
        const respuestas = evento.queryStringParameters ?? {};
        return responder(200, await siguientePregunta(db, respuestas));
      }
      // Van por POST para que el teléfono y los apellidos no queden en la URL ni en los logs.
      if (metodo === 'POST' && ruta === '/consultas/buscar') {
        return responder(200, await buscarConsultas(db, leerCuerpo(evento)));
      }
      if (metodo === 'POST' && ruta === '/consultas/detalle') {
        const detalle = await detalleConsulta(db, leerCuerpo(evento));
        return detalle ? responder(200, detalle) : responder(404, { error: 'Consulta no encontrada' });
      }
      return responder(404, { error: 'Ruta no encontrada' });
    } catch (error) {
      if (error instanceof EntradaInvalida) {
        return responder(400, { error: error.message, detalles: error.detalles });
      }
      registrarError(error);
      return responder(500, { error: 'Error interno' });
    }
  };
}

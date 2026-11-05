// Capa HTTP: traduce eventos de API Gateway (payload v2) a llamadas del motor.
import { EntradaInvalida, recomendar, siguientePregunta } from './motor.mjs';

const MAX_CUERPO_BYTES = 2048; // Ocho respuestas cortas caben de sobra.

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

    try {
      if (metodo === 'POST' && ruta === '/recomendar') {
        return respuestaJson(200, await recomendar(db, leerCuerpo(evento)), origenPermitido);
      }
      if (metodo === 'GET' && ruta === '/preguntas') {
        const respuestas = evento.queryStringParameters ?? {};
        return respuestaJson(200, await siguientePregunta(db, respuestas), origenPermitido);
      }
      return respuestaJson(404, { error: 'Ruta no encontrada' }, origenPermitido);
    } catch (error) {
      if (error instanceof EntradaInvalida) {
        return respuestaJson(400, { error: error.message, detalles: error.detalles }, origenPermitido);
      }
      registrarError(error);
      return respuestaJson(500, { error: 'Error interno' }, origenPermitido);
    }
  };
}

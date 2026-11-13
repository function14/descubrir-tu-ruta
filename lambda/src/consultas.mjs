// Recuperar consultas anteriores con el teléfono y los apellidos de quien las hizo.
// Se piden los dos datos para que un número de teléfono solo no baste para ver a
// nombre de quién está ni qué buscaba. Si no coinciden, la respuesta es la misma
// que si no existieran consultas: así no se revela qué teléfonos están registrados.
import { EntradaInvalida } from './errores.mjs';
import { explicarConsulta, redondear } from './motor.mjs';
import { coincidenApellidos, validarBusqueda } from './viajero.mjs';

const MAXIMO_CONSULTAS = 50;
const FECHA_ISO = `to_char(fecha, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`; // fecha se guarda en UTC

async function consultasDe(db, { telefono, apellidos }) {
  const filas = await db.query(
    `SELECT id_consulta, ${FECHA_ISO} AS fecha, nombres, apellidos
       FROM consulta c
      WHERE c.telefono = $1
      ORDER BY c.fecha DESC, c.id_consulta DESC
      LIMIT 200`,
    [telefono],
  );
  return filas
    .filter((fila) => coincidenApellidos(fila.apellidos, apellidos))
    .slice(0, MAXIMO_CONSULTAS);
}

// Respuestas de cada consulta, en el orden en que el cuestionario las pregunta.
async function respuestasDe(db, ids) {
  const filas = await db.query(
    `SELECT ru.id_consulta, v.nombre AS variable, va.etiqueta AS valor
       FROM respuesta_usuario ru
       JOIN variable v ON v.id_variable = ru.id_variable
       JOIN valor va ON va.id_valor = ru.id_valor
      WHERE ru.id_consulta = ANY($1::int[])
      ORDER BY ru.id_consulta, ru.id_variable`,
    [ids],
  );
  const porConsulta = new Map();
  for (const { id_consulta, variable, valor } of filas) {
    const id = Number(id_consulta);
    if (!porConsulta.has(id)) porConsulta.set(id, {});
    porConsulta.get(id)[variable] = valor;
  }
  return porConsulta;
}

// Destino principal y número de destinos compatibles, con el mismo orden del motor.
async function resumenesDe(db, ids) {
  const filas = await db.query(
    `SELECT id_consulta,
            COUNT(*)::int AS total_destinos,
            (array_agg(nombre ORDER BY puntaje DESC, reglas_exactas DESC, nombre))[1] AS destino_principal,
            MAX(puntaje) / SUM(puntaje) * 100 AS peso_principal
       FROM puntaje_destino
      WHERE id_consulta = ANY($1::int[]) AND puntaje > 0
      GROUP BY id_consulta`,
    [ids],
  );
  return new Map(filas.map((fila) => [Number(fila.id_consulta), fila]));
}

export async function buscarConsultas(db, busqueda) {
  const datos = validarBusqueda(busqueda);
  const consultas = await consultasDe(db, datos);
  if (consultas.length === 0) return { consultas: [] };

  const ids = consultas.map((c) => Number(c.id_consulta));
  const [respuestas, resumenes] = await Promise.all([respuestasDe(db, ids), resumenesDe(db, ids)]);

  return {
    consultas: consultas.map((consulta) => {
      const id = Number(consulta.id_consulta);
      const resumen = resumenes.get(id);
      return {
        consulta_id: id,
        fecha: consulta.fecha,
        nombres: consulta.nombres,
        apellidos: consulta.apellidos,
        respuestas: respuestas.get(id) ?? {},
        destino_principal: resumen?.destino_principal ?? null,
        peso_principal: resumen ? redondear(resumen.peso_principal) : null,
        total_destinos: resumen?.total_destinos ?? 0,
      };
    }),
  };
}

// Una consulta completa, con la misma forma que devuelve POST /recomendar.
// Devuelve null si no existe o si el teléfono y los apellidos no son los suyos.
export async function detalleConsulta(db, busqueda) {
  const datos = validarBusqueda(busqueda);
  const id = busqueda.consulta_id;
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    throw new EntradaInvalida(['Indica el número de la consulta.']);
  }

  const [consulta] = await db.query(
    `SELECT ${FECHA_ISO} AS fecha, nombres, apellidos
       FROM consulta
      WHERE id_consulta = $1::int AND telefono = $2`,
    [id, datos.telefono],
  );
  if (!consulta || !coincidenApellidos(consulta.apellidos, datos.apellidos)) return null;

  const [respuestas, { resultado }] = await Promise.all([
    respuestasDe(db, [id]),
    explicarConsulta(db, id),
  ]);
  return {
    consulta_id: id,
    fecha: consulta.fecha,
    nombres: consulta.nombres,
    apellidos: consulta.apellidos,
    respuestas: respuestas.get(id) ?? {},
    ...resultado,
  };
}

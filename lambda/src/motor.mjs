// Motor de inferencia de Descubrir tu Ruta (encadenamiento hacia adelante).
// El conocimiento vive en la base de datos: aquí no hay ninguna regla ni destino
// escrito a mano, solo el procedimiento que las evalúa.
//
// `db` expone dos métodos, para poder probar el motor sin Neon:
//   query(texto, parametros)        -> filas
//   transaction([[texto, params]])  -> ejecuta todo o nada

const USUARIO_INVITADO = 1; // Usuario sembrado en 02_conocimiento.sql

export class EntradaInvalida extends Error {
  constructor(detalles) {
    super('Entrada inválida');
    this.detalles = detalles;
  }
}

const redondear = (n) => Math.round(Number(n) * 100) / 100;

async function cargarVocabulario(db) {
  const filas = await db.query(
    `SELECT v.id_variable, v.nombre AS variable, va.id_valor, va.etiqueta
       FROM variable v
       JOIN valor va ON va.id_variable = v.id_variable
      ORDER BY v.id_variable, va.id_valor`,
  );
  const vocabulario = new Map();
  for (const { id_variable, variable, id_valor, etiqueta } of filas) {
    if (!vocabulario.has(variable)) {
      vocabulario.set(variable, { id_variable, valores: new Map() });
    }
    vocabulario.get(variable).valores.set(etiqueta, id_valor);
  }
  return vocabulario;
}

// Traduce las respuestas a hechos (ids), rechazando lo que no exista en la base.
function validar(respuestas, vocabulario, { exigirRespuestas }) {
  if (respuestas === null || typeof respuestas !== 'object' || Array.isArray(respuestas)) {
    throw new EntradaInvalida(['El cuerpo debe ser un objeto JSON con las respuestas.']);
  }
  const entradas = Object.entries(respuestas);
  if (exigirRespuestas && entradas.length === 0) {
    throw new EntradaInvalida(['Se necesita al menos una respuesta.']);
  }

  const errores = [];
  const hechos = [];
  for (const [variable, valor] of entradas) {
    const definicion = vocabulario.get(variable);
    if (!definicion) {
      errores.push(`Variable desconocida: ${variable}. Permitidas: ${[...vocabulario.keys()].join(', ')}.`);
    } else if (!definicion.valores.has(valor)) {
      errores.push(`Valor no permitido para ${variable}. Permitidos: ${[...definicion.valores.keys()].join(', ')}.`);
    } else {
      hechos.push({ id_variable: definicion.id_variable, id_valor: definicion.valores.get(valor) });
    }
  }
  if (errores.length) throw new EntradaInvalida(errores);
  return hechos;
}

// Cuestionario adaptativo: pregunta solo lo que aún puede cambiar el resultado.
// Una regla sigue viva mientras ningún hecho contradiga sus condiciones. La
// siguiente pregunta es la primera variable sin responder que distingue entre
// reglas vivas, y sus opciones son únicamente los valores que esas reglas usan.
export async function siguientePregunta(db, respuestas) {
  const vocabulario = await cargarVocabulario(db);
  const hechos = validar(respuestas, vocabulario, { exigirRespuestas: false });

  const opciones = await db.query(
    `WITH hechos AS (
       SELECT * FROM unnest($1::int[], $2::int[]) AS h(id_variable, id_valor)
     ),
     vivas AS (
       SELECT r.id_regla
         FROM regla r
         JOIN destino d ON d.id_destino = r.id_destino
        WHERE r.activa = 1 AND d.activo = 1
          AND NOT EXISTS (
            SELECT 1
              FROM regla_condicion rc
              JOIN hechos h ON h.id_variable = rc.id_variable
             WHERE rc.id_regla = r.id_regla AND h.id_valor <> rc.id_valor)
     ),
     candidatas AS (
       SELECT rc.id_variable
         FROM regla_condicion rc
         JOIN vivas USING (id_regla)
        WHERE rc.id_variable NOT IN (SELECT id_variable FROM hechos)
        GROUP BY rc.id_variable
       HAVING COUNT(DISTINCT rc.id_valor) >= 2
        ORDER BY rc.id_variable
        LIMIT 1
     )
     SELECT DISTINCT v.nombre AS variable, va.id_valor, va.etiqueta
       FROM candidatas c
       JOIN variable v ON v.id_variable = c.id_variable
       JOIN regla_condicion rc ON rc.id_variable = c.id_variable
       JOIN vivas USING (id_regla)
       JOIN valor va ON va.id_valor = rc.id_valor
      ORDER BY va.id_valor`,
    [hechos.map((h) => h.id_variable), hechos.map((h) => h.id_valor)],
  );

  const respondidas = hechos.length;
  if (opciones.length === 0) return { fin: true, respondidas, siguiente: null };
  return {
    fin: false,
    respondidas,
    siguiente: {
      variable: opciones[0].variable,
      valores: opciones.map((o) => o.etiqueta),
    },
  };
}

async function registrarHechos(db, hechos) {
  const [{ id }] = await db.query(
    `SELECT nextval(pg_get_serial_sequence('consulta', 'id_consulta')) AS id`,
  );
  const idConsulta = Number(id);
  await db.transaction([
    [
      'INSERT INTO consulta (id_consulta, id_usuario) VALUES ($1::int, $2::int)',
      [idConsulta, USUARIO_INVITADO],
    ],
    [
      `INSERT INTO respuesta_usuario (id_consulta, id_variable, id_valor)
       SELECT $1::int, h.id_variable, h.id_valor
         FROM unnest($2::int[], $3::int[]) AS h(id_variable, id_valor)`,
      [idConsulta, hechos.map((h) => h.id_variable), hechos.map((h) => h.id_valor)],
    ],
  ]);
  return idConsulta;
}

// Ranking por puntaje; el desempate por reglas exactas viene de la especificación
// y el nombre solo garantiza que un mismo caso dé siempre el mismo orden.
function ordenarDestinos(db, idConsulta) {
  return db.query(
    `SELECT p.id_destino, p.nombre, d.region, d.descripcion, p.puntaje, p.reglas_exactas
       FROM puntaje_destino p
       JOIN destino d ON d.id_destino = p.id_destino
      WHERE p.id_consulta = $1 AND p.puntaje > 0
      ORDER BY p.puntaje DESC, p.reglas_exactas DESC, p.nombre`,
    [idConsulta],
  );
}

function reglasDisparadas(db, idConsulta, idsDestino) {
  return db.query(
    `SELECT pr.id_regla, pr.id_destino, r.codigo, pr.aporte, pr.cumplidas = pr.total AS exacta
       FROM puntaje_regla pr
       JOIN regla r ON r.id_regla = pr.id_regla
      WHERE pr.id_consulta = $1
        AND pr.id_destino = ANY($2::int[])
        AND pr.cumplidas > 0
      ORDER BY pr.aporte DESC, pr.id_regla`,
    [idConsulta, idsDestino],
  );
}

function condicionesDeReglas(db, idConsulta, idsRegla) {
  return db.query(
    `SELECT rc.id_regla, v.nombre AS variable, va.etiqueta AS valor,
            ru.id_valor IS NOT DISTINCT FROM rc.id_valor AS cumplida
       FROM regla_condicion rc
       JOIN variable v ON v.id_variable = rc.id_variable
       JOIN valor va ON va.id_valor = rc.id_valor
       LEFT JOIN respuesta_usuario ru
         ON ru.id_consulta = $1 AND ru.id_variable = rc.id_variable
      WHERE rc.id_regla = ANY($2::int[])
      ORDER BY rc.id_regla, rc.id_variable`,
    [idConsulta, idsRegla],
  );
}

function guardarRecomendacion(db, idConsulta, ranking, reglas) {
  return db.transaction([
    [
      `INSERT INTO recomendacion (id_consulta, posicion, id_destino, puntaje)
       SELECT $1::int, f.posicion, f.id_destino, f.puntaje
         FROM unnest($2::int[], $3::int[], $4::numeric[]) AS f(posicion, id_destino, puntaje)`,
      [
        idConsulta,
        ranking.map((_, i) => i + 1),
        ranking.map((d) => d.id_destino),
        ranking.map((d) => redondear(d.puntaje)),
      ],
    ],
    [
      `INSERT INTO recomendacion_regla (id_consulta, id_regla)
       SELECT $1::int, id_regla FROM unnest($2::int[]) AS f(id_regla)`,
      [idConsulta, reglas.map((r) => r.id_regla)],
    ],
  ]);
}

function agruparPor(filas, clave) {
  const grupos = new Map();
  for (const fila of filas) {
    if (!grupos.has(fila[clave])) grupos.set(fila[clave], []);
    grupos.get(fila[clave]).push(fila);
  }
  return grupos;
}

export async function recomendar(db, respuestas) {
  const vocabulario = await cargarVocabulario(db);
  const hechos = validar(respuestas, vocabulario, { exigirRespuestas: true });

  const idConsulta = await registrarHechos(db, hechos);
  const ranking = await ordenarDestinos(db, idConsulta);

  if (ranking.length === 0) {
    return {
      consulta_id: idConsulta,
      recomendaciones: [],
      mensaje: 'Ninguna regla coincide con estas respuestas; no hay una recomendación fiable.',
    };
  }

  const reglas = await reglasDisparadas(db, idConsulta, ranking.map((d) => d.id_destino));
  const condiciones = await condicionesDeReglas(db, idConsulta, reglas.map((r) => r.id_regla));
  await guardarRecomendacion(db, idConsulta, ranking, reglas);

  const reglasPorDestino = agruparPor(reglas, 'id_destino');
  const condicionesPorRegla = agruparPor(condiciones, 'id_regla');
  const puntajeTotal = ranking.reduce((suma, d) => suma + Number(d.puntaje), 0);

  return {
    consulta_id: idConsulta,
    recomendaciones: ranking.map((destino, indice) => {
      const propias = reglasPorDestino.get(destino.id_destino) ?? [];
      return {
        posicion: indice + 1,
        destino: destino.nombre,
        region: destino.region,
        descripcion: destino.descripcion,
        puntaje: redondear(destino.puntaje),
        peso_relativo: redondear((Number(destino.puntaje) / puntajeTotal) * 100),
        reglas_exactas: Number(destino.reglas_exactas),
        reglas: propias.map((r) =>
          r.exacta ? r.codigo : `${r.codigo} (parcial ${redondear(r.aporte)})`,
        ),
        explicacion: propias.map((r) => ({
          regla: r.codigo,
          tipo: r.exacta ? 'exacta' : 'parcial',
          aporte: redondear(r.aporte),
          condiciones: (condicionesPorRegla.get(r.id_regla) ?? []).map(
            ({ variable, valor, cumplida }) => ({ variable, valor, cumplida }),
          ),
        })),
      };
    }),
  };
}

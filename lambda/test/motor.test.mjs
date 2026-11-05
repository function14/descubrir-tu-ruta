import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { crearManejador } from '../src/api.mjs';
import { EntradaInvalida, recomendar, siguientePregunta } from '../src/motor.mjs';
import { crearBase } from './ayuda.mjs';

const CASO_CONOCIDO = {
  tipo_experiencia: 'Cultura',
  geografia: 'Urbano',
  presupuesto: 'Medio',
  clima: 'Templado',
};

let db;
before(async () => {
  db = await crearBase();
});

describe('base de conocimiento', () => {
  it('carga 25 destinos y 58 reglas repartidas en dos árboles', async () => {
    const [{ destinos, r, rc, sin_condiciones }] = await db.query(`
      SELECT (SELECT COUNT(*) FROM destino)::int AS destinos,
             (SELECT COUNT(*) FROM regla WHERE id_arbol = 1)::int AS r,
             (SELECT COUNT(*) FROM regla WHERE id_arbol = 2)::int AS rc,
             (SELECT COUNT(*) FROM regla x WHERE NOT EXISTS
               (SELECT 1 FROM regla_condicion c WHERE c.id_regla = x.id_regla))::int AS sin_condiciones`);
    assert.deepEqual({ destinos, r, rc, sin_condiciones }, { destinos: 25, r: 33, rc: 25, sin_condiciones: 0 });
  });

  it('solo usa condiciones cuyo valor pertenece a su variable', async () => {
    const filas = await db.query(`
      SELECT rc.id_regla FROM regla_condicion rc
      JOIN valor v ON v.id_valor = rc.id_valor
      WHERE v.id_variable <> rc.id_variable`);
    assert.deepEqual(filas, []);
  });
});

describe('inferencia', () => {
  it('resuelve el caso conocido: Medellín con R23 y RC8 exactas', async () => {
    const { recomendaciones } = await recomendar(db, CASO_CONOCIDO);
    const [primero] = recomendaciones;
    assert.ok(recomendaciones.length > 3);
    assert.equal(primero.destino, 'Medellín');
    assert.equal(primero.posicion, 1);
    assert.equal(primero.reglas_exactas, 2);
    assert.deepEqual(primero.reglas.slice(0, 2), ['R23', 'RC8']);
    assert.equal(primero.puntaje, 2);
  });

  it('devuelve todos los destinos compatibles, de mayor a menor peso', async () => {
    const { recomendaciones } = await recomendar(db, CASO_CONOCIDO);
    const [{ posibles }] = await db.query(
      'SELECT COUNT(*)::int AS posibles FROM puntaje_destino WHERE id_consulta = 1 AND puntaje > 0',
    );
    assert.equal(recomendaciones.length, posibles);

    recomendaciones.forEach((destino, indice) => {
      assert.equal(destino.posicion, indice + 1);
      assert.ok(destino.peso_relativo > 0);
      if (indice > 0) {
        assert.ok(destino.peso_relativo <= recomendaciones[indice - 1].peso_relativo);
      }
    });

    const suma = recomendaciones.reduce((total, d) => total + d.peso_relativo, 0);
    assert.ok(Math.abs(suma - 100) < 0.5, `los pesos suman ${suma}`);
  });

  it('calcula el aporte parcial como 0.5 × cumplidas / totales', async () => {
    const { recomendaciones } = await recomendar(db, { tipo_experiencia: 'Cultura' });
    const parciales = recomendaciones.flatMap((d) => d.explicacion);
    const regla = parciales.find((r) => r.tipo === 'parcial' && r.condiciones.length === 2);
    assert.ok(regla, 'se esperaba una regla parcial de dos condiciones');
    assert.equal(regla.aporte, 0.25);
    assert.equal(regla.condiciones.filter((c) => c.cumplida).length, 1);
  });

  it('desempata por reglas exactas y es determinista', async () => {
    const una = await recomendar(db, CASO_CONOCIDO);
    const otra = await recomendar(db, CASO_CONOCIDO);
    assert.deepEqual(
      una.recomendaciones.map((d) => d.destino),
      otra.recomendaciones.map((d) => d.destino),
    );
    for (let i = 1; i < una.recomendaciones.length; i++) {
      const previo = una.recomendaciones[i - 1];
      const actual = una.recomendaciones[i];
      assert.ok(
        previo.puntaje > actual.puntaje ||
          (previo.puntaje === actual.puntaje && previo.reglas_exactas >= actual.reglas_exactas),
      );
    }
  });

  it('ignora reglas y destinos inactivos sin cambiar el código', async () => {
    await db.query(`UPDATE destino SET activo = 0 WHERE nombre = 'Medellín'`);
    try {
      const { recomendaciones } = await recomendar(db, CASO_CONOCIDO);
      assert.ok(!recomendaciones.some((d) => d.destino === 'Medellín'));
    } finally {
      await db.query(`UPDATE destino SET activo = 1 WHERE nombre = 'Medellín'`);
    }
  });

  it('deja trazabilidad de hechos, recomendación y reglas disparadas', async () => {
    const { consulta_id, recomendaciones } = await recomendar(db, CASO_CONOCIDO);
    const [{ hechos, top, reglas }] = await db.query(
      `SELECT (SELECT COUNT(*) FROM respuesta_usuario WHERE id_consulta = $1)::int AS hechos,
              (SELECT COUNT(*) FROM recomendacion WHERE id_consulta = $1)::int AS top,
              (SELECT COUNT(*) FROM recomendacion_regla WHERE id_consulta = $1)::int AS reglas`,
      [consulta_id],
    );
    assert.equal(hechos, 4);
    assert.equal(top, recomendaciones.length);
    assert.equal(reglas, recomendaciones.reduce((n, d) => n + d.reglas.length, 0));
  });

  it('avisa en lugar de inventar un ranking cuando ninguna regla coincide', async () => {
    await db.query('UPDATE regla SET activa = 0');
    try {
      const resultado = await recomendar(db, CASO_CONOCIDO);
      assert.deepEqual(resultado.recomendaciones, []);
      assert.match(resultado.mensaje, /no hay una recomendación/);
    } finally {
      await db.query('UPDATE regla SET activa = 1');
    }
  });
});

describe('validación', () => {
  const casos = [
    ['variable desconocida', { color: 'Azul' }, /Variable desconocida/],
    ['valor fuera de la base', { geografia: 'Isla' }, /Valor no permitido para geografia/],
    ['sin respuestas', {}, /al menos una/],
    ['arreglo', [], /objeto JSON/],
    ['nulo', null, /objeto JSON/],
    ['intento de inyección', { clima: "Frío'; DROP TABLE regla; --" }, /Valor no permitido/],
  ];

  for (const [nombre, entrada, esperado] of casos) {
    it(`rechaza ${nombre}`, async () => {
      await assert.rejects(recomendar(db, entrada), (error) => {
        assert.ok(error instanceof EntradaInvalida);
        assert.match(error.detalles.join(' '), esperado);
        return true;
      });
    });
  }

  it('no crea una consulta cuando la entrada es inválida', async () => {
    const contar = async () => (await db.query('SELECT COUNT(*)::int AS n FROM consulta'))[0].n;
    const antes = await contar();
    await assert.rejects(recomendar(db, { geografia: 'Isla' }));
    assert.equal(await contar(), antes);
  });
});

describe('cuestionario adaptativo', () => {
  it('empieza por el tipo de experiencia con sus cuatro opciones', async () => {
    const { fin, siguiente } = await siguientePregunta(db, {});
    assert.equal(fin, false);
    assert.equal(siguiente.variable, 'tipo_experiencia');
    assert.equal(siguiente.valores.length, 4);
  });

  it('solo ofrece valores de reglas que siguen vivas', async () => {
    const { siguiente } = await siguientePregunta(db, {
      tipo_experiencia: 'Playa/Relax',
      clima: 'Frío',
      presupuesto: 'Económico',
    });
    assert.equal(siguiente.variable, 'esfuerzo_fisico');
    assert.ok(!siguiente.valores.includes('Bajo'));
  });

  it('siempre termina y cada opción lleva a una recomendación', async () => {
    const maximo = { preguntas: 0 };

    async function recorrer(respuestas) {
      const { fin, siguiente } = await siguientePregunta(db, respuestas);
      if (fin) {
        maximo.preguntas = Math.max(maximo.preguntas, Object.keys(respuestas).length);
        const { recomendaciones } = await recomendar(db, respuestas);
        assert.ok(recomendaciones.length > 0, JSON.stringify(respuestas));
        assert.ok(recomendaciones[0].reglas_exactas >= 1, JSON.stringify(respuestas));
        return 1;
      }
      let caminos = 0;
      for (const valor of siguiente.valores) {
        caminos += await recorrer({ ...respuestas, [siguiente.variable]: valor });
      }
      return caminos;
    }

    const caminos = await recorrer({});
    assert.ok(caminos > 50, `caminos: ${caminos}`);
    assert.ok(maximo.preguntas <= 8);
  });
});

describe('API', () => {
  const eventoPost = (cuerpo) => ({
    rawPath: '/recomendar',
    requestContext: { http: { method: 'POST' } },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });

  const manejador = (opciones = {}) =>
    crearManejador(db, { origenPermitido: 'https://ejemplo.vercel.app', ...opciones });

  it('POST /recomendar responde 200 con CORS del origen permitido', async () => {
    const respuesta = await manejador()(eventoPost(CASO_CONOCIDO));
    assert.equal(respuesta.statusCode, 200);
    assert.equal(respuesta.headers['access-control-allow-origin'], 'https://ejemplo.vercel.app');
    assert.equal(JSON.parse(respuesta.body).recomendaciones[0].destino, 'Medellín');
  });

  it('acepta cuerpos en base64 como los envía API Gateway', async () => {
    const evento = eventoPost(Buffer.from(JSON.stringify(CASO_CONOCIDO)).toString('base64'));
    const respuesta = await manejador()({ ...evento, isBase64Encoded: true });
    assert.equal(respuesta.statusCode, 200);
  });

  it('GET /preguntas usa los parámetros como respuestas previas', async () => {
    const respuesta = await manejador()({
      rawPath: '/preguntas',
      requestContext: { http: { method: 'GET' } },
      queryStringParameters: { tipo_experiencia: 'Cultura' },
    });
    const cuerpo = JSON.parse(respuesta.body);
    assert.equal(respuesta.statusCode, 200);
    assert.equal(cuerpo.respondidas, 1);
    assert.equal(cuerpo.siguiente.variable, 'clima');
  });

  it('responde 400 ante JSON roto y 404 ante ruta desconocida', async () => {
    assert.equal((await manejador()(eventoPost('{no json'))).statusCode, 400);
    const noExiste = await manejador()({ rawPath: '/x', requestContext: { http: { method: 'GET' } } });
    assert.equal(noExiste.statusCode, 404);
  });

  it('rechaza cuerpos demasiado grandes', async () => {
    const respuesta = await manejador()(eventoPost({ clima: 'x'.repeat(5000) }));
    assert.equal(respuesta.statusCode, 400);
    assert.match(respuesta.body, /demasiado grande/);
  });

  it('no filtra detalles internos cuando falla la base', async () => {
    const errores = [];
    const fallida = {
      query: async () => {
        throw new Error('password authentication failed for neondb_owner');
      },
    };
    const respuesta = await crearManejador(fallida, {
      origenPermitido: 'https://ejemplo.vercel.app',
      registrarError: (e) => errores.push(e),
    })(eventoPost(CASO_CONOCIDO));
    assert.equal(respuesta.statusCode, 500);
    assert.doesNotMatch(respuesta.body, /password|neondb/);
    assert.equal(errores.length, 1);
  });
});

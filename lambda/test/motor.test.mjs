import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { crearManejador } from '../src/api.mjs';
import { buscarConsultas, detalleConsulta } from '../src/consultas.mjs';
import { EntradaInvalida, recomendar, siguientePregunta } from '../src/motor.mjs';
import { coincidenApellidos, normalizarTelefono } from '../src/viajero.mjs';
import { crearBase } from './ayuda.mjs';

const CASO_CONOCIDO = {
  tipo_experiencia: 'Cultura',
  geografia: 'Urbano',
  presupuesto: 'Medio',
  clima: 'Templado',
};

const VIAJERO = {
  nombres: 'Ana María',
  apellidos: 'Gómez Pérez',
  telefono: '300 123 4567',
  autoriza_datos: true,
};

let db;
before(async () => {
  db = await crearBase();
});

const pedir = (respuestas, viajero = VIAJERO) => recomendar(db, { viajero, respuestas });

const rechazaCon = async (promesa, esperado) =>
  assert.rejects(promesa, (error) => {
    assert.ok(error instanceof EntradaInvalida);
    assert.match(error.detalles.join(' '), esperado);
    return true;
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
    const { recomendaciones } = await pedir(CASO_CONOCIDO);
    const [primero] = recomendaciones;
    assert.ok(recomendaciones.length > 3);
    assert.equal(primero.destino, 'Medellín');
    assert.equal(primero.posicion, 1);
    assert.equal(primero.reglas_exactas, 2);
    assert.deepEqual(primero.reglas.slice(0, 2), ['R23', 'RC8']);
    assert.equal(primero.puntaje, 2);
  });

  it('devuelve todos los destinos compatibles, de mayor a menor peso', async () => {
    const { recomendaciones } = await pedir(CASO_CONOCIDO);
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
    const { recomendaciones } = await pedir({ tipo_experiencia: 'Cultura' });
    const parciales = recomendaciones.flatMap((d) => d.explicacion);
    const regla = parciales.find((r) => r.tipo === 'parcial' && r.condiciones.length === 2);
    assert.ok(regla, 'se esperaba una regla parcial de dos condiciones');
    assert.equal(regla.aporte, 0.25);
    assert.equal(regla.condiciones.filter((c) => c.cumplida).length, 1);
  });

  it('desempata por reglas exactas y es determinista', async () => {
    const una = await pedir(CASO_CONOCIDO);
    const otra = await pedir(CASO_CONOCIDO);
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
      const { recomendaciones } = await pedir(CASO_CONOCIDO);
      assert.ok(!recomendaciones.some((d) => d.destino === 'Medellín'));
    } finally {
      await db.query(`UPDATE destino SET activo = 1 WHERE nombre = 'Medellín'`);
    }
  });

  it('deja trazabilidad de hechos, recomendación y reglas disparadas', async () => {
    const { consulta_id, recomendaciones } = await pedir(CASO_CONOCIDO);
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
      const resultado = await pedir(CASO_CONOCIDO);
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
      await rechazaCon(pedir(entrada), esperado);
    });
  }

  it('no crea una consulta cuando la entrada es inválida', async () => {
    const contar = async () => (await db.query('SELECT COUNT(*)::int AS n FROM consulta'))[0].n;
    const antes = await contar();
    await assert.rejects(pedir({ geografia: 'Isla' }));
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
        const { recomendaciones } = await pedir(respuestas);
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
    const respuesta = await manejador()(eventoPost({ viajero: VIAJERO, respuestas: CASO_CONOCIDO }));
    assert.equal(respuesta.statusCode, 200);
    assert.equal(respuesta.headers['access-control-allow-origin'], 'https://ejemplo.vercel.app');
    assert.equal(JSON.parse(respuesta.body).recomendaciones[0].destino, 'Medellín');
  });

  it('acepta cuerpos en base64 como los envía API Gateway', async () => {
    const cuerpo = JSON.stringify({ viajero: VIAJERO, respuestas: CASO_CONOCIDO });
    const evento = eventoPost(Buffer.from(cuerpo).toString('base64'));
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
    })(eventoPost({ viajero: VIAJERO, respuestas: CASO_CONOCIDO }));
    assert.equal(respuesta.statusCode, 500);
    assert.doesNotMatch(respuesta.body, /password|neondb/);
    assert.equal(errores.length, 1);
  });
});

describe('datos del viajero', () => {
  it('nombra la consulta con nombres, apellidos y teléfono normalizado', async () => {
    const { consulta_id } = await pedir(CASO_CONOCIDO, {
      ...VIAJERO,
      nombres: '  Ana   María ',
      telefono: '+57 (300) 123-4567',
    });
    const [fila] = await db.query(
      'SELECT nombres, apellidos, telefono FROM consulta WHERE id_consulta = $1',
      [consulta_id],
    );
    assert.deepEqual(fila, { nombres: 'Ana María', apellidos: 'Gómez Pérez', telefono: '3001234567' });
  });

  const invalidos = [
    ['sin viajero', null, /Faltan los datos del viajero/],
    ['nombres vacíos', { ...VIAJERO, nombres: ' ' }, /Escribe tus nombres/],
    ['apellidos con números', { ...VIAJERO, apellidos: 'Gómez 2' }, /solo pueden tener letras/],
    ['nombres demasiado largos', { ...VIAJERO, nombres: 'a'.repeat(61) }, /hasta 60/],
    ['teléfono corto', { ...VIAJERO, telefono: '12345' }, /10 dígitos/],
    ['teléfono que no es de Colombia', { ...VIAJERO, telefono: '4001234567' }, /10 dígitos/],
    ['sin autorización de datos', { ...VIAJERO, autoriza_datos: false }, /autorización/],
  ];

  for (const [nombre, viajero, esperado] of invalidos) {
    it(`rechaza ${nombre} sin crear la consulta`, async () => {
      const contar = async () => (await db.query('SELECT COUNT(*)::int AS n FROM consulta'))[0].n;
      const antes = await contar();
      await rechazaCon(pedir(CASO_CONOCIDO, viajero), esperado);
      assert.equal(await contar(), antes);
    });
  }

  it('rechaza el cuerpo antiguo, que solo traía las respuestas', async () => {
    await rechazaCon(recomendar(db, CASO_CONOCIDO), /Faltan los datos del viajero/);
  });

  it('acepta celulares y fijos de Colombia con o sin indicativo', () => {
    assert.equal(normalizarTelefono('300 123 4567'), '3001234567');
    assert.equal(normalizarTelefono('+57 300-123-4567'), '3001234567');
    assert.equal(normalizarTelefono('573001234567'), '3001234567');
    assert.equal(normalizarTelefono('(601) 234 5678'), '6012345678');
    assert.equal(normalizarTelefono('2345678'), null);
    assert.equal(normalizarTelefono(3001234567), null);
  });

  it('compara apellidos sin tildes ni mayúsculas y acepta solo el primero', () => {
    assert.equal(coincidenApellidos('Gómez Pérez', 'gomez'), true);
    assert.equal(coincidenApellidos('Gómez Pérez', 'GÓMEZ PEREZ'), true);
    assert.equal(coincidenApellidos('Gómez Pérez', 'Pérez'), false);
    assert.equal(coincidenApellidos('Gómez Pérez', 'Gom'), false);
    assert.equal(coincidenApellidos('Gómez Pérez', ''), false);
    assert.equal(coincidenApellidos(null, 'Gómez'), false);
  });
});

describe('historial de consultas', () => {
  const ROSA = { nombres: 'Rosa', apellidos: 'Rincón Díaz', telefono: '3109876543', autoriza_datos: true };
  const OTRA = { ...ROSA, nombres: 'Lucía', apellidos: 'Suárez' }; // mismo teléfono, otra persona
  let primera;
  let segunda;

  before(async () => {
    primera = await pedir({ tipo_experiencia: 'Aventura' }, ROSA);
    segunda = await pedir(CASO_CONOCIDO, ROSA);
    await pedir(CASO_CONOCIDO, OTRA);
  });

  it('encuentra con teléfono y primer apellido solo las consultas a su nombre', async () => {
    const { consultas } = await buscarConsultas(db, { telefono: '310 987 6543', apellidos: 'rincon' });
    assert.deepEqual(
      consultas.map((c) => c.consulta_id),
      [segunda.consulta_id, primera.consulta_id],
    );
    assert.ok(consultas.every((c) => c.nombres === 'Rosa' && c.apellidos === 'Rincón Díaz'));
    assert.ok(consultas.every((c) => !('telefono' in c)));
  });

  it('resume cada consulta con sus respuestas y su destino principal', async () => {
    const { consultas } = await buscarConsultas(db, { telefono: '3109876543', apellidos: 'Rincón' });
    const [reciente] = consultas;
    assert.deepEqual(Object.keys(reciente.respuestas), ['tipo_experiencia', 'clima', 'presupuesto', 'geografia']);
    assert.deepEqual(reciente.respuestas, CASO_CONOCIDO);
    assert.equal(reciente.destino_principal, 'Medellín');
    assert.equal(reciente.peso_principal, segunda.recomendaciones[0].peso_relativo);
    assert.equal(reciente.total_destinos, segunda.recomendaciones.length);
    assert.match(reciente.fecha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('responde vacío, sin distinguir, si el apellido o el teléfono no coinciden', async () => {
    const apellidoAjeno = await buscarConsultas(db, { telefono: '3109876543', apellidos: 'Díaz' });
    const telefonoSinConsultas = await buscarConsultas(db, { telefono: '3000000000', apellidos: 'Rincón' });
    assert.deepEqual(apellidoAjeno, { consultas: [] });
    assert.deepEqual(telefonoSinConsultas, { consultas: [] });
  });

  it('no devuelve las consultas anteriores a pedir los datos', async () => {
    const { consultas } = await buscarConsultas(db, { telefono: '3001234567', apellidos: 'Gómez' });
    assert.ok(consultas.length > 0);
    assert.ok(!consultas.some((c) => c.consulta_id === 1));
  });

  it('vuelve a mostrar una consulta igual a como se recomendó', async () => {
    const detalle = await detalleConsulta(db, {
      telefono: '3109876543',
      apellidos: 'Rincón Díaz',
      consulta_id: segunda.consulta_id,
    });
    assert.equal(detalle.nombres, 'Rosa');
    assert.deepEqual(detalle.respuestas, CASO_CONOCIDO);
    assert.deepEqual(detalle.recomendaciones, segunda.recomendaciones);
  });

  it('no muestra la consulta de otra persona aunque compartan teléfono', async () => {
    const ajena = await detalleConsulta(db, {
      telefono: '3109876543',
      apellidos: 'Suárez',
      consulta_id: segunda.consulta_id,
    });
    assert.equal(ajena, null);
  });

  it('valida los datos de búsqueda', async () => {
    await rechazaCon(buscarConsultas(db, { telefono: '123', apellidos: 'Rincón' }), /10 dígitos/);
    await rechazaCon(buscarConsultas(db, { telefono: '3109876543' }), /Escribe tus apellidos/);
    await rechazaCon(buscarConsultas(db, null), /teléfono y tus apellidos/);
    await rechazaCon(
      detalleConsulta(db, { telefono: '3109876543', apellidos: 'Rincón', consulta_id: '7' }),
      /número de la consulta/,
    );
  });
});

describe('API de consultas', () => {
  const evento = (ruta, cuerpo) => ({
    rawPath: ruta,
    requestContext: { http: { method: 'POST' } },
    body: JSON.stringify(cuerpo),
  });

  it('POST /consultas/buscar responde 200 con CORS del origen permitido', async () => {
    const manejador = crearManejador(db, { origenPermitido: 'https://ejemplo.vercel.app' });
    const respuesta = await manejador(
      evento('/consultas/buscar', { telefono: '3001234567', apellidos: 'Gómez' }),
    );
    assert.equal(respuesta.statusCode, 200);
    assert.equal(respuesta.headers['access-control-allow-origin'], 'https://ejemplo.vercel.app');
    assert.ok(JSON.parse(respuesta.body).consultas.length > 0);
  });

  it('POST /consultas/detalle responde 404 si los datos no son del dueño', async () => {
    const manejador = crearManejador(db, { origenPermitido: null });
    const { consultas } = await buscarConsultas(db, { telefono: '3001234567', apellidos: 'Gómez' });
    const respuesta = await manejador(
      evento('/consultas/detalle', {
        telefono: '3001234567',
        apellidos: 'Suárez',
        consulta_id: consultas[0].consulta_id,
      }),
    );
    assert.equal(respuesta.statusCode, 404);
    assert.deepEqual(JSON.parse(respuesta.body), { error: 'Consulta no encontrada' });
  });

  it('responde 400 con detalles ante un teléfono inválido', async () => {
    const manejador = crearManejador(db, { origenPermitido: null });
    const respuesta = await manejador(evento('/consultas/buscar', { telefono: 'abc', apellidos: 'Gómez' }));
    assert.equal(respuesta.statusCode, 400);
    assert.match(JSON.parse(respuesta.body).detalles.join(' '), /10 dígitos/);
  });
});

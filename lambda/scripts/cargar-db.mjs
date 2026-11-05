// Carga la base de conocimiento en Neon y verifica el caso conocido.
// Uso: DATABASE_URL=... npm run db:cargar
import { readFileSync } from 'node:fs';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta la variable DATABASE_URL.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows } = await client.query(`SELECT to_regclass('public.regla') AS tabla`);
  if (rows[0].tabla) {
    console.error('La base ya está cargada: no se ejecuta nada para no alterar los datos.');
    process.exitCode = 1;
  } else {
    for (const nombre of ['01_schema.sql', '02_conocimiento.sql', '03_inferencia.sql']) {
      await client.query(readFileSync(new URL(`../../db/${nombre}`, import.meta.url), 'utf8'));
      console.log(`Ejecutado ${nombre}`);
    }

    const conteo = await client.query(
      `SELECT (SELECT COUNT(*) FROM destino)::int AS destinos,
              (SELECT COUNT(*) FROM regla)::int AS reglas,
              (SELECT COUNT(*) FROM regla_condicion)::int AS condiciones`,
    );
    console.log('Conteo:', conteo.rows[0]);

    const top = await client.query(
      `SELECT nombre, ROUND(puntaje, 2) AS puntaje, reglas_exactas
         FROM puntaje_destino
        WHERE id_consulta = 1
        ORDER BY puntaje DESC, reglas_exactas DESC, nombre
        LIMIT 3`,
    );
    console.table(top.rows);
  }
} finally {
  await client.end();
}

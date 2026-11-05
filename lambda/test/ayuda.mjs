// Levanta un PostgreSQL real (PGlite) con los mismos scripts que se cargan en Neon.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const scripts = ['01_schema.sql', '02_conocimiento.sql', '03_inferencia.sql'];

export function leerScript(nombre) {
  return readFileSync(new URL(`../../db/${nombre}`, import.meta.url), 'utf8');
}

export async function crearBase() {
  const pg = new PGlite();
  for (const script of scripts) await pg.exec(leerScript(script));

  return {
    pg,
    query: async (texto, parametros = []) => (await pg.query(texto, parametros)).rows,
    transaction: (sentencias) =>
      pg.transaction(async (tx) => {
        for (const [texto, parametros] of sentencias) await tx.query(texto, parametros);
      }),
  };
}

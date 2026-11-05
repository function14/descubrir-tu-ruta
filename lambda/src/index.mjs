// Punto de entrada de AWS Lambda: conecta la API con Neon por HTTP.
import { neon } from '@neondatabase/serverless';
import { crearManejador } from './api.mjs';

const sql = neon(process.env.DATABASE_URL);

const db = {
  query: (texto, parametros) => sql.query(texto, parametros),
  transaction: (sentencias) =>
    sql.transaction(sentencias.map(([texto, parametros]) => sql.query(texto, parametros))),
};

export const handler = crearManejador(db, { origenPermitido: process.env.ALLOWED_ORIGIN });

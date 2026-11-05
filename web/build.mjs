// Vercel ejecuta este paso: inyecta la URL de API Gateway en la interfaz estática.
import { writeFileSync } from 'node:fs';

const url = process.env.API_URL;
if (!url) {
  console.error('Falta la variable de entorno API_URL.');
  process.exit(1);
}

writeFileSync(
  new URL('./public/config.js', import.meta.url),
  `window.API_URL = ${JSON.stringify(url.replace(/\/+$/, ''))};\n`,
);

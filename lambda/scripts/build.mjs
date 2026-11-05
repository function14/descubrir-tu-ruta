// Empaqueta la Lambda en un solo archivo: el zip no necesita node_modules.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.mjs'],
  outfile: 'dist/index.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  minify: true,
  legalComments: 'none',
});

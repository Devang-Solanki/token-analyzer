/** Emits the provider ids for the pre-render route list, read from the registry. */
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const out = await build({
  entryPoints: ['src/providers/index.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
  alias: { '@': './src' }, logLevel: 'silent',
});
const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64')
);
writeFileSync('dist/prerender-providers.json', JSON.stringify(mod.PROVIDERS.map((p) => p.id)));
console.log('prerender: providers', mod.PROVIDERS.map((p) => p.id).join(', '));

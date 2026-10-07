// Compiles every SkSL shader with CanvasKit (wasm) to catch syntax errors early.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm');
const src = readFileSync(new URL('../src/components/shaders.ts', import.meta.url), 'utf8');
const shaders = [...src.matchAll(/export const (\w+) = `([\s\S]*?)`;/g)];
const CK = await CanvasKitInit();
let ok = true;
for (const [, name, code] of shaders) {
  let err = '';
  const effect = CK.RuntimeEffect.Make(code, e => (err = e));
  console.log(effect ? `OK   ${name}` : `FAIL ${name}: ${err}`);
  if (!effect) ok = false;
}
process.exit(ok ? 0 : 1);

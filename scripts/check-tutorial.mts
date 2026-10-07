// Verifies every tutorial demo frame lights exactly the crystals it claims to.
// Run with: node scripts/check-tutorial.mts
import { parseLevel, trace } from '../src/game/engine.ts';
import { LEVELS } from '../src/game/levels.ts';
import { CONCEPTS, framePieces, LEVEL_INTROS } from '../src/tutorial/concepts.ts';

let ok = true;
for (const c of Object.values(CONCEPTS)) {
  const level = parseLevel(
    { name: c.id, hint: '', map: c.demo.map, emitters: c.demo.emitters, inventory: { mirror: 0, splitter: 0 } },
    0,
  );
  const lit = c.demo.frames.map(f => trace(level, framePieces(f)).lit.size);
  const pass = lit.every((n, i) => n === c.demo.expectLit[i]);
  if (!pass) ok = false;
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${c.id.padEnd(9)} lit per frame ${JSON.stringify(lit)} expected ${JSON.stringify(c.demo.expectLit)}`);
}
for (const name of Object.keys(LEVEL_INTROS)) {
  if (!LEVELS.some(l => l.name === name)) {
    ok = false;
    console.log(`FAIL intro mapped to unknown level "${name}"`);
  }
}
process.exit(ok ? 0 : 1);

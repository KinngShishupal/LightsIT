import {
  parseLevel,
  reflect,
  trace,
  key,
  type PieceMap,
} from '../src/game/engine';
import { LEVELS } from '../src/game/levels';
import { SOLUTIONS } from '../src/game/solutions';

describe('reflect', () => {
  it('bounces off "/" mirrors', () => {
    expect(reflect(0, 0)).toBe(3); // right -> up
    expect(reflect(1, 0)).toBe(2); // down -> left
  });
  it('bounces off "\\" mirrors', () => {
    expect(reflect(0, 1)).toBe(1); // right -> down
    expect(reflect(3, 1)).toBe(2); // up -> left
  });
});

describe('levels', () => {
  LEVELS.forEach((def, i) => {
    const level = parseLevel(def, i);
    const sol = SOLUTIONS[i];

    it(`${i + 1}. ${def.name} starts unsolved`, () => {
      expect(trace(level, level.initialPieces).solved).toBe(false);
    });

    it(`${i + 1}. ${def.name} is solved by its stored solution`, () => {
      const pieces: PieceMap = { ...level.initialPieces };
      for (const k in sol.pivots) {
        pieces[k] = { ...pieces[k], orient: sol.pivots[k] };
      }
      for (const p of sol.placements) {
        pieces[key(p.x, p.y)] = {
          kind: p.kind,
          orient: p.orient,
          lock: 'none',
        };
      }
      expect(trace(level, pieces).solved).toBe(true);
      expect(
        sol.placements.filter(p => p.kind === 'mirror').length,
      ).toBeLessThanOrEqual(def.inventory.mirror);
      expect(
        sol.placements.filter(p => p.kind === 'splitter').length,
      ).toBeLessThanOrEqual(def.inventory.splitter);
    });
  });
});

describe('trace', () => {
  it('stops looping beams', () => {
    const level = parseLevel(
      {
        name: 'loop',
        hint: '',
        map: ['....', '....', '....', 'c...'],
        emitters: [{ x: 0, y: 0, dir: 0, color: 'cyan' }],
        inventory: { mirror: 4, splitter: 0 },
      },
      0,
    );
    // A closed square of mirrors with a splitter feeding it.
    const pieces: PieceMap = {
      '2,0': { kind: 'splitter', orient: 1, lock: 'none' },
      '2,2': { kind: 'mirror', orient: 0, lock: 'none' },
      '1,2': { kind: 'mirror', orient: 1, lock: 'none' },
      '1,1': { kind: 'mirror', orient: 0, lock: 'none' },
    };
    expect(() => trace(level, pieces)).not.toThrow();
  });
});

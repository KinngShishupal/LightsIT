// Tutorial content: one card per game concept, each with a tiny animated demo
// board. Pure data (no React Native imports) so demos can be verified in Node.
import type {
  Emitter,
  Lock,
  Orient,
  PieceKind,
  PieceMap,
} from '../game/engine';

export type ConceptId =
  | 'basics'
  | 'mirror'
  | 'walls'
  | 'pivot'
  | 'move'
  | 'splitter'
  | 'void'
  | 'steel'
  | 'color'
  | 'twin'
  | 'portal';

export interface Concept {
  id: ConceptId;
  tag: string;
  title: string;
  body: string;
  demo: {
    map: string[];
    emitters: Emitter[];
    /** Piece codes per frame: m=mirror s=splitter p=pivot f=steel, then 0 '/' or 1 '\' */
    frames: Record<string, string>[];
    /** Crystals expected lit in each frame (verified by scripts/check-tutorial.mts) */
    expectLit: number[];
    ms?: number;
  };
}

const KIND: Record<string, [PieceKind, Lock]> = {
  m: ['mirror', 'none'],
  s: ['splitter', 'none'],
  p: ['mirror', 'pivot'],
  f: ['mirror', 'fixed'],
};

export function framePieces(frame: Record<string, string>): PieceMap {
  const out: PieceMap = {};
  for (const k in frame) {
    const [kind, lock] = KIND[frame[k][0]];
    out[k] = { kind, lock, orient: Number(frame[k][1]) as Orient };
  }
  return out;
}

const cyanRight = (y: number): Emitter => ({ x: 0, y, dir: 0, color: 'cyan' });

export const CONCEPTS: Record<ConceptId, Concept> = {
  basics: {
    id: 'basics',
    tag: 'WELCOME',
    title: 'Wake the crystals',
    body: 'Your emitter fires a laser in a straight line. Bend the beam so it reaches every crystal on the board to clear the level.',
    demo: {
      map: ['..c..', '.....', '.....'],
      emitters: [cyanRight(2)],
      frames: [{}, { '2,2': 'm0' }],
      expectLit: [0, 1],
    },
  },
  mirror: {
    id: 'mirror',
    tag: 'NEW PIECE',
    title: 'Mirrors',
    body: 'Tap an empty tile to place a mirror. Tap the mirror again to rotate it. Each mirror turns the beam 90°.',
    demo: {
      map: ['..c..', '.....', '.....'],
      emitters: [cyanRight(2)],
      frames: [{ '2,2': 'm1' }, { '2,2': 'm0' }],
      expectLit: [0, 1],
    },
  },
  walls: {
    id: 'walls',
    tag: 'NEW TILE',
    title: 'Walls',
    body: 'Walls swallow light. When the direct path is blocked, chain mirrors to steer around them.',
    demo: {
      map: ['....c', '..#..', '.....'],
      emitters: [cyanRight(1)],
      frames: [{}, { '1,1': 'm1', '1,2': 'm1', '4,2': 'm0' }],
      expectLit: [0, 1],
    },
  },
  pivot: {
    id: 'pivot',
    tag: 'NEW PIECE',
    title: 'Pivot mirrors',
    body: 'Mirrors with a dashed ring are bolted down. You can’t move them, but a tap still rotates them.',
    demo: {
      map: ['..c..', '.....', '.....'],
      emitters: [cyanRight(2)],
      frames: [{ '2,2': 'p1' }, { '2,2': 'p0' }],
      expectLit: [0, 1],
    },
  },
  move: {
    id: 'move',
    tag: 'TECHNIQUE',
    title: 'Move & recycle',
    body: 'Drag a mirror to slide it to another tile, and watch the beam follow live. Long-press it, or drag it off the board, to return it to your tray.',
    demo: {
      map: ['..c..', '.....', '.....'],
      emitters: [cyanRight(2)],
      frames: [{ '1,2': 'm0' }, { '2,2': 'm0' }, {}],
      expectLit: [0, 1, 0],
    },
  },
  splitter: {
    id: 'splitter',
    tag: 'NEW PIECE',
    title: 'Splitters',
    body: 'Glass splitters let half the light pass straight through and reflect the other half. One beam, two paths.',
    demo: {
      map: ['..c..', '.....', '....c'],
      emitters: [cyanRight(2)],
      frames: [{ '2,2': 'm0' }, { '2,2': 's0' }],
      expectLit: [1, 2],
    },
  },
  void: {
    id: 'void',
    tag: 'NEW TILE',
    title: 'The void',
    body: 'Striped tiles are empty space. Light crosses them freely, but nothing can be built there.',
    demo: {
      map: ['.~~~c', '.~~~.', '.~~~.'],
      emitters: [cyanRight(2)],
      frames: [{}, { '4,2': 'm0' }],
      expectLit: [0, 1],
    },
  },
  steel: {
    id: 'steel',
    tag: 'NEW PIECE',
    title: 'Steel mirrors',
    body: 'Dark steel mirrors with bolts are fixed: no moving, no rotating. Plan your path around them.',
    demo: {
      map: ['c....', '.....', '.....'],
      emitters: [cyanRight(2)],
      frames: [{ '2,2': 'f0' }, { '2,2': 'f0', '2,0': 'm1' }],
      expectLit: [0, 1],
    },
  },
  color: {
    id: 'color',
    tag: 'NEW TILE',
    title: 'Colour filters',
    body: 'A crystal only wakes for light of its own colour. Send the beam through a filter to repaint it.',
    demo: {
      map: ['.m...', '.....', '..M..'],
      emitters: [cyanRight(2)],
      frames: [{ '1,2': 'm0' }, { '3,2': 'm0', '3,0': 'm1' }],
      expectLit: [0, 1],
    },
  },
  twin: {
    id: 'twin',
    tag: 'MECHANIC',
    title: 'Crossing beams',
    body: 'Some levels have more than one emitter. Beams pass straight through each other, and mirrors reflect any colour.',
    demo: {
      map: ['...a.', '....c', '.....'],
      emitters: [cyanRight(1), { x: 3, y: 2, dir: 3, color: 'amber' }],
      frames: [{}],
      expectLit: [2],
    },
  },
  portal: {
    id: 'portal',
    tag: 'NEW TILE',
    title: 'Portals',
    body: 'Light that enters a portal leaves through its twin, still travelling in the same direction.',
    demo: {
      map: ['...#c', '..1#1', '.....'],
      emitters: [cyanRight(2)],
      frames: [{}, { '2,2': 'm0' }],
      expectLit: [0, 1],
    },
  },
};

/** Which concepts a level introduces, keyed by level name. */
export const LEVEL_INTROS: Record<string, ConceptId[]> = {
  'First Light': ['basics', 'mirror'],
  Detour: ['walls'],
  'Pivot Point': ['pivot'],
  Serpentine: ['move'],
  'Split Decision': ['splitter'],
  'Dead Zone': ['void'],
  Lattice: ['steel'],
  Spectrum: ['color'],
  'Twin Suns': ['twin'],
  Wormhole: ['portal'],
};

export const HOW_TO_PLAY: ConceptId[] = ['basics', 'mirror', 'move'];

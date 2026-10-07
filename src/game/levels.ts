import type { LevelDef } from './engine';

/*
 Map legend
   .  empty floor (buildable)        #  wall (absorbs light)
   ~  void (light passes, no build)  E  emitter position (see `emitters`)
   c m a   cyan / magenta / amber crystal (target)
   C M A   cyan / magenta / amber filter (recolours the beam)
   1-9     portal pairs
   / \     fixed mirror               p q   pivot mirror (rotate only)
   S Z     fixed splitter
 Directions: 0 right, 1 down, 2 left, 3 up

 After editing, run `node scripts/solve-levels.mts` to verify solvability
 and regenerate par scores + hints.
*/

export interface Chapter {
  title: string;
  subtitle: string;
  levels: LevelDef[];
}

export const CHAPTERS: Chapter[] = [
  {
    title: 'Reflection',
    subtitle: 'Bend the beam',
    levels: [
      {
        name: 'First Light',
        hint: 'Tap an empty tile to place a mirror. Tap it again to rotate.',
        map: [
          '.......',
          '.......',
          '....c..',
          '.......',
          '.......',
          'E......',
          '.......',
          '.......',
          '.......',
        ],
        emitters: [{ x: 0, y: 5, dir: 0, color: 'cyan' }],
        inventory: { mirror: 1, splitter: 0 },
      },
      {
        name: 'Detour',
        hint: 'Walls swallow light. Go around.',
        map: [
          '.......',
          '.....c.',
          '.......',
          '...#...',
          'E..#...',
          '...#...',
          '.......',
          '.......',
          '.......',
        ],
        emitters: [{ x: 0, y: 4, dir: 0, color: 'cyan' }],
        inventory: { mirror: 2, splitter: 0 },
      },
      {
        name: 'Pivot Point',
        hint: 'Ringed mirrors are bolted down, but you can still rotate them.',
        map: [
          'E..p...',
          '.......',
          '.......',
          '.......',
          '...p..p',
          '.......',
          '.......',
          '.......',
          '......c',
        ],
        emitters: [{ x: 0, y: 0, dir: 0, color: 'cyan' }],
        inventory: { mirror: 0, splitter: 0 },
      },
      {
        name: 'Serpentine',
        hint: 'Drag a placed mirror to move it. Long-press to pick it up.',
        map: [
          'c......',
          '####...',
          '.......',
          '...####',
          '.......',
          '####...',
          '.......',
          '.......',
          '......E',
        ],
        emitters: [{ x: 6, y: 8, dir: 3, color: 'cyan' }],
        inventory: { mirror: 5, splitter: 0 },
      },
    ],
  },
  {
    title: 'Division',
    subtitle: 'One beam, many paths',
    levels: [
      {
        name: 'Split Decision',
        hint: 'Splitters let half the light through and reflect the rest.',
        map: [
          '.......',
          '...c...',
          '.......',
          '.......',
          'E......',
          '.......',
          '.......',
          '.....c.',
          '.......',
        ],
        emitters: [{ x: 0, y: 4, dir: 0, color: 'cyan' }],
        inventory: { mirror: 1, splitter: 1 },
      },
      {
        name: 'Trident',
        hint: 'Three crystals, one source.',
        map: [
          '.c.c.c.',
          '..#.#..',
          '.......',
          '.......',
          '.......',
          '.......',
          '.......',
          '.......',
          '...E...',
        ],
        emitters: [{ x: 3, y: 8, dir: 3, color: 'cyan' }],
        inventory: { mirror: 2, splitter: 2 },
      },
      {
        name: 'Dead Zone',
        hint: 'Light crosses the void, but nothing can be built there.',
        map: [
          'c......',
          '~~~~~~.',
          '~~~~~~.',
          '~~~c~~.',
          '~~~~~~.',
          '~~~~~~.',
          'E......',
          '~~#~~#~',
          '~~~~~~~',
        ],
        emitters: [{ x: 0, y: 6, dir: 0, color: 'cyan' }],
        inventory: { mirror: 2, splitter: 1 },
      },
      {
        name: 'Lattice',
        hint: 'Steel mirrors never move. Make them work for you.',
        map: [
          'a.....a',
          '.#...#.',
          '.......',
          '.#\\.\\#.',
          '...p...',
          '.#/./#.',
          '.......',
          '.#...#.',
          '...E...',
        ],
        emitters: [{ x: 3, y: 8, dir: 3, color: 'amber' }],
        inventory: { mirror: 2, splitter: 1 },
      },
    ],
  },
  {
    title: 'Spectrum',
    subtitle: 'Colour is a key',
    levels: [
      {
        name: 'Spectrum',
        hint: 'Crystals only accept their own colour. Filters repaint the beam.',
        map: [
          '.......',
          '.m.....',
          '.......',
          '.....M.',
          '.......',
          '.......',
          '.......',
          'E......',
          '.......',
        ],
        emitters: [{ x: 0, y: 7, dir: 0, color: 'cyan' }],
        inventory: { mirror: 2, splitter: 0 },
      },
      {
        name: 'Twin Suns',
        hint: 'Beams pass through each other. Mirrors don’t care about colour.',
        map: [
          '.....c.',
          'E......',
          '.......',
          '.......',
          '.#...#.',
          '.......',
          '.......',
          '......E',
          '.a.....',
        ],
        emitters: [
          { x: 0, y: 1, dir: 0, color: 'amber' },
          { x: 6, y: 7, dir: 2, color: 'cyan' },
        ],
        inventory: { mirror: 4, splitter: 0 },
      },
      {
        name: 'Prism Garden',
        hint: 'Split first, paint later.',
        map: [
          '.....a.',
          '.......',
          '...A...',
          '.......',
          'E.....c',
          '.......',
          '..M....',
          '.......',
          '..m....',
        ],
        emitters: [{ x: 0, y: 4, dir: 0, color: 'cyan' }],
        inventory: { mirror: 1, splitter: 2 },
      },
    ],
  },
  {
    title: 'Warp',
    subtitle: 'Space is optional',
    levels: [
      {
        name: 'Wormhole',
        hint: 'Light keeps its direction when it leaves a portal.',
        map: [
          '..#c#..',
          '..#1#..',
          '.......',
          '.......',
          '......E',
          '.......',
          '1......',
          '.......',
          '.......',
        ],
        emitters: [{ x: 6, y: 4, dir: 1, color: 'cyan' }],
        inventory: { mirror: 2, splitter: 0 },
      },
      {
        name: 'Event Horizon',
        hint: 'Enter each portal from the right side.',
        map: [
          '..#c#..',
          '..#1#..',
          '..###..',
          '.......',
          '...M...',
          '.1.....',
          '..###2.',
          '..#2#..',
          'E.#m#..',
        ],
        emitters: [{ x: 0, y: 8, dir: 3, color: 'cyan' }],
        inventory: { mirror: 3, splitter: 1 },
      },
      {
        name: 'Supernova',
        hint: 'One amber sun. Three colours. Don’t break what already shines.',
        map: [
          'm..a..c',
          '.#~~~~.',
          '..~~~~1',
          '##~~~~.',
          '#......',
          '1M...C.',
          '.......',
          '.......',
          '...E...',
        ],
        emitters: [{ x: 3, y: 8, dir: 3, color: 'amber' }],
        inventory: { mirror: 3, splitter: 2 },
      },
    ],
  },
];

export const LEVELS: LevelDef[] = CHAPTERS.flatMap(c => c.levels);

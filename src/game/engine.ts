// Pure game logic: level parsing, beam tracing and a small solver.
// No React / React Native imports so it can also run under plain Node.

export type Dir = 0 | 1 | 2 | 3; // right, down, left, up
export const DX = [1, 0, -1, 0];
export const DY = [0, 1, 0, -1];

export type BeamColor = 'cyan' | 'magenta' | 'amber';
export type PieceKind = 'mirror' | 'splitter';
export type Orient = 0 | 1; // 0 = '/', 1 = '\'
export type Lock = 'none' | 'pivot' | 'fixed';

export type Tile =
  | { t: 'empty' }
  | { t: 'wall' }
  | { t: 'void' } // beam passes, nothing can be built
  | { t: 'target'; color: BeamColor }
  | { t: 'filter'; color: BeamColor }
  | { t: 'portal'; id: number };

export interface Piece {
  kind: PieceKind;
  orient: Orient;
  lock: Lock;
}

export interface Emitter {
  x: number;
  y: number;
  dir: Dir;
  color: BeamColor;
}

export interface Inventory {
  mirror: number;
  splitter: number;
}

export interface LevelDef {
  name: string;
  hint: string;
  map: string[];
  emitters: Emitter[];
  inventory: Inventory;
}

export interface Level {
  index: number;
  name: string;
  hint: string;
  cols: number;
  rows: number;
  tiles: Tile[][]; // [y][x]
  emitters: Emitter[];
  inventory: Inventory;
  initialPieces: PieceMap;
  targets: { x: number; y: number; color: BeamColor }[];
  portals: Record<number, { x: number; y: number }[]>;
}

export type PieceMap = Record<string, Piece>;

export const key = (x: number, y: number) => `${x},${y}`;
export const unkey = (k: string) => {
  const [x, y] = k.split(',').map(Number);
  return { x, y };
};

const TARGET_CHARS: Record<string, BeamColor> = {
  c: 'cyan',
  m: 'magenta',
  a: 'amber',
};
const FILTER_CHARS: Record<string, BeamColor> = {
  C: 'cyan',
  M: 'magenta',
  A: 'amber',
};
// Pre-placed pieces: fixed ones can't be touched, pivots can only be rotated.
const PIECE_CHARS: Record<string, Piece> = {
  '/': { kind: 'mirror', orient: 0, lock: 'fixed' },
  '\\': { kind: 'mirror', orient: 1, lock: 'fixed' },
  p: { kind: 'mirror', orient: 0, lock: 'pivot' },
  q: { kind: 'mirror', orient: 1, lock: 'pivot' },
  S: { kind: 'splitter', orient: 0, lock: 'fixed' },
  Z: { kind: 'splitter', orient: 1, lock: 'fixed' },
};

export function parseLevel(def: LevelDef, index: number): Level {
  const rows = def.map.length;
  const cols = def.map[0].length;
  const tiles: Tile[][] = [];
  const initialPieces: PieceMap = {};
  const targets: Level['targets'] = [];
  const portals: Level['portals'] = {};
  def.map.forEach((line, y) => {
    if (line.length !== cols) {
      throw new Error(`Level ${def.name}: row ${y} has wrong width`);
    }
    const row: Tile[] = [];
    [...line].forEach((ch, x) => {
      if (ch === '#') row.push({ t: 'wall' });
      else if (ch === '~') row.push({ t: 'void' });
      else if (TARGET_CHARS[ch]) {
        row.push({ t: 'target', color: TARGET_CHARS[ch] });
        targets.push({ x, y, color: TARGET_CHARS[ch] });
      } else if (FILTER_CHARS[ch]) {
        row.push({ t: 'filter', color: FILTER_CHARS[ch] });
      } else if (ch >= '1' && ch <= '9') {
        const id = Number(ch);
        row.push({ t: 'portal', id });
        (portals[id] ??= []).push({ x, y });
      } else {
        row.push({ t: 'empty' });
        if (PIECE_CHARS[ch]) initialPieces[key(x, y)] = { ...PIECE_CHARS[ch] };
      }
    });
    tiles.push(row);
  });
  for (const id in portals) {
    if (portals[id].length !== 2) {
      throw new Error(`Level ${def.name}: portal ${id} needs exactly 2 ends`);
    }
  }
  return {
    index,
    name: def.name,
    hint: def.hint,
    cols,
    rows,
    tiles,
    emitters: def.emitters,
    inventory: def.inventory,
    initialPieces,
    targets,
    portals,
  };
}

export function reflect(d: Dir, o: Orient): Dir {
  return (o === 0 ? [3, 2, 1, 0] : [1, 0, 3, 2])[d] as Dir;
}

export interface Point {
  x: number;
  y: number;
}

export interface Beam {
  color: BeamColor;
  points: Point[]; // in grid units, cell centers are at +0.5
}

export interface Spark {
  x: number;
  y: number;
  color: BeamColor;
  kind: 'block' | 'reject';
}

export interface TraceResult {
  beams: Beam[];
  lit: Set<string>;
  sparks: Spark[];
  // Every cell a beam passes through (useful for the solver)
  visited: Set<string>;
  solved: boolean;
}

export function isEmitterCell(level: Level, x: number, y: number) {
  return level.emitters.some(e => e.x === x && e.y === y);
}

export function canBuild(level: Level, pieces: PieceMap, x: number, y: number) {
  if (x < 0 || y < 0 || x >= level.cols || y >= level.rows) return false;
  if (level.tiles[y][x].t !== 'empty') return false;
  if (isEmitterCell(level, x, y)) return false;
  return !pieces[key(x, y)];
}

interface Ray {
  x: number;
  y: number;
  dir: Dir;
  color: BeamColor;
  // The ray starts from the center of (x, y) unless an explicit start is given.
}

const MAX_STEPS = 4000;

export function trace(level: Level, pieces: PieceMap): TraceResult {
  const beams: Beam[] = [];
  const lit = new Set<string>();
  const sparks: Spark[] = [];
  const visited = new Set<string>();
  const seen = new Set<string>();
  const queue: Ray[] = level.emitters.map(e => ({ ...e }));
  let steps = 0;

  while (queue.length && steps < MAX_STEPS) {
    const ray = queue.shift()!;
    let { x, y, dir, color } = ray;
    const points: Point[] = [{ x: x + 0.5, y: y + 0.5 }];
    const finish = (px: number, py: number) => {
      points.push({ x: px, y: py });
      beams.push({ color, points });
    };

    while (steps++ < MAX_STEPS) {
      const nx = x + DX[dir];
      const ny = y + DY[dir];
      // Leaving the board
      if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) {
        finish(x + 0.5 + DX[dir] * 0.5, y + 0.5 + DY[dir] * 0.5);
        break;
      }
      x = nx;
      y = ny;
      const cx = x + 0.5;
      const cy = y + 0.5;
      const state = `${x},${y},${dir},${color}`;
      if (seen.has(state)) {
        finish(cx, cy);
        break;
      }
      seen.add(state);
      visited.add(key(x, y));

      const tile = level.tiles[y][x];
      if (tile.t === 'wall' || isEmitterCell(level, x, y)) {
        const fx = cx - DX[dir] * 0.5;
        const fy = cy - DY[dir] * 0.5;
        finish(fx, fy);
        sparks.push({ x: fx, y: fy, color, kind: 'block' });
        break;
      }
      if (tile.t === 'target') {
        finish(cx, cy);
        if (tile.color === color) lit.add(key(x, y));
        else sparks.push({ x: cx, y: cy, color, kind: 'reject' });
        break;
      }
      if (tile.t === 'filter') {
        if (tile.color !== color) {
          finish(cx, cy);
          queue.push({ x, y, dir, color: tile.color });
          break;
        }
        continue;
      }
      if (tile.t === 'portal') {
        const other = level.portals[tile.id].find(p => p.x !== x || p.y !== y)!;
        finish(cx, cy);
        if (!seen.has(`warp,${other.x},${other.y},${dir},${color}`)) {
          seen.add(`warp,${other.x},${other.y},${dir},${color}`);
          queue.push({ x: other.x, y: other.y, dir, color });
        }
        break;
      }
      const piece = pieces[key(x, y)];
      if (piece) {
        if (piece.kind === 'mirror') {
          points.push({ x: cx, y: cy });
          dir = reflect(dir, piece.orient);
          continue;
        }
        // Splitter: half passes straight through, half reflects.
        finish(cx, cy);
        queue.push({ x, y, dir, color });
        queue.push({ x, y, dir: reflect(dir, piece.orient), color });
        break;
      }
    }
  }

  const solved =
    level.targets.length > 0 &&
    level.targets.every(t => lit.has(key(t.x, t.y)));
  return { beams, lit, sparks, visited, solved };
}

export interface Placement {
  x: number;
  y: number;
  kind: PieceKind;
  orient: Orient;
}

export interface Solution {
  placements: Placement[];
  pivots: Record<string, Orient>;
}

/**
 * Finds a solution using the fewest player pieces (iterative deepening).
 * Only cells the beam currently crosses are worth trying, which keeps the
 * search tiny for hand-made puzzles.
 */
export function solve(level: Level, maxNodes = 2_000_000): Solution | null {
  const pivotKeys = Object.keys(level.initialPieces).filter(
    k => level.initialPieces[k].lock === 'pivot',
  );
  const total = level.inventory.mirror + level.inventory.splitter;
  let nodes = 0;

  for (let depth = 0; depth <= total; depth++) {
    for (let mask = 0; mask < 1 << pivotKeys.length; mask++) {
      const base: PieceMap = { ...level.initialPieces };
      const pivots: Record<string, Orient> = {};
      pivotKeys.forEach((k, i) => {
        const orient = ((mask >> i) & 1) as Orient;
        base[k] = { ...base[k], orient };
        pivots[k] = orient;
      });
      const seenConfigs = new Set<string>();
      const placed: Placement[] = [];

      const dfs = (pieces: PieceMap, inv: Inventory, left: number): boolean => {
        if (nodes > maxNodes) return false;
        const result = trace(level, pieces);
        if (result.solved) return true;
        if (left === 0) return false;
        for (const cell of result.visited) {
          const { x, y } = unkey(cell);
          if (!canBuild(level, pieces, x, y)) continue;
          for (const kind of ['mirror', 'splitter'] as PieceKind[]) {
            if (inv[kind] === 0) continue;
            for (const orient of [0, 1] as Orient[]) {
              const next = {
                ...pieces,
                [cell]: { kind, orient, lock: 'none' as Lock },
              };
              const sig = Object.keys(next)
                .sort()
                .map(k => `${k}${next[k].kind[0]}${next[k].orient}`)
                .join('|');
              if (seenConfigs.has(sig)) continue;
              seenConfigs.add(sig);
              nodes++;
              placed.push({ x, y, kind, orient });
              if (dfs(next, { ...inv, [kind]: inv[kind] - 1 }, left - 1))
                return true;
              placed.pop();
            }
          }
        }
        return false;
      };

      if (dfs(base, { ...level.inventory }, depth)) {
        return { placements: [...placed], pivots };
      }
      if (nodes > maxNodes) return null;
    }
  }
  return null;
}

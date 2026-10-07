import {
  BlurMask,
  Canvas,
  Group,
  Path,
  RoundedRect,
  useClock,
} from '@shopify/react-native-skia';
import React, { useRef } from 'react';
import { type GestureResponderEvent, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import {
  key,
  type Level,
  type PieceMap,
  type Placement,
  type TraceResult,
} from '../game/engine';
import { C } from '../theme';
import {
  Beams,
  CellMark,
  Crystal,
  EmitterArt,
  FilterArt,
  FloorLayer,
  HintGhost,
  PieceArt,
  PortalArt,
  Sparks,
} from './boardArt';

export interface Cell {
  x: number;
  y: number;
}

interface Props {
  level: Level;
  pieces: PieceMap;
  result: TraceResult;
  cell: number;
  hint: (Placement & { rotate?: boolean }) | null;
  dragFrom: string | null;
  invalidCell: Cell | null;
  win: SharedValue<number>;
  energy: SharedValue<number>;
  canDrag: (c: Cell) => boolean;
  onTap: (c: Cell) => void;
  onLongPress: (c: Cell) => void;
  onDragStart: (c: Cell) => void;
  onDragMove: (c: Cell) => void;
  onDragEnd: (c: Cell) => void;
  onDragCancel: () => void;
}

const LONG_PRESS_MS = 420;

export function Board(props: Props) {
  const {
    level,
    pieces,
    result,
    cell,
    hint,
    dragFrom,
    invalidCell,
    win,
    energy,
  } = props;
  const clock = useClock();
  const pad = Math.round(cell * 0.35);
  const bw = level.cols * cell;
  const bh = level.rows * cell;

  // --- gestures -------------------------------------------------------
  const g = useRef({
    origin: { x: 0, y: 0 },
    start: null as Cell | null,
    last: null as Cell | null,
    dragging: false,
    moved: false,
    longFired: false,
    timer: null as ReturnType<typeof setTimeout> | null,
  }).current;

  const cellAt = (e: GestureResponderEvent): Cell => ({
    x: Math.floor((e.nativeEvent.pageX - g.origin.x - pad) / cell),
    y: Math.floor((e.nativeEvent.pageY - g.origin.y - pad) / cell),
  });
  const inside = (c: Cell) =>
    c.x >= 0 && c.y >= 0 && c.x < level.cols && c.y < level.rows;
  const clearTimer = () => {
    if (g.timer) clearTimeout(g.timer);
    g.timer = null;
  };

  const onGrant = (e: GestureResponderEvent) => {
    const { pageX, pageY, locationX, locationY } = e.nativeEvent;
    g.origin = { x: pageX - locationX, y: pageY - locationY };
    const c = cellAt(e);
    g.start = inside(c) ? c : null;
    g.last = g.start;
    g.dragging = false;
    g.moved = false;
    g.longFired = false;
    clearTimer();
    if (g.start) {
      const s = g.start;
      g.timer = setTimeout(() => {
        if (!g.moved && !g.dragging) {
          g.longFired = true;
          props.onLongPress(s);
        }
      }, LONG_PRESS_MS);
    }
  };

  const onMove = (e: GestureResponderEvent) => {
    if (!g.start || g.longFired) return;
    const c = cellAt(e);
    const changed = !g.last || c.x !== g.last.x || c.y !== g.last.y;
    if (!changed) return;
    g.last = c;
    if (!g.dragging) {
      g.moved = true;
      clearTimer();
      if (props.canDrag(g.start)) {
        g.dragging = true;
        props.onDragStart(g.start);
      } else return;
    }
    props.onDragMove(c);
  };

  const onRelease = (e: GestureResponderEvent) => {
    clearTimer();
    if (!g.start) return;
    if (g.dragging) props.onDragEnd(cellAt(e));
    else if (!g.moved && !g.longFired) props.onTap(g.start);
    g.start = null;
    g.dragging = false;
  };

  const onTerminate = () => {
    clearTimer();
    if (g.dragging) props.onDragCancel();
    g.start = null;
    g.dragging = false;
  };

  // --- static decorations ----------------------------------------------
  const corner = cell * 0.5;
  const fw = bw + 12;
  const fh = bh + 12;
  const brackets =
    `M0 ${corner} L0 0 L${corner} 0 ` +
    `M${fw - corner} 0 L${fw} 0 L${fw} ${corner} ` +
    `M${fw} ${fh - corner} L${fw} ${fh} L${fw - corner} ${fh} ` +
    `M${corner} ${fh} L0 ${fh} L0 ${fh - corner}`;

  const tiles: React.ReactNode[] = [];
  level.tiles.forEach((row, y) =>
    row.forEach((t, x) => {
      if (t.t === 'filter') {
        tiles.push(
          <FilterArt
            key={`F${x},${y}`}
            x={x}
            y={y}
            color={t.color}
            cell={cell}
            clock={clock}
          />,
        );
      } else if (t.t === 'portal') {
        tiles.push(
          <PortalArt
            key={`P${x},${y}`}
            x={x}
            y={y}
            id={t.id}
            cell={cell}
            clock={clock}
          />,
        );
      }
    }),
  );

  return (
    <View
      style={{ width: bw + pad * 2, height: bh + pad * 2 }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onRelease}
      onResponderTerminate={onTerminate}
    >
      <Canvas style={{ flex: 1, pointerEvents: 'none' }}>
        <Group transform={[{ translateX: pad }, { translateY: pad }]}>
          <RoundedRect
            x={-6}
            y={-6}
            width={bw + 12}
            height={bh + 12}
            r={cell * 0.28}
            color="rgba(8, 11, 30, 0.78)"
          />
          <RoundedRect
            x={-6}
            y={-6}
            width={bw + 12}
            height={bh + 12}
            r={cell * 0.28}
            style="stroke"
            strokeWidth={1}
            color={C.border}
          />
          <Group transform={[{ translateX: -6 }, { translateY: -6 }]}>
            <Path
              path={brackets}
              style="stroke"
              strokeWidth={2}
              strokeCap="round"
              color="rgba(120, 220, 255, 0.55)"
            >
              <BlurMask blur={1.5} style="solid" />
            </Path>
          </Group>

          <FloorLayer level={level} cell={cell} />
          {tiles}

          <Beams
            beams={result.beams}
            cell={cell}
            clock={clock}
            energy={energy}
          />

          {Object.entries(pieces).map(([k, piece]) => {
            const [x, y] = k.split(',').map(Number);
            return (
              <PieceArt
                key={k}
                x={x}
                y={y}
                piece={piece}
                cell={cell}
                clock={clock}
              />
            );
          })}

          {level.targets.map(t => (
            <Crystal
              key={`T${t.x},${t.y}`}
              x={t.x}
              y={t.y}
              color={t.color}
              lit={result.lit.has(key(t.x, t.y))}
              cell={cell}
              clock={clock}
              win={win}
            />
          ))}

          {level.emitters.map(e => (
            <EmitterArt
              key={`E${e.x},${e.y}`}
              emitter={e}
              cell={cell}
              clock={clock}
            />
          ))}

          <Sparks sparks={result.sparks} cell={cell} clock={clock} />

          {dragFrom ? (
            <CellMark
              x={Number(dragFrom.split(',')[0])}
              y={Number(dragFrom.split(',')[1])}
              cell={cell}
              color="rgba(150, 170, 255, 0.35)"
            />
          ) : null}
          {invalidCell ? (
            <CellMark
              x={invalidCell.x}
              y={invalidCell.y}
              cell={cell}
              color={C.danger}
            />
          ) : null}
          {hint ? (
            <HintGhost
              x={hint.x}
              y={hint.y}
              kind={hint.rotate ? 'rotate' : hint.kind}
              orient={hint.orient}
              cell={cell}
              clock={clock}
            />
          ) : null}
        </Group>
      </Canvas>
    </View>
  );
}

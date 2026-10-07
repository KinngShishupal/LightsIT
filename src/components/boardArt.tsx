import {
  BlurMask,
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  RoundedRect,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type {
  Beam,
  BeamColor,
  Emitter,
  Level,
  Piece,
  PieceKind,
  Orient,
  Spark,
} from '../game/engine';
import { BEAM, C, PORTAL } from '../theme';

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

type Clock = SharedValue<number>;

/* ------------------------------------------------------------ floor ---- */

export function FloorLayer({ level, cell }: { level: Level; cell: number }) {
  const { floor, voids, walls } = useMemo(() => {
    const f: { x: number; y: number }[] = [];
    const w: { x: number; y: number }[] = [];
    let v = '';
    level.tiles.forEach((row, y) =>
      row.forEach((tile, x) => {
        if (tile.t === 'wall') w.push({ x, y });
        else if (tile.t === 'void') {
          const x0 = x * cell;
          const y0 = y * cell;
          for (const k of [0.5, 1, 1.5]) {
            const c = k * cell;
            v +=
              c <= cell
                ? `M${x0 + c} ${y0} L${x0} ${y0 + c} `
                : `M${x0 + cell} ${y0 + c - cell} L${x0 + c - cell} ${
                    y0 + cell
                  } `;
          }
        } else f.push({ x, y });
      }),
    );
    return { floor: f, voids: v, walls: w };
  }, [level, cell]);

  const inset = cell * 0.06;
  return (
    <Group>
      {floor.map(({ x, y }) => (
        <RoundedRect
          key={`f${x},${y}`}
          x={x * cell + inset}
          y={y * cell + inset}
          width={cell - inset * 2}
          height={cell - inset * 2}
          r={cell * 0.14}
          color="rgba(90, 110, 220, 0.075)"
        />
      ))}
      {voids ? (
        <Path
          path={voids}
          style="stroke"
          strokeWidth={1}
          color="rgba(120, 130, 220, 0.13)"
        />
      ) : null}
      {walls.map(({ x, y }) => (
        <Group key={`w${x},${y}`}>
          <RoundedRect
            x={x * cell + 1.5}
            y={y * cell + 1.5}
            width={cell - 3}
            height={cell - 3}
            r={cell * 0.12}
          >
            <LinearGradient
              start={vec(0, y * cell)}
              end={vec(0, (y + 1) * cell)}
              colors={['#222B5C', '#0C1029']}
            />
          </RoundedRect>
          <RoundedRect
            x={x * cell + 1.5}
            y={y * cell + 1.5}
            width={cell - 3}
            height={cell - 3}
            r={cell * 0.12}
            style="stroke"
            strokeWidth={1}
            color="rgba(150, 170, 255, 0.16)"
          />
        </Group>
      ))}
    </Group>
  );
}

/* --------------------------------------------------------- crystals ---- */

export function Crystal({
  x,
  y,
  color,
  lit,
  cell,
  clock,
  win,
}: {
  x: number;
  y: number;
  color: BeamColor;
  lit: boolean;
  cell: number;
  clock: Clock;
  win: SharedValue<number>;
}) {
  const hex = BEAM[color];
  const cx = (x + 0.5) * cell;
  const cy = (y + 0.5) * cell;
  const r = cell * 0.3;
  const litV = useSharedValue(lit ? 1 : 0);
  useEffect(() => {
    litV.value = withTiming(lit ? 1 : 0, { duration: lit ? 420 : 220 });
  }, [lit, litV]);

  const gem = `M0 ${-r} L${r * 0.8} ${-r * 0.22} L0 ${r} L${-r * 0.8} ${
    -r * 0.22
  } Z`;
  const facets =
    `M${-r * 0.8} ${-r * 0.22} L${r * 0.8} ${-r * 0.22} ` +
    `M${-r * 0.32} ${-r * 0.22} L0 ${r} L${r * 0.32} ${-r * 0.22} ` +
    `M${-r * 0.32} ${-r * 0.22} L0 ${-r} L${r * 0.32} ${-r * 0.22}`;

  const transform = useDerivedValue(() => [
    { translateX: cx },
    { translateY: cy },
    { scale: 1 + litV.value * (0.06 + 0.05 * Math.sin(clock.value / 230)) },
  ]);
  const halo = useDerivedValue(
    () => litV.value * (0.6 + 0.2 * Math.sin(clock.value / 170)),
  );
  const idle = useDerivedValue(
    () =>
      (1 - litV.value) *
      (0.25 + 0.2 * Math.sin(clock.value / 650 + x * 1.7 + y)),
  );
  const fill = useDerivedValue(() => 0.12 + litV.value * 0.88);
  const ring = useDerivedValue(() => [{ rotate: clock.value / 1500 }]);
  const ringOpacity = useDerivedValue(() => 0.18 + litV.value * 0.55);
  const shock = useDerivedValue(() => cell * (0.4 + win.value * 3.2));
  const shockOpacity = useDerivedValue(() =>
    win.value > 0 && win.value < 1 ? (1 - win.value) * 0.9 : 0,
  );

  return (
    <Group transform={transform}>
      <Circle
        cx={0}
        cy={0}
        r={shock}
        color={hex}
        style="stroke"
        strokeWidth={cell * 0.06}
        opacity={shockOpacity}
      >
        <BlurMask blur={cell * 0.06} style="normal" />
      </Circle>
      <Circle cx={0} cy={0} r={cell * 0.46} color={hex} opacity={halo}>
        <BlurMask blur={cell * 0.28} style="normal" />
      </Circle>
      <Group transform={ring}>
        <Circle
          cx={0}
          cy={0}
          r={cell * 0.43}
          style="stroke"
          strokeWidth={1.4}
          color={hex}
          opacity={ringOpacity}
        >
          <DashPathEffect intervals={[cell * 0.09, cell * 0.12]} />
        </Circle>
      </Group>
      <Path
        path={gem}
        style="stroke"
        strokeWidth={cell * 0.08}
        color={hex}
        opacity={idle}
      >
        <BlurMask blur={cell * 0.08} style="normal" />
      </Path>
      <Path path={gem} opacity={fill}>
        <LinearGradient
          start={vec(0, -r)}
          end={vec(0, r)}
          colors={['#FFFFFF', hex]}
        />
      </Path>
      <Path
        path={gem}
        style="stroke"
        strokeWidth={1.6}
        strokeJoin="round"
        color={hex}
      />
      <Path
        path={facets}
        style="stroke"
        strokeWidth={0.9}
        color="#FFFFFF"
        opacity={0.45}
      />
    </Group>
  );
}

/* ---------------------------------------------------------- emitter ---- */

export function EmitterArt({
  emitter,
  cell,
  clock,
}: {
  emitter: Emitter;
  cell: number;
  clock: Clock;
}) {
  const hex = BEAM[emitter.color];
  const s = cell;
  const transform = [
    { translateX: (emitter.x + 0.5) * s },
    { translateY: (emitter.y + 0.5) * s },
    { rotate: (emitter.dir * Math.PI) / 2 },
  ];
  const pulse = useDerivedValue(() => 0.55 + 0.3 * Math.sin(clock.value / 140));
  const core = useDerivedValue(
    () => s * (0.11 + 0.015 * Math.sin(clock.value / 90)),
  );
  return (
    <Group transform={transform}>
      <Circle cx={0} cy={0} r={s * 0.42} color={hex} opacity={0.18}>
        <BlurMask blur={s * 0.2} style="normal" />
      </Circle>
      <RoundedRect
        x={s * 0.06}
        y={-s * 0.12}
        width={s * 0.44}
        height={s * 0.24}
        r={s * 0.06}
      >
        <LinearGradient
          start={vec(0, -s * 0.12)}
          end={vec(0, s * 0.12)}
          colors={['#3A4478', '#151A38']}
        />
      </RoundedRect>
      <RoundedRect
        x={s * 0.36}
        y={-s * 0.07}
        width={s * 0.12}
        height={s * 0.14}
        r={s * 0.03}
        color={hex}
      />
      <RoundedRect
        x={-s * 0.34}
        y={-s * 0.34}
        width={s * 0.6}
        height={s * 0.68}
        r={s * 0.2}
      >
        <LinearGradient
          start={vec(0, -s * 0.34)}
          end={vec(0, s * 0.34)}
          colors={['#2A3365', '#0E1230']}
        />
      </RoundedRect>
      <RoundedRect
        x={-s * 0.34}
        y={-s * 0.34}
        width={s * 0.6}
        height={s * 0.68}
        r={s * 0.2}
        style="stroke"
        strokeWidth={1.4}
        color={rgba(hex, 0.7)}
      />
      <Circle cx={-s * 0.04} cy={0} r={s * 0.2} color={hex} opacity={pulse}>
        <BlurMask blur={s * 0.1} style="normal" />
      </Circle>
      <Circle cx={-s * 0.04} cy={0} r={core} color="#FFFFFF" />
    </Group>
  );
}

/* ----------------------------------------------------------- portal ---- */

export function PortalArt({
  x,
  y,
  id,
  cell,
  clock,
}: {
  x: number;
  y: number;
  id: number;
  cell: number;
  clock: Clock;
}) {
  const hex = PORTAL[id % PORTAL.length];
  const spin = useDerivedValue(() => [
    { translateX: (x + 0.5) * cell },
    { translateY: (y + 0.5) * cell },
    { rotate: clock.value / 520 },
  ]);
  const counter = useDerivedValue(() => [{ rotate: -clock.value / 260 }]);
  return (
    <Group transform={spin}>
      <Circle cx={0} cy={0} r={cell * 0.44} color={hex} opacity={0.28}>
        <BlurMask blur={cell * 0.16} style="normal" />
      </Circle>
      <Circle cx={0} cy={0} r={cell * 0.32}>
        <RadialGradient
          c={vec(0, 0)}
          r={cell * 0.32}
          colors={['#000000', rgba(hex, 0.45)]}
        />
      </Circle>
      <Circle
        cx={0}
        cy={0}
        r={cell * 0.36}
        style="stroke"
        strokeWidth={cell * 0.07}
      >
        <SweepGradient
          c={vec(0, 0)}
          colors={[hex, rgba(hex, 0), hex, rgba(hex, 0), hex]}
        />
      </Circle>
      <Group transform={counter}>
        <Circle
          cx={0}
          cy={0}
          r={cell * 0.2}
          style="stroke"
          strokeWidth={1.2}
          color={rgba(hex, 0.8)}
        >
          <DashPathEffect intervals={[cell * 0.05, cell * 0.07]} />
        </Circle>
      </Group>
    </Group>
  );
}

/* ----------------------------------------------------------- filter ---- */

export function FilterArt({
  x,
  y,
  color,
  cell,
  clock,
}: {
  x: number;
  y: number;
  color: BeamColor;
  cell: number;
  clock: Clock;
}) {
  const hex = BEAM[color];
  const i = cell * 0.15;
  const shimmer = useDerivedValue(
    () => 0.12 + 0.08 * Math.sin(clock.value / 400 + x + y),
  );
  const r = cell * 0.16;
  const tri = `M0 ${-r} L${r * 0.95} ${r * 0.7} L${-r * 0.95} ${r * 0.7} Z`;
  return (
    <Group>
      <RoundedRect
        x={x * cell + i}
        y={y * cell + i}
        width={cell - i * 2}
        height={cell - i * 2}
        r={cell * 0.1}
        color={hex}
        opacity={shimmer}
      />
      <RoundedRect
        x={x * cell + i}
        y={y * cell + i}
        width={cell - i * 2}
        height={cell - i * 2}
        r={cell * 0.1}
        style="stroke"
        strokeWidth={1.5}
        color={rgba(hex, 0.85)}
      />
      <Group
        transform={[
          { translateX: (x + 0.5) * cell },
          { translateY: (y + 0.5) * cell },
        ]}
      >
        <Path
          path={tri}
          style="stroke"
          strokeWidth={1.4}
          strokeJoin="round"
          color={hex}
        />
      </Group>
    </Group>
  );
}

/* ----------------------------------------------------------- pieces ---- */

const orientAngle = (o: Orient) => (o === 1 ? Math.PI / 4 : -Math.PI / 4);

function Bar({
  kind,
  lock,
  cell,
  tint,
}: {
  kind: PieceKind;
  lock: Piece['lock'];
  cell: number;
  tint?: string;
}) {
  const L = cell * 0.84;
  const T = cell * 0.13;
  if (kind === 'splitter') {
    return (
      <Group>
        <RoundedRect
          x={-L / 2}
          y={-T / 2}
          width={L}
          height={T}
          r={T / 2}
          color="#7FE7FF"
          opacity={0.28}
        >
          <BlurMask blur={cell * 0.08} style="normal" />
        </RoundedRect>
        <RoundedRect
          x={-L / 2}
          y={-T / 2}
          width={L}
          height={T}
          r={T / 2}
          color={tint ?? 'rgba(150, 235, 255, 0.22)'}
        />
        <RoundedRect
          x={-L / 2}
          y={-T / 2}
          width={L}
          height={T}
          r={T / 2}
          style="stroke"
          strokeWidth={1.4}
          color={lock === 'fixed' ? '#9AA6C4' : 'rgba(225, 250, 255, 0.95)'}
        />
        <Line
          p1={vec(-L / 2 + T, 0)}
          p2={vec(L / 2 - T, 0)}
          color="#FFFFFF"
          strokeWidth={1}
          opacity={0.75}
        >
          <DashPathEffect intervals={[3, 3]} />
        </Line>
        {lock === 'fixed' ? <Bolts L={L} T={T} /> : null}
      </Group>
    );
  }
  const colors =
    lock === 'fixed' ? ['#D5DBEA', '#5A6480'] : ['#FFFFFF', '#7FA3DA'];
  return (
    <Group>
      <RoundedRect
        x={-L / 2}
        y={-T / 2}
        width={L}
        height={T}
        r={T / 2}
        color="#BFEFFF"
        opacity={lock === 'fixed' ? 0.12 : 0.32}
      >
        <BlurMask blur={cell * 0.09} style="normal" />
      </RoundedRect>
      <RoundedRect x={-L / 2} y={-T / 2} width={L} height={T} r={T / 2}>
        <LinearGradient
          start={vec(0, -T / 2)}
          end={vec(0, T / 2)}
          colors={tint ? [tint, tint] : colors}
        />
      </RoundedRect>
      <Line
        p1={vec(-L / 2 + T * 0.7, -T * 0.18)}
        p2={vec(L / 2 - T * 0.7, -T * 0.18)}
        color="#FFFFFF"
        strokeWidth={1.2}
        strokeCap="round"
        opacity={0.95}
      />
      {lock === 'fixed' ? <Bolts L={L} T={T} /> : null}
      {lock === 'pivot' ? (
        <Circle cx={0} cy={0} r={T * 0.42} color="#0B1030" />
      ) : null}
    </Group>
  );
}

function Bolts({ L, T }: { L: number; T: number }) {
  return (
    <Group>
      <Circle cx={-L * 0.34} cy={0} r={T * 0.22} color="#262C44" />
      <Circle cx={L * 0.34} cy={0} r={T * 0.22} color="#262C44" />
    </Group>
  );
}

export function PieceArt({
  x,
  y,
  piece,
  cell,
  clock,
  faded,
}: {
  x: number;
  y: number;
  piece: Piece;
  cell: number;
  clock: Clock;
  faded?: boolean;
}) {
  const cx = (x + 0.5) * cell;
  const cy = (y + 0.5) * cell;
  const angle = useSharedValue(orientAngle(piece.orient));
  const scale = useSharedValue(piece.lock === 'none' ? 0.3 : 1);
  const lastOrient = useRef(piece.orient);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 220 });
  }, [scale]);

  useEffect(() => {
    if (lastOrient.current !== piece.orient) {
      lastOrient.current = piece.orient;
      // Always spin forward by 90deg so rotation feels mechanical.
      angle.value = withSpring(angle.value + Math.PI / 2, {
        damping: 13,
        stiffness: 210,
      });
    }
  }, [piece.orient, angle]);

  const transform = useDerivedValue(() => [
    { translateX: cx },
    { translateY: cy },
    { rotate: angle.value },
    { scale: scale.value },
  ]);
  const ringSpin = useDerivedValue(() => [
    { translateX: cx },
    { translateY: cy },
    { rotate: clock.value / 3000 },
  ]);

  return (
    <Group opacity={faded ? 0.25 : 1}>
      {piece.lock === 'pivot' ? (
        <Group transform={ringSpin}>
          <Circle
            cx={0}
            cy={0}
            r={cell * 0.45}
            style="stroke"
            strokeWidth={1.3}
            color="rgba(170, 185, 255, 0.5)"
          >
            <DashPathEffect intervals={[cell * 0.16, cell * 0.08]} />
          </Circle>
        </Group>
      ) : null}
      <Group transform={transform}>
        <Bar kind={piece.kind} lock={piece.lock} cell={cell} />
      </Group>
    </Group>
  );
}

/** Pulsing golden outline suggesting where a piece should go. */
export function HintGhost({
  x,
  y,
  kind,
  orient,
  cell,
  clock,
}: {
  x: number;
  y: number;
  kind: PieceKind | 'rotate';
  orient: Orient;
  cell: number;
  clock: Clock;
}) {
  const opacity = useDerivedValue(
    () => 0.45 + 0.4 * Math.sin(clock.value / 160),
  );
  const L = cell * 0.84;
  const T = cell * 0.13;
  return (
    <Group opacity={opacity}>
      <RoundedRect
        x={x * cell + 2}
        y={y * cell + 2}
        width={cell - 4}
        height={cell - 4}
        r={cell * 0.16}
        style="stroke"
        strokeWidth={2}
        color={C.gold}
      >
        <DashPathEffect intervals={[6, 5]} />
      </RoundedRect>
      <RoundedRect
        x={x * cell + 2}
        y={y * cell + 2}
        width={cell - 4}
        height={cell - 4}
        r={cell * 0.16}
        color={C.gold}
        opacity={0.08}
      />
      {kind !== 'rotate' ? (
        <Group
          transform={[
            { translateX: (x + 0.5) * cell },
            { translateY: (y + 0.5) * cell },
            { rotate: orientAngle(orient) },
          ]}
        >
          <RoundedRect
            x={-L / 2}
            y={-T / 2}
            width={L}
            height={T}
            r={T / 2}
            style="stroke"
            strokeWidth={1.6}
            color={C.gold}
          />
        </Group>
      ) : null}
    </Group>
  );
}

export function CellMark({
  x,
  y,
  cell,
  color,
}: {
  x: number;
  y: number;
  cell: number;
  color: string;
}) {
  return (
    <RoundedRect
      x={x * cell + 2}
      y={y * cell + 2}
      width={cell - 4}
      height={cell - 4}
      r={cell * 0.16}
      style="stroke"
      strokeWidth={2}
      color={color}
    />
  );
}

/* ------------------------------------------------------------ beams ---- */

function beamPath(beams: Beam[], cell: number) {
  return beams
    .map(b =>
      b.points
        .map(
          (p, i) =>
            `${i ? 'L' : 'M'}${(p.x * cell).toFixed(2)} ${(p.y * cell).toFixed(
              2,
            )}`,
        )
        .join(' '),
    )
    .join(' ');
}

function BeamLayer({
  d,
  hex,
  cell,
  clock,
  energy,
}: {
  d: string;
  hex: string;
  cell: number;
  clock: Clock;
  energy: SharedValue<number>;
}) {
  const period = cell * 0.62;
  const phase = useDerivedValue(() => -((clock.value * cell * 0.004) % period));
  const glow = useDerivedValue(
    () =>
      (0.24 +
        0.05 * Math.sin(clock.value / 70) +
        0.04 * Math.sin(clock.value / 23)) *
      (1 + energy.value * 1.4),
  );
  const width = useDerivedValue(() => cell * (0.4 + energy.value * 0.25));
  return (
    <Group blendMode="plus">
      <Path
        path={d}
        style="stroke"
        strokeWidth={width}
        strokeCap="round"
        strokeJoin="round"
        color={hex}
        opacity={glow}
      >
        <BlurMask blur={cell * 0.22} style="normal" />
      </Path>
      <Path
        path={d}
        style="stroke"
        strokeWidth={cell * 0.14}
        strokeCap="round"
        strokeJoin="round"
        color={hex}
        opacity={0.85}
      >
        <BlurMask blur={cell * 0.045} style="normal" />
      </Path>
      <Path
        path={d}
        style="stroke"
        strokeWidth={cell * 0.045}
        strokeCap="round"
        strokeJoin="round"
        color="#FFFFFF"
        opacity={0.95}
      />
      <Path
        path={d}
        style="stroke"
        strokeWidth={cell * 0.075}
        strokeCap="round"
        color="#FFFFFF"
        opacity={0.6}
      >
        <DashPathEffect
          intervals={[cell * 0.1, period - cell * 0.1]}
          phase={phase}
        />
      </Path>
    </Group>
  );
}

export function Beams({
  beams,
  cell,
  clock,
  energy,
}: {
  beams: Beam[];
  cell: number;
  clock: Clock;
  energy: SharedValue<number>;
}) {
  const byColor = useMemo(() => {
    const out: { color: BeamColor; d: string }[] = [];
    (['cyan', 'magenta', 'amber'] as BeamColor[]).forEach(color => {
      const list = beams.filter(b => b.color === color);
      if (list.length) out.push({ color, d: beamPath(list, cell) });
    });
    return out;
  }, [beams, cell]);
  return (
    <Group>
      {byColor.map(({ color, d }) => (
        <BeamLayer
          key={color}
          d={d}
          hex={BEAM[color]}
          cell={cell}
          clock={clock}
          energy={energy}
        />
      ))}
    </Group>
  );
}

/* ----------------------------------------------------------- sparks ---- */

function SparkArt({
  spark,
  cell,
  clock,
  i,
}: {
  spark: Spark;
  cell: number;
  clock: Clock;
  i: number;
}) {
  const hex = spark.kind === 'reject' ? C.danger : BEAM[spark.color];
  const r = useDerivedValue(
    () => cell * (0.09 + 0.04 * Math.sin(clock.value / 45 + i * 1.9)),
  );
  const flicker = useDerivedValue(() =>
    spark.kind === 'reject'
      ? 0.5 + 0.5 * Math.abs(Math.sin(clock.value / 60 + i))
      : 0.85,
  );
  const px = spark.x * cell;
  const py = spark.y * cell;
  const k = cell * 0.12;
  return (
    <Group opacity={flicker}>
      <Circle cx={px} cy={py} r={r} color={hex}>
        <BlurMask blur={cell * 0.1} style="normal" />
      </Circle>
      <Circle cx={px} cy={py} r={cell * 0.035} color="#FFFFFF" />
      {spark.kind === 'reject' ? (
        <Path
          path={`M${px - k} ${py - k} L${px + k} ${py + k} M${px + k} ${
            py - k
          } L${px - k} ${py + k}`}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          color={C.danger}
        />
      ) : null}
    </Group>
  );
}

export function Sparks({
  sparks,
  cell,
  clock,
}: {
  sparks: Spark[];
  cell: number;
  clock: Clock;
}) {
  return (
    <Group blendMode="plus">
      {sparks.map((s, i) => (
        <SparkArt
          key={`${s.x},${s.y},${i}`}
          spark={s}
          cell={cell}
          clock={clock}
          i={i}
        />
      ))}
    </Group>
  );
}

/* ------------------------------------------------------------- icon ---- */

/** Small standalone canvas showing a piece, used in the tool tray. */
export function PieceIcon({ kind, size }: { kind: PieceKind; size: number }) {
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group
        transform={[
          { translateX: size / 2 },
          { translateY: size / 2 },
          { rotate: -Math.PI / 4 },
        ]}
      >
        <Bar kind={kind} lock="none" cell={size * 0.95} />
      </Group>
    </Canvas>
  );
}

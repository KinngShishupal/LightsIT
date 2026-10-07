import {
  BlurMask,
  Canvas,
  DashPathEffect,
  Group,
  Path,
  useClock,
} from '@shopify/react-native-skia';
import React, { useEffect, useState } from 'react';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { sound } from '../audio/sound';
import type { Orient } from '../game/engine';
import { BEAM } from '../theme';
import { Crystal, EmitterArt, PieceArt } from './boardArt';

/** Animated title illustration: a beam that zig-zags across four mirrors. */
export function HeroBeam({ width, height }: { width: number; height: number }) {
  const clock = useClock();
  const cell = Math.min(46, width / 8);
  const top = height * 0.3;
  const bottom = height * 0.78;
  const pts = [
    { x: cell * 0.9, y: top },
    { x: width * 0.3, y: top },
    { x: width * 0.3, y: bottom },
    { x: width * 0.6, y: bottom },
    { x: width * 0.6, y: top },
    { x: width - cell * 0.9, y: top },
  ];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const mirrors: { p: (typeof pts)[number]; o: Orient }[] = [
    { p: pts[1], o: 1 },
    { p: pts[2], o: 1 },
    { p: pts[3], o: 0 },
    { p: pts[4], o: 0 },
  ];

  const progress = useSharedValue(0);
  const win = useSharedValue(0);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    progress.value = withDelay(
      350,
      withTiming(
        1,
        { duration: 1500, easing: Easing.inOut(Easing.cubic) },
        done => {
          if (done) scheduleOnRN(setLit, true);
        },
      ),
    );
  }, [progress]);
  useEffect(() => {
    if (!lit) return;
    win.value = withTiming(1, { duration: 1400 });
    sound.crystal('cyan', 2);
  }, [lit, win]);

  const hex = BEAM.cyan;
  const period = cell * 0.62;
  const phase = useDerivedValue(() => -((clock.value * cell * 0.004) % period));
  const glow = useDerivedValue(() => 0.28 + 0.06 * Math.sin(clock.value / 80));
  const toGrid = (v: number) => v / cell - 0.5;

  return (
    <Canvas style={{ width, height }}>
      <Group blendMode="plus">
        <Path
          path={d}
          end={progress}
          style="stroke"
          strokeWidth={cell * 0.45}
          strokeJoin="round"
          strokeCap="round"
          color={hex}
          opacity={glow}
        >
          <BlurMask blur={cell * 0.24} style="normal" />
        </Path>
        <Path
          path={d}
          end={progress}
          style="stroke"
          strokeWidth={cell * 0.15}
          strokeJoin="round"
          strokeCap="round"
          color={hex}
          opacity={0.85}
        >
          <BlurMask blur={cell * 0.05} style="normal" />
        </Path>
        <Path
          path={d}
          end={progress}
          style="stroke"
          strokeWidth={cell * 0.05}
          strokeJoin="round"
          strokeCap="round"
          color="#FFFFFF"
        />
        <Path
          path={d}
          end={progress}
          style="stroke"
          strokeWidth={cell * 0.08}
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
      {mirrors.map(({ p, o }, i) => (
        <PieceArt
          key={i}
          x={toGrid(p.x)}
          y={toGrid(p.y)}
          piece={{ kind: 'mirror', orient: o, lock: 'none' }}
          cell={cell}
          clock={clock}
        />
      ))}
      <EmitterArt
        emitter={{
          x: toGrid(pts[0].x),
          y: toGrid(pts[0].y),
          dir: 0,
          color: 'cyan',
        }}
        cell={cell}
        clock={clock}
      />
      <Crystal
        x={toGrid(pts[5].x)}
        y={toGrid(pts[5].y)}
        color="cyan"
        lit={lit}
        cell={cell}
        clock={clock}
        win={win}
      />
    </Canvas>
  );
}

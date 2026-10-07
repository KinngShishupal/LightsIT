import {
  Canvas,
  Fill,
  Shader,
  Skia,
  useClock,
} from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';
import { BACKDROP_SKSL } from './shaders';

const effect = Skia.RuntimeEffect.Make(BACKDROP_SKSL)!;

/** Full-screen animated space backdrop. `energy` (0..1) brightens the nebula. */
export function Backdrop({ energy }: { energy?: SharedValue<number> }) {
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const uniforms = useDerivedValue(() => ({
    res: [width, height],
    time: clock.value / 1000,
    energy: energy ? energy.value : 0,
  }));
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <Shader source={effect} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

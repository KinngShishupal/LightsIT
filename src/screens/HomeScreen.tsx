import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sound } from '../audio/sound';
import { useAudioSettings } from '../audio/useAudioSettings';
import { HeroBeam } from '../components/HeroBeam';
import { GlowButton, PressableScale } from '../components/ui';
import { LEVELS } from '../game/levels';
import { useProgress } from '../storage/progress';
import { C, FONT } from '../theme';

export function HomeScreen({
  onPlay,
  onLevels,
}: {
  onPlay: (index: number) => void;
  onLevels: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const progress = useProgress();
  const audio = useAudioSettings();

  const next = LEVELS.findIndex((_, i) => !progress.stars[i]);
  const started = Object.keys(progress.stars).length > 0;
  const allDone = next === -1;

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <View style={styles.hero}>
        <HeroBeam width={width} height={250} />
        <Animated.View
          entering={FadeIn.delay(900).duration(900)}
          style={styles.titleWrap}
        >
          <Text style={styles.title}>
            LIGHTS<Text style={styles.titleAccent}>IT</Text>
          </Text>
          <Text style={styles.tagline}>BEND LIGHT · WAKE THE CRYSTALS</Text>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInDown.delay(1300).duration(600)}
        style={styles.buttons}
      >
        <GlowButton
          label={allDone ? 'REPLAY' : started ? 'CONTINUE' : 'PLAY'}
          onPress={() => onPlay(allDone ? 0 : next)}
          style={styles.wide}
        />
        <GlowButton
          variant="ghost"
          label="LEVELS"
          onPress={onLevels}
          style={styles.wide}
        />
        <Text style={styles.footer}>
          <Text style={{ color: C.gold }}>★ </Text>
          {progress.totalStars} / {LEVELS.length * 3}
        </Text>
        <View style={styles.toggles}>
          <Toggle
            glyph="♪"
            label="MUSIC"
            on={audio.music}
            onPress={() => sound.setMusic(!audio.music)}
          />
          <Toggle
            glyph="◉"
            label="SOUND"
            on={audio.sfx}
            onPress={() => sound.setSfx(!audio.sfx)}
          />
        </View>
      </Animated.View>
    </View>
  );
}

function Toggle({
  glyph,
  label,
  on,
  onPress,
}: {
  glyph: string;
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.toggle, on ? styles.toggleOn : styles.toggleOff]}
    >
      <Text style={[styles.toggleGlyph, on ? styles.textOn : styles.textOff]}>
        {glyph}
      </Text>
      <Text style={[styles.toggleLabel, on ? styles.textOn : styles.textOff]}>
        {label} {on ? 'ON' : 'OFF'}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  toggles: { flexDirection: 'row', gap: 10, marginTop: 4 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  toggleOn: {
    borderColor: 'rgba(95, 244, 255, 0.45)',
    backgroundColor: 'rgba(61, 242, 255, 0.08)',
  },
  toggleOff: {
    borderColor: C.border,
    backgroundColor: 'rgba(20, 26, 60, 0.4)',
  },
  toggleGlyph: { fontSize: 14 },
  toggleLabel: { fontSize: 10.5, ...FONT.label, letterSpacing: 1.6 },
  textOn: { color: '#5FF4FF' },
  textOff: { color: C.faint },
  root: { flex: 1, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center' },
  titleWrap: { alignItems: 'center', marginTop: 8 },
  title: {
    color: C.text,
    fontSize: 54,
    ...FONT.display,
    letterSpacing: 10,
    textShadowColor: 'rgba(61, 242, 255, 0.55)',
    textShadowRadius: 24,
    textShadowOffset: { width: 0, height: 0 },
  },
  titleAccent: { color: '#5FF4FF' },
  tagline: {
    color: C.dim,
    fontSize: 12,
    marginTop: 10,
    ...FONT.label,
    letterSpacing: 3.5,
  },
  buttons: { alignItems: 'center', gap: 14 },
  wide: { width: 240 },
  footer: {
    color: C.dim,
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

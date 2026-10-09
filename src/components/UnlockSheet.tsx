import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rewardedHint } from '../ads/rewardedHint';
import { sound } from '../audio/sound';
import { UNLOCK_ADS, useProgress } from '../storage/progress';
import { C, FONT } from '../theme';
import { LockIcon } from './LockIcon';
import { GlowButton, softEnter } from './ui';

/** Lets the player unlock the next level early by watching rewarded ads. */
export function UnlockSheet({
  level,
  onClose,
  onPlay,
}: {
  level: number;
  onClose: () => void;
  onPlay: (level: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const progress = useProgress();
  const watched = Math.min(UNLOCK_ADS, progress.adUnlock[level] ?? 0);
  const done = watched >= UNLOCK_ADS;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) onClose();
      return true;
    });
    return () => sub.remove();
  }, [busy, onClose]);

  const watch = async () => {
    if (busy || done) return;
    setMsg(null);
    setBusy(true);
    const result = await rewardedHint.show();
    setBusy(false);
    if (result === 'rewarded') {
      const count = progress.addUnlockAd(level);
      if (count >= UNLOCK_ADS) sound.win();
      else sound.crystal('cyan', count);
    } else if (result === 'skipped') {
      setMsg('Watch the whole ad for it to count.');
    } else {
      setMsg('No ad available right now. Please try again in a little while.');
    }
  };

  const remaining = UNLOCK_ADS - watched;
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      style={[styles.overlay, { paddingBottom: insets.bottom + 24 }]}
    >
      <Animated.View entering={softEnter} style={styles.card}>
        <View style={[styles.badge, done && styles.badgeDone]}>
          <LockIcon size={34} color={done ? '#5FF4FF' : C.dim} open={done} />
        </View>

        <Text style={styles.kicker}>{done ? 'UNLOCKED' : 'LOCKED LEVEL'}</Text>
        <Text style={styles.title}>Level {level + 1}</Text>
        <Text style={styles.body}>
          {done
            ? 'It’s yours. Jump in whenever you’re ready.'
            : `Clear the previous level to open it, or watch ${UNLOCK_ADS} short ads to unlock it now.`}
        </Text>

        <View style={styles.steps}>
          {Array.from({ length: UNLOCK_ADS }, (_, i) => (
            <View key={i} style={styles.step}>
              {i < watched ? (
                <Animated.View
                  entering={ZoomIn.duration(260)}
                  style={styles.stepFill}
                />
              ) : null}
            </View>
          ))}
        </View>
        <Text style={styles.stepText}>
          {done
            ? `${UNLOCK_ADS} of ${UNLOCK_ADS} ads watched`
            : `${watched} of ${UNLOCK_ADS} ads watched`}
        </Text>

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}

        <View style={styles.buttons}>
          {done ? (
            <GlowButton
              label={`PLAY LEVEL ${level + 1}`}
              onPress={() => onPlay(level)}
              style={styles.wide}
            />
          ) : (
            <GlowButton
              label={
                busy
                  ? 'LOADING AD…'
                  : `▶  WATCH AD${
                      remaining < UNLOCK_ADS ? ` (${remaining} LEFT)` : ''
                    }`
              }
              onPress={watch}
              style={styles.wide}
            />
          )}
          <Text
            style={styles.close}
            onPress={busy ? undefined : onClose}
            suppressHighlighting
          >
            {done ? 'Close' : 'Not now'}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 3, 12, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderRadius: 30,
    paddingVertical: 28,
    paddingHorizontal: 22,
    backgroundColor: 'rgba(13, 18, 46, 0.97)',
    borderWidth: 1,
    borderColor: C.borderStrong,
    elevation: 24,
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(133, 144, 194, 0.12)',
    borderWidth: 1,
    borderColor: C.border,
  },
  badgeDone: {
    backgroundColor: 'rgba(61, 242, 255, 0.12)',
    borderColor: 'rgba(95, 244, 255, 0.5)',
  },
  kicker: {
    color: C.dim,
    fontSize: 11,
    ...FONT.label,
    letterSpacing: 3,
    marginTop: 16,
  },
  title: { color: C.text, fontSize: 30, fontWeight: '900', marginTop: 4 },
  body: {
    color: C.dim,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },
  steps: { flexDirection: 'row', gap: 10, marginTop: 22 },
  step: {
    width: 56,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(133, 144, 194, 0.18)',
    overflow: 'hidden',
  },
  stepFill: { flex: 1, backgroundColor: '#5FF4FF', borderRadius: 5 },
  stepText: { color: C.dim, fontSize: 12, fontWeight: '700', marginTop: 8 },
  msg: { color: C.gold, fontSize: 13, textAlign: 'center', marginTop: 14 },
  buttons: { alignItems: 'center', marginTop: 22, gap: 6 },
  wide: { minWidth: 240 },
  close: {
    color: C.dim,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
});

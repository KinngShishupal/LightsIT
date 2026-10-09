import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockIcon } from '../components/LockIcon';
import { IconButton, PressableScale, Stars } from '../components/ui';
import { UnlockSheet } from '../components/UnlockSheet';
import { CHAPTERS, LEVELS } from '../game/levels';
import { UNLOCK_ADS, useProgress } from '../storage/progress';
import { C, FONT } from '../theme';

const ACCENTS = ['#3DF2FF', '#7FE7FF', '#FF4FD8', '#A77BFF'];
const COLS = 4;
const GAP = 10;

export function LevelSelectScreen({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const progress = useProgress();
  const tile = Math.floor((width - 32 - 32 - GAP * (COLS - 1)) / COLS);
  const current = LEVELS.findIndex((_, i) => !progress.stars[i]);
  // Only the very next locked level can be unlocked early with ads.
  const nextLocked = LEVELS.findIndex((_, i) => !progress.isUnlocked(i));
  const [unlockFor, setUnlockFor] = useState<number | null>(null);

  let index = 0;
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton glyph="‹" onPress={onBack} />
        <Text style={styles.title}>LEVELS</Text>
        <View style={styles.total}>
          <Text style={styles.totalText}>
            <Text style={{ color: C.gold }}>★ </Text>
            {progress.totalStars}/{LEVELS.length * 3}
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {CHAPTERS.map((ch, ci) => {
          const accent = ACCENTS[ci % ACCENTS.length];
          const first = index;
          index += ch.levels.length;
          return (
            <Animated.View
              key={ch.title}
              entering={FadeInDown.delay(ci * 90).duration(450)}
              style={styles.chapter}
            >
              <View style={styles.chapterHead}>
                <Text style={[styles.chapterNum, { color: accent }]}>
                  {String(ci + 1).padStart(2, '0')}
                </Text>
                <View>
                  <Text style={styles.chapterTitle}>
                    {ch.title.toUpperCase()}
                  </Text>
                  <Text style={styles.chapterSub}>{ch.subtitle}</Text>
                </View>
              </View>
              <View style={styles.grid}>
                {ch.levels.map((lv, li) => {
                  const i = first + li;
                  const unlocked = progress.isUnlocked(i);
                  const stars = progress.stars[i] ?? 0;
                  const isCurrent = i === current;
                  const canAdUnlock = i === nextLocked;
                  const adsWatched = progress.adUnlock[i] ?? 0;
                  return (
                    <PressableScale
                      key={lv.name}
                      disabled={!unlocked && !canAdUnlock}
                      onPress={() => (unlocked ? onPick(i) : setUnlockFor(i))}
                      style={[
                        styles.tile,
                        { width: tile, height: tile * 1.08 },
                        isCurrent && {
                          borderColor: accent,
                          shadowColor: accent,
                          backgroundColor: 'rgba(61, 242, 255, 0.07)',
                        },
                        stars > 0 && styles.tileDone,
                      ]}
                    >
                      {unlocked ? (
                        <>
                          <Text style={styles.tileNum}>{i + 1}</Text>
                          <Stars value={stars} size={11} gap={1} />
                        </>
                      ) : (
                        <>
                          <LockIcon />
                          {canAdUnlock ? (
                            <Text style={styles.adUnlock}>
                              {adsWatched > 0
                                ? `▶ ${adsWatched}/${UNLOCK_ADS}`
                                : '▶ UNLOCK'}
                            </Text>
                          ) : (
                            <Text style={styles.locked}>{i + 1}</Text>
                          )}
                        </>
                      )}
                    </PressableScale>
                  );
                })}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      {unlockFor !== null ? (
        <UnlockSheet
          level={unlockFor}
          onClose={() => setUnlockFor(null)}
          onPlay={lvl => {
            setUnlockFor(null);
            onPick(lvl);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: { color: C.text, fontSize: 20, ...FONT.display },
  total: {
    minWidth: 64,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 122, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 122, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalText: { color: C.text, fontWeight: '800', fontSize: 13 },
  list: { paddingHorizontal: 16, gap: 16, paddingTop: 6 },
  chapter: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
  },
  chapterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  chapterNum: { fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  chapterTitle: {
    color: C.text,
    fontSize: 15,
    ...FONT.label,
    letterSpacing: 3,
  },
  chapterSub: { color: C.dim, fontSize: 12, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(8, 11, 30, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  tileDone: { borderColor: 'rgba(255, 215, 122, 0.28)' },
  tileNum: { color: C.text, fontSize: 22, fontWeight: '800' },
  locked: { color: C.faint, fontSize: 11, fontWeight: '800', marginTop: 2 },
  adUnlock: {
    color: '#5FF4FF',
    fontSize: 9.5,
    ...FONT.label,
    letterSpacing: 1,
    marginTop: 3,
  },
});

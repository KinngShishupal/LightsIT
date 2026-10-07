import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOut,
  FadeOutLeft,
  SlideInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sound } from '../audio/sound';
import { GlowButton } from '../components/ui';
import { C, FONT } from '../theme';
import { CONCEPTS, type ConceptId } from './concepts';
import { DemoBoard } from './DemoBoard';

export function TutorialOverlay({
  ids,
  onDone,
}: {
  ids: ConceptId[];
  onDone: () => void;
}) {
  const [page, setPage] = useState(0);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const concept = CONCEPTS[ids[page]];
  const last = page === ids.length - 1;
  const cardWidth = Math.min(width - 32, 400);

  useEffect(() => {
    sound.hint();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDone();
      return true;
    });
    return () => sub.remove();
  }, [onDone]);

  const next = () => (last ? onDone() : setPage(p => p + 1));

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={[styles.overlay, { paddingBottom: insets.bottom + 24 }]}
    >
      <Animated.View
        entering={SlideInDown.springify().damping(18)}
        style={[styles.card, { width: cardWidth }]}
      >
        <Animated.View
          key={concept.id}
          entering={FadeInRight.duration(320)}
          exiting={FadeOutLeft.duration(160)}
          style={styles.page}
        >
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{concept.tag}</Text>
            </View>
            {ids.length > 1 ? (
              <Text style={styles.count}>
                {page + 1} / {ids.length}
              </Text>
            ) : null}
          </View>

          <View style={styles.demo}>
            <DemoBoard concept={concept} width={cardWidth - 64} />
          </View>

          <Text style={styles.title}>{concept.title}</Text>
          <Text style={styles.body}>{concept.body}</Text>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {ids.length > 1
              ? ids.map((id, i) => (
                  <View
                    key={id}
                    style={[styles.dot, i === page && styles.dotOn]}
                  />
                ))
              : null}
          </View>
          <GlowButton
            small
            label={last ? "LET'S GO" : 'NEXT  ›'}
            onPress={next}
          />
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
    justifyContent: 'flex-end',
  },
  card: {
    borderRadius: 30,
    padding: 20,
    backgroundColor: 'rgba(13, 18, 46, 0.97)',
    borderWidth: 1,
    borderColor: C.borderStrong,
    shadowColor: '#3DF2FF',
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 24,
  },
  page: { alignItems: 'center' },
  tagRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(61, 242, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(95, 244, 255, 0.5)',
  },
  tagText: {
    color: '#5FF4FF',
    fontSize: 10.5,
    ...FONT.label,
    letterSpacing: 2.5,
  },
  count: { color: C.dim, fontSize: 12, fontWeight: '700' },
  demo: {
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 22,
    backgroundColor: 'rgba(4, 6, 20, 0.6)',
    paddingVertical: 4,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  title: {
    color: C.text,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
  body: {
    color: C.dim,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.faint },
  dotOn: { width: 20, backgroundColor: '#5FF4FF' },
});

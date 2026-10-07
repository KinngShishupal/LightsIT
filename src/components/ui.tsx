import React from 'react';
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { sound } from '../audio/sound';
import { C, FONT } from '../theme';

const CALM = { duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1) };

/** Calm entrance for cards and dialogs: fade in while drifting up a few px. */
export const softEnter = () => {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 18 }, { scale: 0.985 }],
    },
    animations: {
      opacity: withTiming(1, CALM),
      transform: [
        { translateY: withTiming(0, CALM) },
        { scale: withTiming(1, CALM) },
      ],
    },
  };
};

export function PressableScale({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        sound.ui();
        s.value = withSpring(0.93, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() =>
        (s.value = withSpring(1, { damping: 10, stiffness: 300 }))
      }
      hitSlop={6}
    >
      <Animated.View style={[style, anim, disabled && styles.disabled]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function GlowButton({
  label,
  onPress,
  variant = 'primary',
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.button,
        small && styles.buttonSmall,
        primary ? styles.primary : styles.ghost,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          small && styles.buttonTextSmall,
          { color: primary ? '#02131A' : C.text },
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

export function IconButton({
  glyph,
  onPress,
  label,
  badge,
}: {
  glyph: string;
  onPress: () => void;
  label?: string;
  /** Small pill in the top-right corner, e.g. "AD". */
  badge?: string;
}) {
  return (
    <PressableScale onPress={onPress} style={styles.icon}>
      <Text style={styles.iconGlyph}>{glyph}</Text>
      {label ? <Text style={styles.iconLabel}>{label}</Text> : null}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

export function Stars({
  value,
  size = 14,
  gap = 2,
}: {
  value: number;
  size?: number;
  gap?: number;
}) {
  return (
    <Text style={{ fontSize: size, letterSpacing: gap }}>
      {[0, 1, 2].map(i => (
        <Text key={i} style={{ color: i < value ? C.gold : C.faint }}>
          ★
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.4 },
  button: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { height: 46, borderRadius: 23, paddingHorizontal: 22 },
  primary: {
    backgroundColor: '#5FF4FF',
    shadowColor: '#3DF2FF',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  ghost: {
    backgroundColor: 'rgba(30, 38, 84, 0.55)',
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  buttonText: { fontSize: 16, ...FONT.label },
  buttonTextSmall: { fontSize: 13 },
  icon: {
    minWidth: 64,
    height: 58,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 7,
    backgroundColor: C.gold,
  },
  badgeText: {
    color: '#1A1300',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  iconGlyph: { color: C.text, fontSize: 20, lineHeight: 24 },
  iconLabel: {
    color: C.dim,
    fontSize: 9.5,
    marginTop: 2,
    ...FONT.label,
    letterSpacing: 1.4,
  },
});

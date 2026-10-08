import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../components/ui';
import { POLICY, SECTIONS } from '../legal/privacyPolicy';
import { C, FONT } from '../theme';

const LINK = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g;

/** Renders text with URLs and e-mail addresses as tappable links. */
function Rich({ text, style }: { text: string; style: object }) {
  const parts = text.split(LINK);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const href = part.includes('@')
          ? `mailto:${part}`
          : part.replace(/[.,]$/, '');
        return (
          <Text
            key={i}
            style={styles.link}
            onPress={() => Linking.openURL(href).catch(() => {})}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton glyph="‹" onPress={onBack} />
        <Text style={styles.title}>PRIVACY</Text>
        <View style={styles.spacer} />
      </View>
      <Animated.View entering={FadeIn.duration(300)} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 40 },
          ]}
        >
          <Text style={styles.docTitle}>Privacy Policy</Text>
          <Text style={styles.meta}>
            {POLICY.appName} · Effective {POLICY.effectiveDate}
          </Text>
          {SECTIONS.map(section => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.heading}>{section.heading}</Text>
              {section.paragraphs?.map((p, i) => (
                <Rich key={`p${i}`} text={p} style={styles.body} />
              ))}
              {section.bullets?.map((b, i) => (
                <View key={`b${i}`} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Rich text={b} style={[styles.body, styles.bulletText]} />
                </View>
              ))}
              {section.after?.map((p, i) => (
                <Rich key={`a${i}`} text={p} style={styles.body} />
              ))}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: { color: C.text, fontSize: 20, ...FONT.display },
  spacer: { width: 64 },
  content: { paddingHorizontal: 22, paddingTop: 8 },
  docTitle: { color: C.text, fontSize: 28, fontWeight: '900' },
  meta: { color: C.dim, fontSize: 13, marginTop: 4, marginBottom: 8 },
  section: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
  },
  heading: {
    color: '#5FF4FF',
    fontSize: 12,
    ...FONT.label,
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  body: { color: '#C9CFEE', fontSize: 15, lineHeight: 23, marginTop: 6 },
  bulletRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  bulletDot: { color: '#5FF4FF', fontSize: 15, lineHeight: 23, marginTop: 6 },
  bulletText: { flex: 1 },
  link: { color: '#5FF4FF', textDecorationLine: 'underline' },
});

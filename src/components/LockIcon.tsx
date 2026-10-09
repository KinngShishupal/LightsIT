import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '../theme';

/** Padlock drawn with views: shackle, body and keyhole. `size` = body width. */
export function LockIcon({
  size = 22,
  color = C.dim,
  open = false,
}: {
  size?: number;
  color?: string;
  open?: boolean;
}) {
  const k = size / 22;
  return (
    <View style={styles.lock}>
      <View
        style={{
          width: 14 * k,
          height: 11 * k,
          borderWidth: 2.5 * k,
          borderBottomWidth: 0,
          borderTopLeftRadius: 7 * k,
          borderTopRightRadius: 7 * k,
          borderColor: color,
          marginBottom: -1 * k,
          // An open lock lifts its shackle up and to the right.
          transform: open
            ? [{ translateX: 5 * k }, { translateY: -4 * k }]
            : [],
        }}
      />
      <View
        style={{
          width: size,
          height: 17 * k,
          borderRadius: 5 * k,
          backgroundColor: color,
          alignItems: 'center',
          paddingTop: 4 * k,
        }}
      >
        <View
          style={{
            width: 5 * k,
            height: 5 * k,
            borderRadius: 2.5 * k,
            backgroundColor: '#0B1030',
          }}
        />
        <View
          style={{
            width: 2 * k,
            height: 4 * k,
            marginTop: -1 * k,
            borderRadius: 1 * k,
            backgroundColor: '#0B1030',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ lock: { alignItems: 'center' } });

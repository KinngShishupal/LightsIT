import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
import { C, FONT } from '../theme';

/**
 * Production banner ad unit IDs from the AdMob console
 * (Apps → LightsIt → Ad units → Add ad unit → Banner).
 * Development builds always use Google's test banner. Release builds show
 * no banner until a real ID is filled in, so test ads never reach players.
 */
const PRODUCTION_BANNER_IDS = {
  android: 'ca-app-pub-8284285672679424/2081687015',
  ios: '',
};

const prodUnit =
  Platform.OS === 'ios'
    ? PRODUCTION_BANNER_IDS.ios
    : PRODUCTION_BANNER_IDS.android;
const BANNER_UNIT_ID = __DEV__ ? TestIds.BANNER : prodUnit;

/** Standard 320x50 banner shown at the bottom of the level-clear card. */
export function ResultBanner() {
  const [failed, setFailed] = useState(false);
  if (!BANNER_UNIT_ID || failed) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>ADVERTISEMENT</Text>
      <View style={styles.slot}>
        <BannerAd
          unitId={BANNER_UNIT_ID}
          size={BannerAdSize.BANNER}
          onAdFailedToLoad={() => setFailed(true)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Generous gap above keeps the ad clear of the Replay / Next buttons
  // (AdMob policy against placements that invite accidental clicks).
  wrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    // Bleed to the card's edges (card has 22px side padding) so the 320px
    // banner fits even on 360dp-wide phones.
    marginHorizontal: -22,
    marginTop: 26,
    paddingTop: 14,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  label: {
    color: C.faint,
    fontSize: 8.5,
    ...FONT.label,
    letterSpacing: 2,
    marginBottom: 6,
  },
  slot: {
    width: 320,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * LightsIt — bend lasers with mirrors to wake every crystal.
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { BackHandler, StatusBar, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { rewardedHint } from './src/ads/rewardedHint';
import { sound } from './src/audio/sound';
import { Backdrop } from './src/components/Backdrop';
import { LEVELS } from './src/game/levels';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LevelSelectScreen } from './src/screens/LevelSelectScreen';
import { ProgressProvider } from './src/storage/progress';
import { C } from './src/theme';

type Route =
  | { name: 'home' }
  | { name: 'levels' }
  | { name: 'game'; index: number; attempt: number };

function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const energy = useSharedValue(0);

  useEffect(() => {
    sound.init();
    rewardedHint.init();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name === 'home') return false;
      setRoute(route.name === 'game' ? { name: 'levels' } : { name: 'home' });
      return true;
    });
    return () => sub.remove();
  }, [route]);

  const play = (index: number) =>
    setRoute({ name: 'game', index, attempt: Date.now() });

  return (
    <SafeAreaProvider>
      <ProgressProvider>
        <StatusBar barStyle="light-content" />
        <View style={styles.root}>
          <Backdrop energy={energy} />
          {route.name === 'home' ? (
            <HomeScreen
              onPlay={play}
              onLevels={() => setRoute({ name: 'levels' })}
            />
          ) : route.name === 'levels' ? (
            <LevelSelectScreen
              onBack={() => setRoute({ name: 'home' })}
              onPick={play}
            />
          ) : (
            <GameScreen
              key={`${route.index}-${route.attempt}`}
              index={route.index}
              energy={energy}
              onBack={() => setRoute({ name: 'levels' })}
              onReplay={() => play(route.index)}
              onNext={() => play(Math.min(route.index + 1, LEVELS.length - 1))}
            />
          )}
        </View>
      </ProgressProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
});

export default App;

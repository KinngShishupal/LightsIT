import { useSyncExternalStore } from 'react';
import { sound } from './sound';

const subscribe = (cb: () => void) => sound.subscribe(cb);
const getSnapshot = () => sound.settings;

export function useAudioSettings() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

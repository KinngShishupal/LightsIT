import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'lightsit.progress.v1';

interface Progress {
  stars: Record<number, number>; // level index -> best stars (1-3)
}

interface ProgressApi extends Progress {
  ready: boolean;
  record: (level: number, stars: number) => void;
  isUnlocked: (level: number) => boolean;
  totalStars: number;
  reset: () => void;
}

const Ctx = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [stars, setStars] = useState<Record<number, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) setStars(JSON.parse(raw).stars ?? {});
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = (next: Record<number, number>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ stars: next })).catch(
      () => {},
    );
  };

  const record = useCallback((level: number, value: number) => {
    setStars(prev => {
      if ((prev[level] ?? 0) >= value) return prev;
      const next = { ...prev, [level]: value };
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setStars({});
    persist({});
  }, []);

  const api = useMemo<ProgressApi>(
    () => ({
      stars,
      ready,
      record,
      reset,
      isUnlocked: (level: number) => level === 0 || (stars[level - 1] ?? 0) > 0,
      totalStars: Object.values(stars).reduce((a, b) => a + b, 0),
    }),
    [stars, ready, record, reset],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}

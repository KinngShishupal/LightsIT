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
  seen: Record<string, true>; // tutorial concepts already shown
}

interface ProgressApi extends Progress {
  ready: boolean;
  record: (level: number, stars: number) => void;
  markSeen: (ids: string[]) => void;
  isUnlocked: (level: number) => boolean;
  totalStars: number;
  reset: () => void;
}

const EMPTY: Progress = { stars: {}, seen: {} };
const Ctx = createContext<ProgressApi | null>(null);

const persist = (p: Progress) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p)).catch(() => {});
};

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Progress>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          const parsed = JSON.parse(raw);
          setData({ stars: parsed.stars ?? {}, seen: parsed.seen ?? {} });
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((fn: (prev: Progress) => Progress) => {
    setData(prev => {
      const next = fn(prev);
      if (next !== prev) persist(next);
      return next;
    });
  }, []);

  const record = useCallback(
    (level: number, value: number) =>
      update(prev =>
        (prev.stars[level] ?? 0) >= value
          ? prev
          : { ...prev, stars: { ...prev.stars, [level]: value } },
      ),
    [update],
  );

  const markSeen = useCallback(
    (ids: string[]) =>
      update(prev =>
        ids.every(id => prev.seen[id])
          ? prev
          : {
              ...prev,
              seen: {
                ...prev.seen,
                ...Object.fromEntries(ids.map(id => [id, true as const])),
              },
            },
      ),
    [update],
  );

  const reset = useCallback(() => update(() => EMPTY), [update]);

  const api = useMemo<ProgressApi>(
    () => ({
      ...data,
      ready,
      record,
      markSeen,
      reset,
      isUnlocked: (level: number) =>
        level === 0 || (data.stars[level - 1] ?? 0) > 0,
      totalStars: Object.values(data.stars).reduce((a, b) => a + b, 0),
    }),
    [data, ready, record, markSeen, reset],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}

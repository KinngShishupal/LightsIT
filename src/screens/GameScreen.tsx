import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResultBanner } from '../ads/ResultBanner';
import { rewardedHint } from '../ads/rewardedHint';
import { sound } from '../audio/sound';
import { Board, type Cell } from '../components/Board';
import { PieceIcon } from '../components/boardArt';
import {
  GlowButton,
  IconButton,
  PressableScale,
  softEnter,
} from '../components/ui';
import {
  canBuild,
  key,
  parseLevel,
  type PieceKind,
  type PieceMap,
  type Placement,
  trace,
  unkey,
} from '../game/engine';
import { CHAPTERS, LEVELS } from '../game/levels';
import { SOLUTIONS } from '../game/solutions';
import {
  type ConceptId,
  HOW_TO_PLAY,
  LEVEL_INTROS,
} from '../tutorial/concepts';
import { TutorialOverlay } from '../tutorial/TutorialOverlay';
import { useProgress } from '../storage/progress';
import { BEAM, C, FONT } from '../theme';

type Hint = (Placement & { rotate?: boolean; remove?: boolean }) | null;

function chapterOf(index: number) {
  let i = index;
  for (let c = 0; c < CHAPTERS.length; c++) {
    if (i < CHAPTERS[c].levels.length) return { chapter: c, pos: i };
    i -= CHAPTERS[c].levels.length;
  }
  return { chapter: 0, pos: 0 };
}

function countPlayer(pieces: PieceMap) {
  const n = { mirror: 0, splitter: 0 };
  for (const k in pieces) if (pieces[k].lock === 'none') n[pieces[k].kind]++;
  return n;
}

export function starsFor(used: number, par: number, hinted: boolean) {
  const s = used <= par ? 3 : used === par + 1 ? 2 : 1;
  return hinted ? Math.min(s, 2) : s;
}

export function GameScreen({
  index,
  energy,
  onBack,
  onNext,
  onReplay,
}: {
  index: number;
  energy: SharedValue<number>;
  onBack: () => void;
  onNext: () => void;
  onReplay: () => void;
}) {
  const level = useMemo(() => parseLevel(LEVELS[index], index), [index]);
  const sol = SOLUTIONS[index]!;
  const { chapter, pos } = chapterOf(index);
  const progress = useProgress();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [pieces, setPieces] = useState<PieceMap>(level.initialPieces);
  const [history, setHistory] = useState<PieceMap[]>([]);
  const [tool, setTool] = useState<PieceKind>(
    level.inventory.mirror > 0 ? 'mirror' : 'splitter',
  );
  const [drag, setDrag] = useState<{ from: string; to: Cell } | null>(null);
  const [hint, setHint] = useState<Hint>(null);
  const [hinted, setHinted] = useState(false);
  const [won, setWon] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const intros = LEVEL_INTROS[level.name] ?? [];
  // Show any concept this level introduces that the player hasn't seen yet.
  const [tutorial, setTutorial] = useState<ConceptId[] | null>(() => {
    const unseen = intros.filter(id => !progress.seen[id]);
    return unseen.length ? unseen : null;
  });
  const [coach, setCoach] = useState(false);
  const win = useSharedValue(0);
  const trayShake = useSharedValue(0);

  const used = countPlayer(pieces);
  const remaining = {
    mirror: level.inventory.mirror - used.mirror,
    splitter: level.inventory.splitter - used.splitter,
  };
  const kinds = (['mirror', 'splitter'] as PieceKind[]).filter(
    k => level.inventory[k] > 0,
  );

  // While dragging, preview the move live so the beam follows the finger.
  const { display, invalidCell } = useMemo(() => {
    if (!drag) return { display: pieces, invalidCell: null };
    const { from, to } = drag;
    const k = key(to.x, to.y);
    if (k === from) return { display: pieces, invalidCell: null };
    const without = { ...pieces };
    const p = without[from];
    delete without[from];
    if (!canBuild(level, without, to.x, to.y)) {
      const inBoard =
        to.x >= 0 && to.y >= 0 && to.x < level.cols && to.y < level.rows;
      return { display: without, invalidCell: inBoard ? to : null };
    }
    return { display: { ...without, [k]: p }, invalidCell: null };
  }, [drag, pieces, level]);

  const result = useMemo(() => trace(level, display), [level, display]);
  const litCount = result.lit.size;

  const flash = (msg: string) => {
    setNotice(msg);
    trayShake.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 70 }),
      withTiming(-5, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
    Vibration.vibrate(30);
    sound.error();
  };

  const commit = useCallback(
    (next: PieceMap) => {
      setHistory(h => [...h.slice(-60), pieces]);
      setPieces(next);
      setNotice(null);
    },
    [pieces],
  );

  // ----- interactions --------------------------------------------------
  const onTap = (c: Cell) => {
    if (won) return;
    const k = key(c.x, c.y);
    const p = pieces[k];
    if (p) {
      if (p.lock === 'fixed') return flash('Steel mirrors are bolted in place');
      commit({ ...pieces, [k]: { ...p, orient: p.orient === 0 ? 1 : 0 } });
      Vibration.vibrate(6);
      sound.rotate();
      return;
    }
    if (!canBuild(level, pieces, c.x, c.y)) return;
    const kind =
      remaining[tool] > 0 ? tool : kinds.find(kd => remaining[kd] > 0);
    if (!kind) {
      return flash(
        kinds.length
          ? 'Out of pieces. Drag or long-press one to reuse it'
          : 'Rotate the ringed pivots',
      );
    }
    commit({ ...pieces, [k]: { kind, orient: 0, lock: 'none' } });
    Vibration.vibrate(8);
    sound.place(kind);
  };

  const onLongPress = (c: Cell) => {
    if (won) return;
    const k = key(c.x, c.y);
    if (pieces[k]?.lock !== 'none') return;
    const next = { ...pieces };
    delete next[k];
    commit(next);
    Vibration.vibrate(18);
    sound.remove();
  };

  const canDrag = (c: Cell) => !won && pieces[key(c.x, c.y)]?.lock === 'none';

  const onDragEnd = (c: Cell) => {
    if (!drag) return;
    const outside =
      c.x < 0 || c.y < 0 || c.x >= level.cols || c.y >= level.rows;
    if (outside) {
      // Flicking a piece off the board returns it to the tray.
      const next = { ...pieces };
      delete next[drag.from];
      commit(next);
      sound.remove();
    } else if (key(c.x, c.y) !== drag.from) {
      const next = { ...pieces };
      const piece = next[drag.from];
      delete next[drag.from];
      if (canBuild(level, next, c.x, c.y)) {
        commit({ ...next, [key(c.x, c.y)]: piece });
        Vibration.vibrate(8);
        sound.place(piece.kind);
      }
    }
    setDrag(null);
  };

  const undo = () => {
    if (won || !history.length) return;
    setPieces(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    sound.undo();
  };

  const reset = () => {
    if (won) return;
    commit(level.initialPieces);
    setHint(null);
    sound.reset();
  };

  /** The next step of the stored solution the player hasn't done yet. */
  const nextHint = (): Hint => {
    for (const k in sol.pivots) {
      if (pieces[k]?.orient !== sol.pivots[k]) {
        const { x, y } = unkey(k);
        return { x, y, kind: 'mirror', orient: sol.pivots[k], rotate: true };
      }
    }
    for (const p of sol.placements) {
      const cur = pieces[key(p.x, p.y)];
      if (!cur || cur.kind !== p.kind || cur.orient !== p.orient) return p;
    }
    // Everything required is placed; something extra must be in the way.
    const wanted = new Set(sol.placements.map(p => key(p.x, p.y)));
    const extra = Object.keys(pieces).find(
      k => pieces[k].lock === 'none' && !wanted.has(k),
    );
    if (!extra) return null;
    const { x, y } = unkey(extra);
    return {
      x,
      y,
      kind: pieces[extra].kind,
      orient: pieces[extra].orient,
      rotate: true,
      remove: true,
    };
  };

  const [adBusy, setAdBusy] = useState(false);

  // Each new hint is unlocked by watching a rewarded ad.
  const askHint = async () => {
    if (won || adBusy) return;
    const next = nextHint();
    if (!next) return;
    // Already showing this exact hint: no need to watch another ad.
    if (hint && !coach && hint.x === next.x && hint.y === next.y) return;

    setAdBusy(true);
    const result = await rewardedHint.show();
    setAdBusy(false);

    if (result === 'skipped') {
      flashAdMsg('Watch the whole ad to unlock a hint.');
      return;
    }
    setHinted(true);
    setCoach(false);
    sound.hint();
    setHint(next);
    // No ad could be loaded (offline / no fill): don't punish the player.
    if (result === 'unavailable') {
      flashAdMsg('No ad available right now, so this hint is free.');
    }
  };

  const [adMsg, setAdMsg] = useState<string | null>(null);
  const adMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashAdMsg = (msg: string) => {
    setAdMsg(msg);
    if (adMsgTimer.current) clearTimeout(adMsgTimer.current);
    adMsgTimer.current = setTimeout(() => setAdMsg(null), 3000);
  };
  useEffect(
    () => () => {
      if (adMsgTimer.current) clearTimeout(adMsgTimer.current);
    },
    [],
  );

  // Drop the hint once the player follows it.
  useEffect(() => {
    if (!hint) return;
    const cur = pieces[key(hint.x, hint.y)];
    const done = hint.remove
      ? !cur
      : cur && cur.kind === hint.kind && cur.orient === hint.orient;
    if (done) setHint(null);
  }, [pieces, hint]);

  // ----- audio ---------------------------------------------------------
  useEffect(() => {
    sound.ignite();
  }, []);

  // Chime when crystals wake (and a soft fall when they go dark).
  const prevLit = useRef<Set<string>>(new Set());
  useEffect(() => {
    const prev = prevLit.current;
    prevLit.current = result.lit;
    if (won) return;
    let order = 0;
    level.targets.forEach(t => {
      const k = key(t.x, t.y);
      if (result.lit.has(k) && !prev.has(k)) {
        sound.crystal(t.color, result.lit.size - 1 + order++);
      }
    });
    if ([...prev].some(k => !result.lit.has(k))) sound.crystalOff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.lit]);

  // ----- victory --------------------------------------------------------
  const stars = starsFor(used.mirror + used.splitter, sol.par, hinted);

  useEffect(() => {
    if (!result.solved || drag || won) return;
    setWon(true);
    setHint(null);
    progress.record(index, stars);
    Vibration.vibrate([0, 25, 70, 45]);
    sound.win();
    win.value = withDelay(120, withTiming(1, { duration: 1500 }));
    energy.value = withSequence(
      withTiming(1, { duration: 260 }),
      withTiming(0.35, { duration: 1400 }),
    );
    const t = setTimeout(() => setShowResult(true), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.solved, drag]);

  useEffect(
    () => () => {
      energy.value = withTiming(0, { duration: 600 });
    },
    [energy],
  );

  // ----- layout ---------------------------------------------------------
  const headerH = 96;
  const trayH = 170;
  const availH = height - insets.top - insets.bottom - headerH - trayH;
  const cell = Math.floor(
    Math.min((width - 16) / (level.cols + 0.7), availH / (level.rows + 0.7)),
  );

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trayShake.value }],
  }));

  const closeTutorial = useCallback(() => {
    if (tutorial) progress.markSeen(tutorial);
    setTutorial(null);
    // First level: guide the very first placement by hand.
    if (index === 0 && !won && Object.keys(pieces).length === 0) {
      setCoach(true);
      setHint(sol.placements[0]);
    }
  }, [tutorial, progress, index, won, pieces, sol]);

  const hintText = adBusy
    ? 'Loading ad…'
    : adMsg
    ? adMsg
    : coach && hint
    ? 'Tap the glowing tile to place a mirror.'
    : hint
    ? hint.remove
      ? 'This piece is in the way: drag it off the board.'
      : hint.rotate
      ? 'Rotate this pivot.'
      : `Try a ${hint.kind} here, angled like the outline.`
    : notice ?? level.hint;

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 10 },
      ]}
    >
      <View style={styles.header}>
        <IconButton glyph="‹" onPress={onBack} />
        <View style={styles.titleBlock}>
          <Text style={styles.kicker}>
            {String(chapter + 1).padStart(2, '0')} ·{' '}
            {CHAPTERS[chapter].title.toUpperCase()} · {pos + 1}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {level.name}
          </Text>
          <View style={styles.crystalRow}>
            {level.targets.map(t => {
              const on = result.lit.has(key(t.x, t.y));
              return (
                <View
                  key={key(t.x, t.y)}
                  style={[
                    styles.crystalDot,
                    { borderColor: BEAM[t.color] },
                    on && {
                      backgroundColor: BEAM[t.color],
                      shadowColor: BEAM[t.color],
                    },
                  ]}
                />
              );
            })}
            <Text style={styles.crystalText}>
              {litCount}/{level.targets.length}
            </Text>
          </View>
        </View>
        <View style={styles.par}>
          <Text style={styles.parLabel}>PAR</Text>
          <Text style={styles.parValue}>{sol.par}</Text>
        </View>
      </View>

      <View style={styles.boardWrap}>
        <Animated.View entering={FadeIn.duration(500)}>
          <Board
            level={level}
            pieces={display}
            result={result}
            cell={cell}
            hint={hint}
            dragFrom={drag?.from ?? null}
            invalidCell={invalidCell}
            win={win}
            energy={energy}
            canDrag={canDrag}
            onTap={onTap}
            onLongPress={onLongPress}
            onDragStart={c => setDrag({ from: key(c.x, c.y), to: c })}
            onDragMove={c => {
              sound.tick();
              setDrag(d => (d ? { ...d, to: c } : d));
            }}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDrag(null)}
          />
        </Animated.View>
      </View>

      <Text
        style={[styles.hint, (hint || notice) && styles.hintActive]}
        numberOfLines={2}
      >
        {hintText}
      </Text>

      <Animated.View style={[styles.tray, shakeStyle]}>
        <View style={styles.tools}>
          {kinds.length === 0 ? (
            <View style={styles.noTools}>
              <Text style={styles.noToolsText}>NO PIECES · ROTATE PIVOTS</Text>
            </View>
          ) : (
            kinds.map(k => {
              const active = tool === k;
              return (
                <PressableScale
                  key={k}
                  onPress={() => setTool(k)}
                  style={[styles.tool, active && styles.toolActive]}
                >
                  <PieceIcon kind={k} size={34} />
                  <View>
                    <Text style={styles.toolName}>{k.toUpperCase()}</Text>
                    <Text
                      style={[
                        styles.toolCount,
                        remaining[k] === 0 && { color: C.faint },
                      ]}
                    >
                      × {remaining[k]}
                    </Text>
                  </View>
                </PressableScale>
              );
            })
          )}
        </View>
        <View style={styles.actions}>
          <IconButton glyph="↶" label="UNDO" onPress={undo} />
          <IconButton glyph="⟲" label="RESET" onPress={reset} />
          <IconButton
            glyph={adBusy ? '…' : '✦'}
            label="HINT"
            badge="AD"
            onPress={askHint}
          />
          <IconButton
            glyph="?"
            label="GUIDE"
            onPress={() => setTutorial(intros.length ? intros : HOW_TO_PLAY)}
          />
        </View>
      </Animated.View>

      {showResult ? (
        <ResultCard
          name={level.name}
          stars={stars}
          used={used.mirror + used.splitter}
          par={sol.par}
          hinted={hinted}
          last={index === LEVELS.length - 1}
          onNext={onNext}
          onReplay={onReplay}
          onMenu={onBack}
        />
      ) : null}

      {tutorial ? (
        <TutorialOverlay ids={tutorial} onDone={closeTutorial} />
      ) : null}
    </View>
  );
}

function ResultStar({ on, i }: { on: boolean; i: number }) {
  const s = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => sound.star(i, on), 350 + i * 220);
    s.value = withDelay(
      350 + i * 220,
      withTiming(1, { duration: 480, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
    );
    return () => clearTimeout(t);
  }, [s, i, on]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + s.value * 0.2 }],
    opacity: s.value,
  }));
  return (
    <Animated.Text
      style={[
        styles.bigStar,
        i === 1 && styles.bigStarMid,
        {
          color: on ? C.gold : '#262D55',
          textShadowColor: on ? C.gold : 'transparent',
        },
        style,
      ]}
    >
      ★
    </Animated.Text>
  );
}

function ResultCard(props: {
  name: string;
  stars: number;
  used: number;
  par: number;
  hinted: boolean;
  last: boolean;
  onNext: () => void;
  onReplay: () => void;
  onMenu: () => void;
}) {
  const line =
    props.stars === 3
      ? 'Flawless refraction.'
      : props.hinted
      ? 'Solved with a little guidance.'
      : `Solve it with ${props.par} piece${props.par === 1 ? '' : 's'} for ★★★`;
  return (
    <Animated.View entering={FadeIn.duration(350)} style={styles.overlay}>
      <Animated.View entering={softEnter} style={styles.card}>
        <Text style={styles.cardKicker}>
          {props.last ? 'ALL CRYSTALS AWAKE' : 'LIGHT ACHIEVED'}
        </Text>
        <Text style={styles.cardTitle}>{props.name}</Text>
        <View style={styles.starRow}>
          {[0, 1, 2].map(i => (
            <ResultStar key={i} i={i} on={i < props.stars} />
          ))}
        </View>
        <Animated.Text entering={FadeInDown.delay(900)} style={styles.cardLine}>
          {line}
        </Animated.Text>
        <Animated.View
          entering={FadeInDown.delay(1000)}
          style={styles.statsRow}
        >
          <Stat label="PIECES" value={props.used} />
          <Stat label="PAR" value={props.par} />
        </Animated.View>
        <Animated.View
          entering={FadeInDown.delay(1100)}
          style={styles.cardButtons}
        >
          <GlowButton
            small
            variant="ghost"
            label="REPLAY"
            onPress={props.onReplay}
          />
          <GlowButton
            small
            label={props.last ? 'FINISH' : 'NEXT  ›'}
            onPress={props.last ? props.onMenu : props.onNext}
          />
        </Animated.View>
        <ResultBanner />
      </Animated.View>
    </Animated.View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  titleBlock: { flex: 1, alignItems: 'center' },
  kicker: { color: C.dim, fontSize: 10.5, ...FONT.label },
  title: {
    color: C.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  crystalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  crystalDot: {
    width: 10,
    height: 10,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  crystalText: { color: C.dim, fontSize: 11, marginLeft: 4, fontWeight: '700' },
  par: {
    width: 64,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 122, 0.35)',
    backgroundColor: 'rgba(255, 215, 122, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parLabel: { color: C.gold, fontSize: 9.5, ...FONT.label, opacity: 0.8 },
  parValue: { color: C.gold, fontSize: 20, fontWeight: '800' },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: {
    color: C.dim,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 28,
    minHeight: 36,
    fontStyle: 'italic',
  },
  hintActive: { color: C.gold, fontStyle: 'normal', fontWeight: '600' },
  tray: { paddingHorizontal: 14, gap: 12 },
  tools: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 18,
    borderRadius: 18,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 140,
  },
  toolActive: {
    borderColor: '#5FF4FF',
    backgroundColor: 'rgba(61, 242, 255, 0.1)',
    shadowColor: '#3DF2FF',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  toolName: { color: C.text, fontSize: 12, ...FONT.label, letterSpacing: 1.8 },
  toolCount: { color: '#5FF4FF', fontSize: 16, fontWeight: '800' },
  noTools: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.border,
    justifyContent: 'center',
  },
  noToolsText: { color: C.dim, fontSize: 11, ...FONT.label },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 4, 14, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 30,
    paddingVertical: 30,
    paddingHorizontal: 22,
    backgroundColor: 'rgba(14, 19, 48, 0.94)',
    borderWidth: 1,
    borderColor: C.borderStrong,
    alignItems: 'center',
    shadowColor: '#3DF2FF',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  cardKicker: {
    color: '#5FF4FF',
    fontSize: 11,
    ...FONT.label,
    letterSpacing: 4,
  },
  cardTitle: { color: C.text, fontSize: 28, fontWeight: '900', marginTop: 6 },
  starRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 18,
  },
  bigStar: {
    fontSize: 48,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  bigStarMid: { fontSize: 62, marginBottom: 8 },
  cardLine: { color: C.dim, fontSize: 14, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 14, marginTop: 16 },
  stat: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(40, 50, 110, 0.35)',
  },
  statValue: { color: C.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: C.dim, fontSize: 9.5, ...FONT.label },
  cardButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
});

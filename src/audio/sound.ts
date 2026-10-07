// Procedural audio: every sound effect and the soundtrack are synthesized at
// runtime with react-native-audio-api (Web Audio API), so there are no audio
// assets to ship. All public methods are safe to call before init / when muted.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import {
  type AudioBuffer,
  AudioContext,
  type AudioNode,
  type AudioParam,
  type BiquadFilterNode,
  type GainNode,
} from 'react-native-audio-api';
import type { BeamColor, PieceKind } from '../game/engine';

const SETTINGS_KEY = 'lightsit.audio.v1';
const MUSIC_LEVEL = 0.3;
const SFX_LEVEL = 0.9;

// D dorian, voiced for a slow, spacey progression: Dm9 · Bbmaj7 · Fmaj7 · Cadd9
const CHORDS = [
  { bass: 38, notes: [50, 53, 57, 60, 64] },
  { bass: 34, notes: [46, 50, 53, 57] },
  { bass: 41, notes: [53, 57, 60, 64] },
  { bass: 36, notes: [48, 55, 62, 64] },
];
// Pentatonic (D minor) used for twinkles and crystal chimes.
const PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91];
const BPM = 76;
const STEP = 60 / BPM / 2; // eighth note
const STEPS_PER_CHORD = 16;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

type Settings = { music: boolean; sfx: boolean };
type Listener = (s: Settings) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private reverbIn!: GainNode;
  private echoIn!: GainNode;
  private noise!: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private step = 0;
  private lastChime = 0;
  private lastTick = 0;
  settings: Settings = { music: true, sfx: true };
  private listeners = new Set<Listener>();

  /* --------------------------------------------------------- lifecycle */

  async init() {
    if (this.ctx) return;
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) this.settings = { ...this.settings, ...JSON.parse(raw) };
    } catch {}
    this.emit();
    try {
      this.build();
    } catch (e) {
      console.warn('[sound] audio unavailable', e);
      this.ctx = null;
      return;
    }
    AppState.addEventListener('change', state => {
      if (!this.ctx) return;
      if (state === 'active') this.ctx.resume().catch(() => {});
      else this.ctx.suspend().catch(() => {});
    });
    if (this.settings.music) this.startMusic();
  }

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(ctx.destination);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.settings.sfx ? SFX_LEVEL : 0;
    this.sfxBus.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);

    // Shared reverb (synthetic impulse: decaying stereo noise)
    const len = Math.floor(ctx.sampleRate * 1.8);
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      impulse.copyToChannel(data, ch);
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 1;
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.55;
    this.reverbIn.connect(convolver);
    convolver.connect(reverbOut);
    reverbOut.connect(this.master);

    // Dotted-eighth echo with darkening feedback
    this.echoIn = ctx.createGain();
    const delay = ctx.createDelay(2);
    delay.delayTime.value = STEP * 1.5;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    this.echoIn.connect(delay);
    delay.connect(tone);
    tone.connect(fb);
    fb.connect(delay);
    tone.connect(this.master);
    tone.connect(this.reverbIn);

    // One second of white noise, reused by every noisy effect
    const nlen = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const n = new Float32Array(nlen);
    for (let i = 0; i < nlen; i++) n[i] = Math.random() * 2 - 1;
    this.noise.copyToChannel(n, 0);
  }

  /* ---------------------------------------------------------- settings */

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    this.listeners.forEach(l => l(this.settings));
  }
  private save() {
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)).catch(
      () => {},
    );
  }

  setMusic(on: boolean) {
    this.settings = { ...this.settings, music: on };
    this.emit();
    this.save();
    if (on) this.startMusic();
    else this.stopMusic();
  }

  setSfx(on: boolean) {
    this.settings = { ...this.settings, sfx: on };
    this.emit();
    this.save();
    if (this.ctx) {
      this.sfxBus.gain.setTargetAtTime(
        on ? SFX_LEVEL : 0,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  /* --------------------------------------------------------- primitives */

  private get ok() {
    return !!this.ctx && this.settings.sfx;
  }

  private env(
    p: AudioParam,
    t: number,
    peak: number,
    attack: number,
    decay: number,
  ) {
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    p.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private osc(
    type: 'sine' | 'triangle' | 'sawtooth' | 'square',
    freq: number,
    t: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    opts: { attack?: number; glideTo?: number; detune?: number } = {},
  ) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.glideTo)
      o.frequency.exponentialRampToValueAtTime(opts.glideTo, t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    const g = ctx.createGain();
    this.env(g.gain, t, vol, opts.attack ?? 0.004, dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + (opts.attack ?? 0.004) + dur + 0.05);
    return g;
  }

  private burst(
    t: number,
    dur: number,
    vol: number,
    type: 'bandpass' | 'highpass' | 'lowpass',
    from: number,
    to: number,
    q = 1,
    dest: AudioNode = this.sfxBus,
  ) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f: BiquadFilterNode = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    this.env(g.gain, t, vol, 0.006, dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  /** Bell with inharmonic partials; the sound of a crystal. */
  private bell(
    freq: number,
    t: number,
    vol: number,
    dur: number,
    dest: AudioNode,
    wet = 0.5,
  ) {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(dest);
    const send = ctx.createGain();
    send.gain.value = wet;
    out.connect(send);
    send.connect(this.reverbIn);
    const partials: [number, number][] = [
      [1, 1],
      [2, 0.32],
      [2.76, 0.22],
      [5.4, 0.07],
    ];
    partials.forEach(([ratio, amp], i) =>
      this.osc('sine', freq * ratio, t, dur / (1 + i * 0.9), vol * amp, out, {
        attack: 0.003,
      }),
    );
    return out;
  }

  /* ------------------------------------------------------------ effects */

  ui() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    this.osc('sine', 1400, t, 0.05, 0.12, this.sfxBus, { glideTo: 900 });
  }

  place(kind: PieceKind) {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    this.osc('sine', 190, t, 0.12, 0.5, this.sfxBus, { glideTo: 70 });
    this.burst(t, 0.035, 0.35, 'bandpass', 5200, 3200, 2.5);
    if (kind === 'splitter') {
      this.bell(mtof(93), t + 0.02, 0.07, 0.5, this.sfxBus, 0.8);
    } else {
      this.osc('triangle', 2200, t, 0.06, 0.06, this.sfxBus);
    }
  }

  rotate() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    this.burst(t, 0.11, 0.22, 'bandpass', 700, 3600, 3);
    this.osc('triangle', 520, t + 0.02, 0.07, 0.08, this.sfxBus, {
      glideTo: 780,
    });
    this.burst(t + 0.09, 0.03, 0.2, 'bandpass', 4800, 4000, 3);
  }

  remove() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    this.osc('sine', 140, t, 0.16, 0.32, this.sfxBus, { glideTo: 420 });
    this.burst(t, 0.14, 0.12, 'bandpass', 3000, 600, 2);
  }

  tick() {
    if (!this.ok) return;
    const now = Date.now();
    if (now - this.lastTick < 40) return;
    this.lastTick = now;
    this.burst(this.ctx!.currentTime, 0.02, 0.12, 'bandpass', 3800, 3400, 4);
  }

  error() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    this.osc('square', 110, t, 0.09, 0.09, this.sfxBus, { detune: -12 });
    this.osc('square', 116, t, 0.09, 0.09, this.sfxBus);
    this.osc('square', 104, t + 0.11, 0.12, 0.08, this.sfxBus);
  }

  undo() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    this.burst(t, 0.12, 0.18, 'bandpass', 3400, 700, 3);
    this.osc('sine', 660, t, 0.1, 0.07, this.sfxBus, { glideTo: 420 });
  }

  reset() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    this.burst(t, 0.35, 0.22, 'lowpass', 6000, 200, 6);
    this.osc('sawtooth', 300, t, 0.3, 0.05, this.sfxBus, { glideTo: 60 });
  }

  hint() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    [86, 89, 93, 98].forEach((m, i) =>
      this.bell(mtof(m), t + i * 0.06, 0.06, 0.6, this.echoIn, 0.6),
    );
  }

  /** Laser ignition when a level begins. */
  ignite() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.25;
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.22);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.6);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 6;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(3000, t + 0.2);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    const g = ctx.createGain();
    this.env(g.gain, t, 0.22, 0.03, 0.6);
    o.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    g.connect(this.echoIn);
    o.start(t);
    o.stop(t + 0.7);
    this.osc('sine', 55, t, 0.5, 0.35, this.sfxBus, { attack: 0.05 });
  }

  /** A crystal waking up. `order` climbs the scale as more crystals light. */
  crystal(color: BeamColor, order: number) {
    if (!this.ok) return;
    const now = Date.now();
    if (now - this.lastChime < 70) return;
    this.lastChime = now;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const base = color === 'amber' ? 3 : color === 'magenta' ? 5 : 4;
    const m = PENTA[Math.min(PENTA.length - 1, base + order * 2)];
    const f = mtof(m);

    // 1. Impact: the beam striking the facet
    this.burst(t, 0.04, 0.32, 'highpass', 3500, 9000, 0.9);
    this.osc('triangle', 3200, t, 0.09, 0.09, this.sfxBus, { glideTo: 700 });

    // 2. Body: FM bell, each colour has its own glassy timbre
    const ratio = color === 'cyan' ? 3.5 : color === 'magenta' ? 1.414 : 2.01;
    this.fmBell(f, ratio, t, 2.2, 0.2);

    // 3. Shimmer: detuned octave pair that beats slowly
    for (const detune of [-9, 9]) {
      this.osc('sine', f * 2, t + 0.01, 1.4, 0.035, this.echoIn, {
        attack: 0.02,
        detune,
      });
    }

    // 4. Sparkle: quick ascending run, bouncing across the stereo field
    for (let i = 0; i < 5; i++) {
      const note = PENTA[Math.min(PENTA.length - 1, base + order * 2 + 3 + i)];
      const pan = ctx.createStereoPanner();
      pan.pan.value = i % 2 ? 0.7 : -0.7;
      pan.connect(this.sfxBus);
      this.bell(mtof(note + 12), t + 0.05 + i * 0.038, 0.035, 0.45, pan, 0.9);
    }

    // 5. Sub thump for weight
    this.osc('sine', 120, t, 0.28, 0.3, this.sfxBus, { glideTo: 48 });

    // 6. Air: bright noise swell into the reverb
    this.burst(
      t + 0.02,
      0.6,
      0.06,
      'bandpass',
      5000,
      12000,
      1.2,
      this.reverbIn,
    );
  }

  /** Two-operator FM bell: modulation index decays for a glassy "ting". */
  private fmBell(
    freq: number,
    ratio: number,
    t: number,
    dur: number,
    vol: number,
  ) {
    const ctx = this.ctx!;
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = freq;
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = freq * ratio;
    const modDepth = ctx.createGain();
    modDepth.gain.setValueAtTime(freq * 3.2, t);
    modDepth.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur * 0.5);
    mod.connect(modDepth);
    modDepth.connect(carrier.frequency);
    const g = ctx.createGain();
    this.env(g.gain, t, vol, 0.003, dur);
    carrier.connect(g);
    g.connect(this.sfxBus);
    const send = ctx.createGain();
    send.gain.value = 0.6;
    g.connect(send);
    send.connect(this.reverbIn);
    carrier.start(t);
    mod.start(t);
    carrier.stop(t + dur + 0.1);
    mod.stop(t + dur + 0.1);
  }

  crystalOff() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    this.osc('sine', 520, t, 0.22, 0.06, this.sfxBus, { glideTo: 260 });
  }

  win() {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + 0.05;
    this.duck(1.8);
    // Sub swell + shimmer sweep
    this.osc('sine', 73.4, t, 1.6, 0.45, this.sfxBus, { attack: 0.08 });
    this.burst(t, 1.2, 0.1, 'bandpass', 1500, 9000, 1.5, this.reverbIn);
    // Rising pentatonic arpeggio into a held chord
    [62, 65, 69, 74, 77, 81, 86].forEach((m, i) =>
      this.bell(mtof(m), t + i * 0.075, 0.11, 1.1, this.sfxBus, 0.7),
    );
    [74, 77, 81, 84].forEach(m =>
      this.osc('triangle', mtof(m), t + 0.55, 1.6, 0.045, this.sfxBus, {
        attack: 0.15,
      }),
    );
  }

  star(i: number, earned: boolean) {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    if (earned) {
      this.bell(mtof([81, 86, 93][i] ?? 93), t, 0.14, 1.2, this.sfxBus, 0.8);
      this.burst(t, 0.18, 0.06, 'highpass', 7000, 11000, 0.7);
    } else {
      this.osc('sine', 300, t, 0.15, 0.06, this.sfxBus, { glideTo: 200 });
    }
  }

  /* -------------------------------------------------------------- music */

  private duck(seconds: number) {
    if (!this.ctx || !this.settings.music) return;
    const t = this.ctx.currentTime;
    const g = this.musicBus.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(MUSIC_LEVEL * 0.25, t, 0.08);
    g.setTargetAtTime(MUSIC_LEVEL, t + seconds, 0.8);
  }

  startMusic() {
    if (!this.ctx || this.timer || !this.settings.music) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(MUSIC_LEVEL, t, 1.2);
    this.step = 0;
    this.nextStepTime = t + 0.15;
    this.timer = setInterval(() => this.schedule(), 120);
  }

  stopMusic() {
    if (!this.ctx) return;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(0, t, 0.4);
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    // If the app was suspended, don't try to catch up on missed steps.
    if (this.nextStepTime < ctx.currentTime - 1)
      this.nextStepTime = ctx.currentTime + 0.05;
    while (this.nextStepTime < ctx.currentTime + 0.6) {
      this.playStep(this.step, this.nextStepTime);
      this.step++;
      this.nextStepTime += STEP;
    }
  }

  private playStep(step: number, t: number) {
    const inChord = step % STEPS_PER_CHORD;
    const chord = CHORDS[Math.floor(step / STEPS_PER_CHORD) % CHORDS.length];
    const chordLen = STEP * STEPS_PER_CHORD;

    if (inChord === 0) {
      this.pad(chord.notes, t, chordLen);
      this.osc(
        'sine',
        mtof(chord.bass),
        t,
        chordLen * 0.95,
        0.3,
        this.musicBus,
        {
          attack: 0.9,
        },
      );
    }
    // Soft pulse on the off-beats keeps a sense of motion.
    if (inChord % 4 === 2) {
      this.osc('sine', mtof(chord.bass + 12), t, 0.35, 0.06, this.musicBus, {
        attack: 0.02,
      });
    }
    // Twinkling stars: sparse random pentatonic plucks through the echo.
    if (Math.random() < (inChord % 2 === 0 ? 0.28 : 0.12)) {
      const m = pick(PENTA.slice(4));
      this.bell(
        mtof(m),
        t,
        0.035 + Math.random() * 0.03,
        1.4,
        this.echoIn,
        0.9,
      );
    }
    // Occasional low "radio" sweep every few chords
    if (step % (STEPS_PER_CHORD * 4) === STEPS_PER_CHORD * 2 + 4) {
      this.burst(t, 3, 0.05, 'bandpass', 300, 2400, 8, this.reverbIn);
    }
  }

  private pad(notes: number[], t: number, len: number) {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(380, t);
    filter.frequency.linearRampToValueAtTime(1100, t + len * 0.55);
    filter.frequency.linearRampToValueAtTime(500, t + len + 1.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 2.2);
    g.gain.setValueAtTime(0.11, t + len - 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 2.4);
    filter.connect(g);
    g.connect(this.musicBus);
    const send = ctx.createGain();
    send.gain.value = 0.5;
    g.connect(send);
    send.connect(this.reverbIn);
    for (const m of notes) {
      for (const detune of [-8, 8]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(m);
        o.detune.value = detune + (Math.random() - 0.5) * 4;
        o.connect(filter);
        o.start(t);
        o.stop(t + len + 2.6);
      }
    }
  }
}

export const sound = new SoundEngine();

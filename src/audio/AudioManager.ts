/**
 * Minimal procedural sound-effects layer (§8). Sounds are synthesised with the
 * Web Audio API so the game ships with no binary audio assets. All playback is
 * scaled by a master `volume` (0–1), persisted via the save layer (§4.5).
 *
 * Kept behind this small class so it can be swapped for sampled assets later
 * without touching gameplay code.
 */
export type SoundId =
  | 'place'
  | 'invalid'
  | 'hit'
  | 'arrowHit'
  | 'cannonHit'
  | 'frostHit'
  | 'sniperHit'
  | 'leak'
  | 'waveStart'
  | 'win'
  | 'lose';

interface Tone {
  freq: number;
  durationMs: number;
  type: OscillatorType;
  /** Peak gain before the master volume is applied. */
  gain: number;
}

const TONES: Record<SoundId, Tone> = {
  place: { freq: 440, durationMs: 90, type: 'square', gain: 0.25 },
  invalid: { freq: 140, durationMs: 160, type: 'sawtooth', gain: 0.25 },
  hit: { freq: 660, durationMs: 50, type: 'triangle', gain: 0.14 },
  arrowHit: { freq: 880, durationMs: 40, type: 'triangle', gain: 0.12 },
  cannonHit: { freq: 120, durationMs: 120, type: 'sawtooth', gain: 0.2 },
  frostHit: { freq: 1200, durationMs: 80, type: 'sine', gain: 0.12 },
  sniperHit: { freq: 1500, durationMs: 60, type: 'square', gain: 0.14 },
  leak: { freq: 200, durationMs: 220, type: 'sawtooth', gain: 0.3 },
  waveStart: { freq: 520, durationMs: 180, type: 'square', gain: 0.25 },
  win: { freq: 784, durationMs: 320, type: 'triangle', gain: 0.3 },
  lose: { freq: 120, durationMs: 480, type: 'sawtooth', gain: 0.3 },
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private volume: number;
  private sampleBuffers = new Map<string, AudioBuffer>();
  private sampleLoading = new Set<string>();
  private supported: boolean;

  constructor(volume = 1) {
    this.volume = clamp01(volume);
    this.supported =
      typeof window !== 'undefined' &&
      typeof (window.AudioContext ?? (window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext) === 'function';
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(volume: number): void {
    this.volume = clamp01(volume);
  }

  /**
   * Resume the audio context after a user gesture (browsers block autoplay).
   * Safe to call repeatedly.
   */
  unlock(): void {
    const ctx = this.ensureCtx();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  private playSample(url: string): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    if (this.sampleBuffers.has(url)) {
      const buf = this.sampleBuffers.get(url)!;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      gain.gain.value = this.volume;
      src.connect(gain).connect(ctx.destination);
      src.start();
      return;
    }
    if (this.sampleLoading.has(url)) return;
    this.sampleLoading.add(url);
    fetch(url).then(r => r.arrayBuffer()).then(ab => ctx.decodeAudioData(ab)).then(buf => {
      this.sampleBuffers.set(url, buf);
      this.sampleLoading.delete(url);
    }).catch(() => this.sampleLoading.delete(url));
  }

  play(id: SoundId): void {
    if (!this.supported || this.volume <= 0) return;
    if (id === 'cannonHit') { this.playSample('/media/canon-1.mp3'); return; }
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const tone = TONES[id];
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, now);

    const peak = tone.gain * this.volume;
    const end = now + tone.durationMs / 1000;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(end);
  }

  private ensureCtx(): AudioContext | null {
    if (!this.supported) return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

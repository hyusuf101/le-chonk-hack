import { TTS_SAMPLE_RATE } from './config';
import { getAudioContext } from './context';

export interface Clip {
  /** raw PCM16 mono 24 kHz; empty or unreachable plays the station chime instead */
  url: string;
  /** called when the clip starts, with its length so captions can match it */
  onStart?: (durationMs: number) => void;
  onEnd?: () => void;
}

const MAX_QUEUED = 2;
const queue: Clip[] = [];
let playing = false;

async function load(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Clip ${res.status}`);
  const bytes = await res.arrayBuffer();
  const pcm = new Int16Array(bytes, 0, Math.floor(bytes.byteLength / 2));
  const buffer = ctx.createBuffer(1, Math.max(1, pcm.length), TTS_SAMPLE_RATE);
  const out = buffer.getChannelData(0);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 0x8000;
  return buffer;
}

/** Two soft falling notes, like a station's attention chime. */
function chime(ctx: AudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const notes = [
    { f: 784, start: 0, len: 0.42 },
    { f: 587, start: 0.36, len: 0.6 },
  ];
  const buffer = ctx.createBuffer(1, Math.ceil(rate * 1.0), rate);
  const out = buffer.getChannelData(0);
  for (const n of notes) {
    const s0 = Math.floor(n.start * rate);
    const len = Math.floor(n.len * rate);
    for (let i = 0; i < len && s0 + i < out.length; i++) {
      const t = i / rate;
      const env = Math.min(1, t / 0.01) * Math.exp(-t * 5);
      out[s0 + i] += 0.22 * env * (Math.sin(2 * Math.PI * n.f * t) + 0.3 * Math.sin(4 * Math.PI * n.f * t));
    }
  }
  return buffer;
}

async function playNext(): Promise<void> {
  const clip = queue.shift();
  if (!clip) {
    playing = false;
    return;
  }
  playing = true;
  const ctx = getAudioContext();
  const finish = () => {
    clip.onEnd?.();
    void playNext();
  };

  // Audio not unlocked yet (no tap since load): still show the caption, just silently.
  if (ctx.state !== 'running') {
    clip.onStart?.(0);
    window.setTimeout(finish, 0);
    return;
  }

  let buffer: AudioBuffer;
  try {
    buffer = clip.url ? await load(ctx, clip.url) : chime(ctx);
  } catch {
    buffer = chime(ctx);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.onended = finish;
  clip.onStart?.(buffer.duration * 1000);
  src.start();
}

/** Plays clips one at a time; drops new ones while more than two are waiting. */
export function playClip(clip: Clip): void {
  if (queue.length >= MAX_QUEUED) return;
  queue.push(clip);
  if (!playing) void playNext();
}

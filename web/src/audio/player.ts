import { TTS_SAMPLE_RATE } from './config';
import { getAudioContext } from './context';

const MAX_QUEUED = 2;
const queue: string[] = [];
let playing = false;
let active: AudioBufferSourceNode | null = null;
let playback = 0;

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

async function playNext(): Promise<void> {
  const url = queue.shift();
  if (!url) {
    playing = false;
    return;
  }
  playing = true;
  const version = playback;
  try {
    const ctx = getAudioContext();
    if (ctx.state !== 'running') await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = await load(ctx, url);
    if (version !== playback) return;
    active = src;
    src.connect(ctx.destination);
    src.onended = () => {
      active = null;
      void playNext();
    };
    src.start();
  } catch {
    // Missing or unplayable clip: stay quiet rather than make a noise that means nothing.
    if (version === playback) void playNext();
  }
}

/** Plays raw PCM16 mono 24 kHz display announcement clips one at a time; drops extras. */
export function playClip(url: string): void {
  if (!url || queue.length >= MAX_QUEUED) return;
  queue.push(url);
  if (!playing) void playNext();
}

export function stopClips(): void {
  playback++;
  queue.length = 0;
  if (active) {
    active.onended = null;
    active.stop();
    active.disconnect();
    active = null;
  }
  playing = false;
}

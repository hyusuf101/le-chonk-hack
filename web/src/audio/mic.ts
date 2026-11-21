import workletUrl from './worklet.js?url';
import { MIC_FRAME_SAMPLES, MIC_SAMPLE_RATE } from './config';
import { getAudioContext } from './context';

export interface MicSession {
  stop(): void;
}

/** The mic is blocked, missing, or the page isn't a secure context (phones need HTTPS). */
export class MicUnavailableError extends Error {}

const loaded = new WeakSet<AudioContext>();

/** Starts capturing; every ~100 ms of 16 kHz mono PCM16 goes to `onFrame`. */
export async function startMic(onFrame: (frame: ArrayBuffer) => void): Promise<MicSession> {
  const ctx = getAudioContext();
  if (!navigator.mediaDevices?.getUserMedia) throw new MicUnavailableError('No mic access on this page');

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (err) {
    throw new MicUnavailableError(err instanceof Error ? err.message : 'Mic denied');
  }

  try {
    if (!loaded.has(ctx)) {
      await ctx.audioWorklet.addModule(workletUrl);
      loaded.add(ctx);
    }
    if (ctx.state === 'suspended') await ctx.resume();
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    throw new MicUnavailableError(err instanceof Error ? err.message : 'Audio unavailable');
  }

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'pcm-downsampler', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 1,
    processorOptions: { targetRate: MIC_SAMPLE_RATE, frameSamples: MIC_FRAME_SAMPLES },
  });
  // Keep the node pulled by the graph without making a sound.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(node).connect(mute).connect(ctx.destination);
  node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => onFrame(e.data);

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
      mute.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

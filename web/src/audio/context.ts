let ctx: AudioContext | null = null;

/** One shared AudioContext for the mic and the announcer. */
export function getAudioContext(): AudioContext {
  ctx ??= new AudioContext({ latencyHint: 'interactive' });
  return ctx;
}

/** Call synchronously inside a tap: iOS only lets audio start from a user gesture. */
export function unlockAudio(): void {
  const c = getAudioContext();
  if (c.state === 'suspended') void c.resume();
}

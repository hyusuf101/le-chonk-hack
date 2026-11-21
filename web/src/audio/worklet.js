// Audio thread: box-filter downsamples the mic to the target rate and posts PCM16 little-endian
// frames of `frameSamples` samples to the main thread.
class PcmDownsampler extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { targetRate, frameSamples } = options.processorOptions;
    this.ratio = sampleRate / targetRate;
    this.frameSamples = frameSamples;
    this.frame = new Int16Array(frameSamples);
    this.filled = 0;
    this.acc = 0;
    this.count = 0;
    this.phase = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      this.acc += channel[i];
      this.count += 1;
      this.phase += 1;
      if (this.phase < this.ratio) continue;
      this.phase -= this.ratio;
      const s = Math.max(-1, Math.min(1, this.acc / this.count));
      this.frame[this.filled++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      this.acc = 0;
      this.count = 0;
      if (this.filled === this.frameSamples) {
        // Int16Array is little-endian on every platform browsers run on.
        this.port.postMessage(this.frame.buffer, [this.frame.buffer]);
        this.frame = new Int16Array(this.frameSamples);
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-downsampler', PcmDownsampler);

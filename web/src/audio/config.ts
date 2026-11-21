/** Mic frames sent to the server: mono PCM16 little-endian. */
export const MIC_SAMPLE_RATE = 16000;
/** Announcer / voiceover clips from the server: raw mono PCM16 little-endian, no header. */
export const TTS_SAMPLE_RATE = 24000;
/** ~100 ms per binary frame. */
export const MIC_FRAME_SAMPLES = MIC_SAMPLE_RATE / 10;
/** A talk session stops on its own after this. */
export const TALK_MAX_MS = 15_000;

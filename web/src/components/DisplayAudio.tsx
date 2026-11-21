import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { unlockAudio } from '../audio/context';
import { playClip, stopClips } from '../audio/player';
import { useStore } from '../state/store';

export function DisplayAudio() {
  const { state } = useStore();
  const [enabled, setEnabled] = useState(false);
  const seen = useRef(0);
  const announcement = state.announcement;
  useEffect(() => {
    if (!announcement || seen.current === announcement.seq) return;
    seen.current = announcement.seq;
    if (!enabled) return;
    const { url, caption } = announcement.msg;
    if (url) playClip(url);
    else if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance(caption);
      speech.lang = 'en-GB';
      window.speechSynthesis.speak(speech);
    }
  }, [announcement, enabled]);

  return <button type="button" className="pill" aria-pressed={enabled} onClick={() => {
    if (enabled) {
      stopClips();
      window.speechSynthesis?.cancel();
    } else unlockAudio();
    setEnabled(!enabled);
  }}>
    {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
    {enabled ? 'Sound on' : 'Enable announcements'}
  </button>;
}

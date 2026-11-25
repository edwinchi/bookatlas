import { useEffect, useState } from 'react';

/** Real voices installed on this device/browser. The Web Speech API exposes name and language only, never gender. */
export function useDeviceVoices() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  // Some phones throw from getVoices() while the speech engine starts, or list a voice without a language.
  const read = () => { try { return supported ? window.speechSynthesis.getVoices().filter((v) => !!v?.lang && !!v.name) : []; } catch { return []; } };
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(read);
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const update = () => setVoices(read());
    update();
    synth.addEventListener('voiceschanged', update);
    return () => synth.removeEventListener('voiceschanged', update);
  }, [supported]);
  return { supported, voices };
}

/** Prefer a voice matching the app/page language (English or Dutch), then any English voice. */
export function pickDefaultDeviceVoice(voices: SpeechSynthesisVoice[], preferredLang?: string) {
  const page = (preferredLang || (typeof document !== 'undefined' && document.documentElement.lang) || (typeof navigator !== 'undefined' && navigator.language) || 'en').toLowerCase();
  const base = page.startsWith('nl') ? 'nl' : 'en';
  return (
    voices.find((v) => v.lang.toLowerCase() === page && v.default) ||
    voices.find((v) => v.lang.toLowerCase() === page) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base) && v.default) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
    voices[0]
  );
}

export const deviceVoiceLabel = (v: SpeechSynthesisVoice) => `${v.name} (${v.lang})${v.localService ? '' : ' - network'}`;

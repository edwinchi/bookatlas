import { useEffect, useState } from 'react';

/** Real voices installed on this device/browser. The Web Speech API exposes name and language only, never gender. */
export function useDeviceVoices() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => (supported ? window.speechSynthesis.getVoices() : []));
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const update = () => setVoices(synth.getVoices());
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

/** Curated Gemini studio voices. Gender/style follow Google's published voice catalog. */
export const STUDIO_VOICES = [
  { id: 'Sulafat', name: 'Sulafat', gender: 'Female', style: 'Warm', recommended: true,
    direction: 'Warm, natural and expressive audiobook narration with measured pacing and clear diction.' },
  { id: 'Charon', name: 'Charon', gender: 'Male', style: 'Informative', recommended: true,
    direction: 'Calm, informative and expressive audiobook narration with measured pacing and clear diction.' },
  { id: 'Kore', name: 'Kore', gender: 'Female', style: 'Firm', recommended: false,
    direction: 'Confident, clear audiobook narration with natural phrasing and measured pacing.' },
  { id: 'Puck', name: 'Puck', gender: 'Male', style: 'Upbeat', recommended: false,
    direction: 'Engaging, upbeat audiobook narration with clear diction and controlled, natural pacing.' },
  { id: 'Aoede', name: 'Aoede', gender: 'Female', style: 'Breezy', recommended: false,
    direction: 'Light, relaxed audiobook narration with natural phrasing and clear diction.' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', style: 'Excitable', recommended: false,
    direction: 'Lively, expressive audiobook narration with clear diction and controlled pacing.' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female', style: 'Bright', recommended: false,
    direction: 'Bright, articulate audiobook narration with natural phrasing and measured pacing.' },
] as const;

export type StudioVoiceId = typeof STUDIO_VOICES[number]['id'];
export const DEFAULT_FEMALE_VOICE: StudioVoiceId = 'Sulafat';
export const DEFAULT_MALE_VOICE: StudioVoiceId = 'Charon';
export const STUDIO_SPEECH_MODEL = 'gemini-3.8-flash-tts';

export function studioVoice(value: string) {
  return STUDIO_VOICES.find(voice => voice.id === value);
}

export function narrationDirection(voiceId: string) {
  const voice = studioVoice(voiceId);
  if (!voice) throw new Error('Unsupported studio voice.');
  return `${voice.direction} Keep the same vocal identity and recording tone throughout. Read the supplied script exactly, without additions, explanations, sound effects or background music. Pronounce the script in its written language.`;
}

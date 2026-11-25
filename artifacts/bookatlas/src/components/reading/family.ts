import { useEffect, useState } from 'react';

/**
 * Family reading (Reading Intelligence phase 2, 2026-11-25), on the reader's side: who is reading on this device,
 * and the family's profiles and progress as the server returns them.
 */

export type ProfileKind = 'adult' | 'teen' | 'child' | 'early';
export interface FamilyProfile { id: string; name: string; kind: ProfileKind; color: string; level: number; createdAt: string }
export interface ProfileSummary {
  id: string; weekMinutes: number; todayMinutes: number; totalMinutes: number; words: number; streak: number; books: number;
  quizAverage: number | null; quizzes: number; stars: number; last14: { day: string; minutes: number }[];
}
export interface FamilyView {
  profiles: FamilyProfile[];
  challenge: { weeklyMinutes: number; weekMinutes: number; weekStart: string; met: boolean };
  summaries: ProfileSummary[];
  maxProfiles: number;
}
export interface FamilyActivity { profileId?: string; minutes?: number; words?: number; bookId?: string; quiz?: { score: number; total: number }; stars?: number }

export const ME = 'me';
export const KIND_LABELS: Record<ProfileKind, string> = { adult: 'Adult', teen: 'Teen (13–18)', child: 'Child (5–12)', early: 'First words (0–4)' };
export const PROFILE_COLORS = ['indigo', 'rose', 'amber', 'emerald', 'sky', 'violet', 'orange', 'teal'] as const;
/** Tailwind classes per profile colour (listed in full so Tailwind keeps them). */
export const COLOR_CLASSES: Record<string, { bg: string; soft: string; text: string; ring: string }> = {
  indigo: { bg: 'bg-indigo-600', soft: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200' },
  rose: { bg: 'bg-rose-600', soft: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200' },
  amber: { bg: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
  emerald: { bg: 'bg-emerald-600', soft: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  sky: { bg: 'bg-sky-600', soft: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200' },
  violet: { bg: 'bg-violet-600', soft: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200' },
  orange: { bg: 'bg-orange-500', soft: 'bg-orange-50', text: 'text-orange-800', ring: 'ring-orange-200' },
  teal: { bg: 'bg-teal-600', soft: 'bg-teal-50', text: 'text-teal-700', ring: 'ring-teal-200' },
};
export const colorOf = (c?: string) => COLOR_CLASSES[c ?? ''] ?? COLOR_CLASSES.indigo!;
export const newProfileId = () => `p-${Math.random().toString(36).slice(2, 10)}`;

const KEY = 'bookatlas:active-reader:v1';
const EVENT = 'bookatlas:active-reader';
/** The profile reading on this device: a family member's id, or "me" (the account holder). */
export function activeReader(): { id: string; name: string; kind: ProfileKind } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v.id === 'string' && v.id !== ME && typeof v.name === 'string') return { id: v.id, name: v.name, kind: v.kind ?? 'child' };
  } catch { /* the account holder */ }
  return { id: ME, name: '', kind: 'adult' };
}
export function setActiveReader(p: { id: string; name: string; kind: ProfileKind } | null) {
  try { if (!p || p.id === ME) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* this device only */ }
  window.dispatchEvent(new Event(EVENT));
}
export function useActiveReader() {
  const [reader, setReader] = useState(activeReader);
  useEffect(() => {
    const update = () => setReader(activeReader());
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  return reader;
}

/** The explain level and Fast Read speed that suit a profile. */
export const defaultsFor = (kind: ProfileKind) => ({
  explain: kind === 'child' || kind === 'early' ? 'child' as const : kind === 'teen' ? 'student' as const : 'student' as const,
  wpm: kind === 'early' ? 100 : kind === 'child' ? 150 : kind === 'teen' ? 250 : 300,
});

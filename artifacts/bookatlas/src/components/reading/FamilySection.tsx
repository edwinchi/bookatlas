import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as ProgressBar from '@radix-ui/react-progress';
import { Check, ChevronDown, Compass, Crown, Flame, Gauge, Library, Loader2, Pencil, Plus, Star, Target, Trash2, Trophy, UserRound, Users, X, Zap } from 'lucide-react';
import { useAccount } from '../../auth/AuthContext';
import { useEbookApi } from '../ebook/ebookApi';
import { SelectBox } from '../ui/select-box';
import { setFastReadSpeed } from '../reader/FastReadPanel';
import type { SpeedTest } from '../reader/fastRead';
import { nextStep } from './coach';
import {
  KIND_LABELS, ME, PROFILE_COLORS, colorOf, newProfileId, setActiveReader, useActiveReader,
  type FamilyProfile, type FamilyView, type ProfileKind, type ProfileSummary,
} from './family';

const BASE = import.meta.env.BASE_URL;
const SIGN_IN = `${BASE}sign-in?redirect_url=${encodeURIComponent(`${BASE}reading-intelligence#family`)}`;
const item = 'flex-1 rounded-lg px-2 py-2 text-xs font-bold text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';

/** The family as the server keeps it, for a signed-in account. */
export function useFamily() {
  const { account } = useAccount();
  const api = useEbookApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const [family, setFamily] = useState<FamilyView | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    if (!account) return;
    apiRef.current.family().then(setFamily).catch((e) => setError(e instanceof Error ? e.message : 'Family reading could not be loaded.'));
  }, [account]);
  useEffect(() => { load(); }, [load]);
  const save = useCallback(async (profiles: FamilyProfile[], weeklyMinutes?: number) => {
    setError('');
    try {
      const next = await apiRef.current.saveFamily({ profiles, ...(weeklyMinutes ? { challenge: { weeklyMinutes } } : {}) });
      setFamily(next);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'The change could not be saved.'); return false; }
  }, []);
  return { signedIn: !!account, accountName: account?.name ?? 'Me', family, error, save, reload: load };
}

function Avatar({ name, color, size = 'h-10 w-10 text-base' }: { name: string; color?: string; size?: string }) {
  return <span className={`grid shrink-0 place-items-center rounded-full font-extrabold text-white ${colorOf(color).bg} ${size}`} aria-hidden>{(name.trim()[0] ?? '?').toUpperCase()}</span>;
}

/** "Who is reading?": the profile whose reading, quizzes and stars count on this device. */
export function WhoIsReading({ family, accountName, dark }: { family: FamilyView | null; accountName: string; dark?: boolean }) {
  const reader = useActiveReader();
  const profiles = family?.profiles ?? [];
  const current = reader.id === ME ? null : profiles.find((p) => p.id === reader.id) ?? null;
  // A profile removed on another device: back to the account holder.
  useEffect(() => { if (family && reader.id !== ME && !current) setActiveReader(null); }, [family, reader.id, current]);
  if (!profiles.length) return null;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" data-testid="who-is-reading" className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 cursor-pointer ${dark ? 'bg-white/10 text-white ring-white/25 hover:bg-white/20' : 'bg-white text-slate-800 ring-slate-200 hover:bg-slate-50'}`}>
          <Avatar name={current?.name ?? accountName} color={current?.color} size="h-7 w-7 text-xs" />
          Reading as {current?.name ?? 'me'}<ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-50 min-w-60 rounded-2xl bg-white p-1.5 text-slate-800 shadow-2xl ring-1 ring-slate-900/10">
          <DropdownMenu.Label className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Who is reading on this device?</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={reader.id} onValueChange={(id) => { const p = profiles.find((x) => x.id === id); setActiveReader(p ? { id: p.id, name: p.name, kind: p.kind } : null); }}>
            <DropdownMenu.RadioItem value={ME} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none data-[highlighted]:bg-indigo-50">
              <Avatar name={accountName} size="h-7 w-7 text-xs" />Me ({accountName})<DropdownMenu.ItemIndicator className="ml-auto"><Check className="h-4 w-4 text-indigo-600" /></DropdownMenu.ItemIndicator>
            </DropdownMenu.RadioItem>
            {profiles.map((p) => (
              <DropdownMenu.RadioItem key={p.id} value={p.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none data-[highlighted]:bg-indigo-50">
                <Avatar name={p.name} color={p.color} size="h-7 w-7 text-xs" />{p.name}<span className="text-xs text-slate-400">{KIND_LABELS[p.kind].split(' ')[0]}</span>
                <DropdownMenu.ItemIndicator className="ml-auto"><Check className="h-4 w-4 text-indigo-600" /></DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <p className="px-3 py-2 text-[11px] text-slate-500">Reading time, quizzes and stars count for this reader until you switch.</p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Add or edit a reader profile. */
function ProfileDialog({ open, onOpenChange, profile, onSave, busy }: {
  open: boolean; onOpenChange: (o: boolean) => void; profile: FamilyProfile | null; busy: boolean;
  onSave: (p: FamilyProfile) => void;
}) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ProfileKind>('child');
  const [color, setColor] = useState<string>('rose');
  const [level, setLevel] = useState(1);
  useEffect(() => {
    if (!open) return;
    setName(profile?.name ?? ''); setKind(profile?.kind ?? 'child'); setColor(profile?.color ?? PROFILE_COLORS[1]); setLevel(profile?.level ?? 1);
  }, [open, profile]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: profile?.id ?? newProfileId(), name: name.trim().slice(0, 30), kind, color, level, createdAt: profile?.createdAt ?? new Date().toISOString() });
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl outline-none data-[state=open]:animate-sheet-up sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[28rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-slate-900">{profile ? `Edit ${profile.name}` : 'Add a reader'}</Dialog.Title>
            <Dialog.Close aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-slate-500">A first name or nickname is enough. Only your family sees it.</Dialog.Description>
          <form onSubmit={submit} className="mt-5 space-y-5">
            <label className="block text-sm font-bold text-slate-800">Name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required autoFocus data-testid="profile-name"
                className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </label>
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-slate-800">Reader</p>
              <ToggleGroup.Root type="single" value={kind} onValueChange={(v) => v && setKind(v as ProfileKind)} aria-label="Kind of reader" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {(Object.keys(KIND_LABELS) as ProfileKind[]).map((k) => <ToggleGroup.Item key={k} value={k} className={item}>{KIND_LABELS[k]}</ToggleGroup.Item>)}
              </ToggleGroup.Root>
            </div>
            {(kind === 'child' || kind === 'early') && (
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-slate-800">Reading level for Young readers</p>
                <ToggleGroup.Root type="single" value={String(level)} onValueChange={(v) => v && setLevel(Number(v))} aria-label="Reading level" className="flex gap-1 rounded-xl bg-slate-100 p-1">
                  {[1, 2, 3].map((l) => <ToggleGroup.Item key={l} value={String(l)} className={item}>Level {l}</ToggleGroup.Item>)}
                </ToggleGroup.Root>
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-slate-800">Colour</p>
              <ToggleGroup.Root type="single" value={color} onValueChange={(v) => v && setColor(v)} aria-label="Colour" className="flex flex-wrap gap-2">
                {PROFILE_COLORS.map((c) => (
                  <ToggleGroup.Item key={c} value={c} aria-label={c} className={`h-9 w-9 rounded-full ${colorOf(c).bg} ring-offset-2 data-[state=on]:ring-2 data-[state=on]:ring-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer`} />
                ))}
              </ToggleGroup.Root>
            </div>
            <button type="submit" disabled={busy || !name.trim()} data-testid="profile-save"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}{profile ? 'Save' : 'Add reader'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MiniBars({ days, color }: { days: ProfileSummary['last14']; color?: string }) {
  const max = Math.max(10, ...days.map((d) => d.minutes));
  return (
    <div className="flex h-10 items-end gap-[2px]" role="img" aria-label={`Minutes read in the last 14 days: ${days.map((d) => d.minutes).join(', ')}`}>
      {days.map((d) => <div key={d.day} className={`flex-1 rounded-t-[3px] ${d.minutes ? colorOf(color).bg : 'bg-slate-200'}`} style={{ height: `${d.minutes ? Math.max(8, (d.minutes / max) * 100) : 6}%` }} title={`${d.day}: ${d.minutes} min`} />)}
    </div>
  );
}

/** The family dashboard: profiles, the weekly challenge and this week's ranking. */
export function FamilyPanel({ fam }: { fam: ReturnType<typeof useFamily> }) {
  const reader = useActiveReader();
  const [editing, setEditing] = useState<FamilyProfile | null>(null);
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<FamilyProfile | null>(null);
  if (!fam.signedIn) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-100 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-indigo-950">Sign in to add up to six readers to your account, follow each one’s reading and stars, and set a family challenge.</p>
        <a href={SIGN_IN} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-500">Sign in</a>
      </div>
    );
  }
  const f = fam.family;
  if (!f) return fam.error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{fam.error}</p> : <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading your family…</p>;
  const sum = (id: string) => f.summaries.find((s) => s.id === id)!;
  const people = [{ id: ME, name: fam.accountName, kind: 'adult' as ProfileKind, color: 'indigo' }, ...f.profiles];
  const ranking = [...people].map((p) => ({ ...p, week: sum(p.id)?.weekMinutes ?? 0 })).sort((a, b) => b.week - a.week);
  const pct = Math.min(100, Math.round((f.challenge.weekMinutes / Math.max(1, f.challenge.weeklyMinutes)) * 100));
  const saveProfile = async (p: FamilyProfile) => {
    setBusy(true);
    const list = f.profiles.some((x) => x.id === p.id) ? f.profiles.map((x) => (x.id === p.id ? p : x)) : [...f.profiles, p];
    if (await fam.save(list)) { setDialog(false); if (reader.id === p.id) setActiveReader({ id: p.id, name: p.name, kind: p.kind }); }
    setBusy(false);
  };
  const remove = async (p: FamilyProfile) => {
    if (await fam.save(f.profiles.filter((x) => x.id !== p.id)) && reader.id === p.id) setActiveReader(null);
    setRemoving(null);
  };
  return (
    <div className="space-y-4">
      {fam.error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{fam.error}</p>}
      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Target className="h-4 w-4 text-indigo-600" aria-hidden />Family challenge this week</p>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Goal
              <SelectBox value={f.challenge.weeklyMinutes} onChange={(e) => void fam.save(f.profiles, Number(e.target.value))} aria-label="Weekly family goal" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold">
                {[120, 180, 300, 420, 600, 900].map((m) => <option key={m} value={m}>{m / 60 >= 1 ? `${m / 60} hours` : `${m} min`} a week</option>)}
              </SelectBox>
            </label>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-slate-900">{f.challenge.weekMinutes} <span className="text-base font-semibold text-slate-500">of {f.challenge.weeklyMinutes} minutes</span></p>
          <ProgressBar.Root value={pct} aria-label="Family challenge progress" className="relative mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <ProgressBar.Indicator className={`h-full rounded-full transition-[width] ${f.challenge.met ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${pct}%` }} />
          </ProgressBar.Root>
          <p className="mt-2 text-xs text-slate-500">{f.challenge.met ? 'Challenge met. Well done, everyone!' : 'Everyone’s reading counts. The week starts on Monday.'}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Trophy className="h-4 w-4 text-amber-500" aria-hidden />This week</p>
          <ol className="mt-3 space-y-2">
            {ranking.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span className="w-4 text-right font-bold tabular-nums text-slate-400">{i + 1}</span>
                <Avatar name={p.name} color={p.color} size="h-7 w-7 text-xs" />
                <span className="flex-1 truncate font-semibold text-slate-800">{p.id === ME ? `${p.name} (me)` : p.name}</span>
                {i === 0 && p.week > 0 && <Crown className="h-4 w-4 text-amber-500" aria-label="Most minutes" />}
                <span className="tabular-nums text-slate-600">{p.week} min</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="family-profiles">
        {people.map((p) => {
          const s = sum(p.id);
          const profile = f.profiles.find((x) => x.id === p.id) ?? null;
          const active = reader.id === p.id;
          return (
            <div key={p.id} className={`rounded-2xl bg-white p-4 ring-1 ${active ? 'ring-2 ring-indigo-400' : 'ring-slate-200'}`}>
              <div className="flex items-center gap-3">
                <Avatar name={p.name} color={p.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{p.id === ME ? `${p.name} (me)` : p.name}</p>
                  <p className="text-xs text-slate-500">{p.id === ME ? 'Account holder' : `${KIND_LABELS[p.kind]}${profile && (p.kind === 'child' || p.kind === 'early') ? ` · level ${profile.level}` : ''}`}</p>
                </div>
                {profile && (
                  <div className="flex">
                    <button type="button" onClick={() => { setEditing(profile); setDialog(true); }} aria-label={`Edit ${p.name}`} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setRemoving(profile)} aria-label={`Remove ${p.name}`} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-1 text-center">
                {[
                  { icon: Gauge, label: 'min this week', value: s?.weekMinutes ?? 0 },
                  { icon: Flame, label: 'day streak', value: s?.streak ?? 0 },
                  { icon: Library, label: 'books', value: s?.books ?? 0 },
                  { icon: Star, label: 'stars', value: s?.stars ?? 0 },
                ].map((x) => (
                  <div key={x.label} className="rounded-xl bg-slate-50 px-1 py-2"><dt className="sr-only">{x.label}</dt><dd className="text-lg font-extrabold tabular-nums text-slate-900">{x.value}</dd><span className="block text-[10px] leading-tight text-slate-500" aria-hidden>{x.label}</span></div>
                ))}
              </dl>
              {s && <div className="mt-3"><MiniBars days={s.last14} color={p.color} /></div>}
              <p className="mt-2 text-xs text-slate-500">{s?.quizAverage !== null && s?.quizAverage !== undefined ? `Quiz average ${s.quizAverage}% over ${s.quizzes} quiz${s.quizzes === 1 ? '' : 'zes'}` : 'No quizzes yet'}</p>
              <button type="button" onClick={() => setActiveReader(p.id === ME ? null : { id: p.id, name: p.name, kind: p.kind })} disabled={active} data-testid={`read-as-${p.id}`}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:bg-indigo-50 disabled:text-indigo-700 cursor-pointer">
                <UserRound className="h-4 w-4" aria-hidden />{active ? 'Reading on this device' : `Read as ${p.id === ME ? 'me' : p.name}`}
              </button>
            </div>
          );
        })}
        {f.profiles.length < f.maxProfiles && (
          <button type="button" onClick={() => { setEditing(null); setDialog(true); }} data-testid="add-reader"
            className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-700 cursor-pointer">
            <Plus className="h-6 w-6" aria-hidden />Add a reader<span className="text-xs font-normal text-slate-500">{f.maxProfiles - f.profiles.length} of {f.maxProfiles} places left</span>
          </button>
        )}
      </div>

      <ProfileDialog open={dialog} onOpenChange={setDialog} profile={editing} onSave={(p) => void saveProfile(p)} busy={busy} />
      <AlertDialog.Root open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl">
            <AlertDialog.Title className="text-lg font-bold text-slate-900">Remove {removing?.name}?</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-slate-600">Their reading time, quiz scores and stars are removed too. This cannot be undone.</AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">Keep</AlertDialog.Cancel>
              <AlertDialog.Action onClick={() => removing && void remove(removing)} className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-500 cursor-pointer">Remove</AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

/** The adaptive coach's next step for the reader on this device. */
export function NextStepCard({ fam, tests, todayMinutes, streak }: { fam: ReturnType<typeof useFamily>; tests: SpeedTest[]; todayMinutes: number; streak: number }) {
  const reader = useActiveReader();
  const s = fam.family?.summaries.find((x) => x.id === reader.id);
  const child = reader.kind === 'child' || reader.kind === 'early';
  const step = nextStep({
    tests, quizAverage: s?.quizAverage ?? null, quizzes: s?.quizzes ?? 0,
    todayMinutes: reader.id === ME ? Math.max(todayMinutes, s?.todayMinutes ?? 0) : s?.todayMinutes ?? 0,
    goalMinutes: child ? 15 : 20, streak: reader.id === ME ? streak : s?.streak ?? 0,
  });
  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-lg shadow-indigo-600/20" data-testid="next-step">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100"><Compass className="h-4 w-4" aria-hidden />Your next step{reader.name ? ` · ${reader.name}` : ''}</p>
      <p className="mt-2 text-2xl font-extrabold">Fast Read at {step.wpm} words a minute</p>
      <p className="mt-1 text-sm text-indigo-100">{step.speedReason}</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {step.plan.map((p) => <li key={p} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />{p}</li>)}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => { setFastReadSpeed(step.wpm); document.getElementById('fast-read')?.scrollIntoView({ behavior: 'smooth' }); }} data-testid="practise-now"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"><Zap className="h-4 w-4" aria-hidden />Practise at {step.wpm}</button>
        {child && <a href={`${BASE}reading-intelligence/young-readers`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/25"><Users className="h-4 w-4" aria-hidden />Young readers</a>}
      </div>
    </div>
  );
}

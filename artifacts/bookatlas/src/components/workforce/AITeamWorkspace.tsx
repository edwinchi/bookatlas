import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw, ShieldAlert, Lock, FileWarning } from 'lucide-react';
import {
  useGetWorkforce,
  getGetWorkforceQueryKey,
  type WorkforceTask,
  type WorkforceWorkspace,
} from '@workspace/api-client-react';
import { useAccount } from '../../auth/AuthContext';
import { describeError } from '../publishing/AuthedAudioPlayer';
import { RoleRoster } from './RoleRoster';
import { TeamSizing } from './TeamSizing';
import { AssignmentComposer } from './AssignmentComposer';
import { TaskLedger } from './TaskLedger';

export type PatchTask = (task: WorkforceTask) => void;

/** Admin-only AI Team workspace. Report-only drafting; every paid call is approved per worker. */
export const AITeamWorkspace: React.FC = () => {
  const { account } = useAccount();
  const qc = useQueryClient();
  const isAdmin = account?.role === 'admin';
  const ownerId = isAdmin ? account!.id : null;
  const baseKey = getGetWorkforceQueryKey();
  const queryKey = useMemo(() => [...baseKey, ownerId ?? 'none'] as const, [ownerId]); // eslint-disable-line react-hooks/exhaustive-deps
  const ownerRef = useRef(ownerId);
  ownerRef.current = ownerId;

  const [selected, setSelected] = useState<string[]>([]);
  const [focusTeam, setFocusTeam] = useState<string | null>(null);
  const [activeRuns, setActiveRuns] = useState(0);

  // Drop any other owner's cached workspace whenever auth changes.
  useEffect(() => {
    qc.removeQueries({ queryKey: baseKey, predicate: (q) => q.queryKey[1] !== ownerId });
    setSelected([]);
    setFocusTeam(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, qc]);

  const ws = useGetWorkforce<WorkforceWorkspace>({
    query: {
      queryKey,
      enabled: !!ownerId,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchInterval: (q) => {
        const data = q.state.data as WorkforceWorkspace | undefined;
        const running = data?.tasks.some((t) => t.status === 'running' || t.workers.some((w) => w.status === 'running'));
        return running || activeRuns > 0 ? 5000 : false;
      },
    },
  });

  /** Patch a task into the scoped cache, but only if the same owner is still signed in. */
  const makePatch = (forOwner: string | null): PatchTask => (task) => {
    if (!forOwner || ownerRef.current !== forOwner) return;
    qc.setQueryData<WorkforceWorkspace>([...baseKey, forOwner], (old) => {
      if (!old) return old;
      const exists = old.tasks.some((t) => t.id === task.id);
      return { ...old, tasks: exists ? old.tasks.map((t) => (t.id === task.id ? task : t)) : [task, ...old.tasks] };
    });
  };

  if (!isAdmin) {
    return (
      <section className="aiteam rounded-3xl border border-[#d9cfbd] bg-[#f6f1e7] p-8 text-[#1d2b2a]" data-testid="aiteam-denied">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 mt-0.5 text-[#9a3b2e]" aria-hidden />
          <div>
            <h2 className="font-serif text-xl font-bold">AI Team is for administrators</h2>
            <p className="mt-1 text-sm text-[#55605c]">Sign in with an administrator account to view saved assignments and reports.</p>
          </div>
        </div>
      </section>
    );
  }

  const data = ws.data;
  const roleMap = new Map((data?.roles ?? []).map((r) => [r.id, r]));
  const patch = makePatch(ownerId);

  return (
    <section className="aiteam relative rounded-[28px] border border-[#d9cfbd] bg-[#f6f1e7] text-[#1d2b2a] overflow-hidden" aria-labelledby="aiteam-title">
      <header className="relative px-6 sm:px-10 pt-9 pb-7 border-b border-[#d9cfbd] bg-[linear-gradient(120deg,#123c3a_0%,#1d4f4a_60%,#2a5a50_100%)] text-[#f3ecdc]">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none bg-[repeating-linear-gradient(0deg,#fff_0,#fff_1px,transparent_1px,transparent_28px)]" aria-hidden />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-[#e7b866]">Bookatlas / Back office / Desk 07</p>
            <h2 id="aiteam-title" className="mt-2 font-serif text-3xl sm:text-4xl font-bold tracking-tight">The AI Team ledger</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#cfe0d9]">
              Brief specialist roles, approve each paid draft by hand, and review written reports. Workers write recommendations only. Nothing here executes, publishes, emails, or spends beyond the cap you set.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-[11px]">
            <StatusPill ok={data?.aiConfigured} label="AI provider" loading={ws.isLoading} />
            <StatusPill ok={data?.storageReady} label="Private storage" loading={ws.isLoading} />
            <button
              type="button"
              onClick={() => ws.refetch()}
              disabled={ws.isFetching || !ownerId}
              data-testid="button-refresh-workforce"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#f3ecdc]/30 px-3 py-1.5 hover:bg-[#f3ecdc]/10 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ws.isFetching ? 'animate-spin' : ''}`} aria-hidden /> Reload
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 sm:px-10 py-4 border-b border-[#d9cfbd] bg-[#efe6d4] flex flex-col md:flex-row gap-3 text-[12px] text-[#4a4335]">
        <FileWarning className="w-4 h-4 flex-shrink-0 text-[#9a3b2e]" aria-hidden />
        <p className="leading-relaxed">
          <strong>Report-only.</strong> No SQL, code, email, ad spend or publishing tools, and no live web search. Reports may be wrong or out of date. Saved briefs and reports are private to administrators. Do not paste passwords, API keys, payment details, or any reader's personal data.
          {data?.executionPolicy && <span className="block mt-1 text-[#6b604c]">Server policy: {data.executionPolicy}</span>}
        </p>
      </div>

      {ws.isLoading ? (
        <div className="p-6 sm:p-10 grid gap-4 lg:grid-cols-[1.3fr_1fr]" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-[#e8dfcc] animate-pulse" />)}
        </div>
      ) : ws.isError ? (
        <div role="alert" className="m-6 sm:m-10 flex items-start gap-3 rounded-2xl border border-[#e3b5a9] bg-[#fbeee9] p-5 text-sm text-[#7a2a1f]">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden />
          <span className="flex-1">{describeError(ws.error, 'The AI Team workspace could not be loaded.')}</span>
          <button type="button" onClick={() => ws.refetch()} className="font-bold underline cursor-pointer" data-testid="button-retry-workforce">Retry</button>
        </div>
      ) : data ? (
        <div className="p-6 sm:p-10 space-y-10">
          {!data.aiConfigured && (
            <p className="flex items-center gap-2 rounded-xl border border-[#e7c98d] bg-[#fbf3df] px-4 py-3 text-[12px] text-[#6b4f12]">
              <ShieldAlert className="w-4 h-4" aria-hidden /> The AI provider is not configured. You can save assignments, but workers cannot run yet.
            </p>
          )}
          <div className="grid gap-10 xl:grid-cols-[1.35fr_1fr]">
            <RoleRoster
              roles={data.roles}
              teams={data.teams}
              selected={selected}
              setSelected={setSelected}
              focusTeam={focusTeam}
              setFocusTeam={setFocusTeam}
            />
            <AssignmentComposer
              key={ownerId}
              roleMap={roleMap}
              selected={selected}
              setSelected={setSelected}
              disabled={!data.storageReady}
              onCreated={patch}
              ownerId={ownerId}
              ownerRef={ownerRef}
            />
          </div>
          <TeamSizing teams={data.teams} roleMap={roleMap} focusTeam={focusTeam} setFocusTeam={setFocusTeam} />
          <TaskLedger
            tasks={data.tasks}
            roleMap={roleMap}
            aiConfigured={data.aiConfigured}
            onPatch={patch}
            ownerId={ownerId}
            ownerRef={ownerRef}
            onRunCount={(d) => setActiveRuns((n) => Math.max(0, n + d))}
            onRefetch={() => { void ws.refetch(); }}
          />
        </div>
      ) : null}
    </section>
  );
};

const StatusPill: React.FC<{ ok?: boolean; label: string; loading: boolean }> = ({ ok, label, loading }) => (
  <span data-testid={`status-${label.toLowerCase().replace(/\s/g, '-')}`} className="inline-flex items-center gap-1.5 rounded-full border border-[#f3ecdc]/30 px-3 py-1.5">
    <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-[#f3ecdc]/40' : ok ? 'bg-[#8fd1a8]' : 'bg-[#e88a72]'}`} aria-hidden />
    {label}: {loading ? 'checking' : ok ? 'ready' : 'not ready'}
  </span>
);

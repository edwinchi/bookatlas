import { useRef, useState } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import { useCreateWorkforceTask, type WorkforceRole } from '@workspace/api-client-react';
import { describeError } from '../publishing/AuthedAudioPlayer';
import { MAX_WORKERS } from './RoleRoster';
import type { PatchTask } from './AITeamWorkspace';

type Props = {
  roleMap: Map<string, WorkforceRole>;
  selected: string[];
  setSelected: (fn: (prev: string[]) => string[]) => void;
  disabled: boolean;
  onCreated: PatchTask;
  ownerId: string | null;
  ownerRef: React.MutableRefObject<string | null>;
};

export const AssignmentComposer: React.FC<Props> = ({ roleMap, selected, setSelected, disabled, onCreated, ownerId, ownerRef }) => {
  const [objective, setObjective] = useState('');
  const [context, setContext] = useState('');
  const [budget, setBudget] = useState('0.25');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const idemKey = useRef(crypto.randomUUID());
  const create = useCreateWorkforceTask();

  const budgetNum = Number(budget);
  const validIds = selected.filter((id) => roleMap.has(id));
  const problems: string[] = [];
  if (objective.trim().length < 10) problems.push('Objective needs at least 10 characters.');
  if (objective.length > 1000) problems.push('Objective is over 1000 characters.');
  if (context.length > 12000) problems.push('Context is over 12000 characters.');
  if (validIds.length < 1) problems.push('Select at least one role.');
  if (selected.length > MAX_WORKERS) problems.push(`Select at most ${MAX_WORKERS} roles.`);
  if (!Number.isFinite(budgetNum) || budgetNum < 0.05 || budgetNum > 1) problems.push('Cap must be between $0.05 and $1.00.');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaved('');
    if (problems.length || disabled) return;
    const forOwner = ownerId;
    create.mutate(
      { data: { idempotencyKey: idemKey.current, objective: objective.trim(), context: context.trim() || undefined, workerIds: validIds, budgetUsd: Math.round(budgetNum * 100) / 100 } },
      {
        onSuccess: (task) => {
          if (ownerRef.current !== forOwner) return;
          onCreated(task);
          idemKey.current = crypto.randomUUID();
          setObjective(''); setContext(''); setSelected(() => []);
          setSaved('Assignment saved as a draft. No workers have run. Approve each one below when ready.');
        },
        onError: (err) => { if (ownerRef.current === forOwner) setError(describeError(err, 'The assignment could not be saved.')); },
      },
    );
  };

  const field = 'w-full rounded-xl border border-[#d9cfbd] bg-[#fbf8f1] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4f4a]';

  return (
    <form onSubmit={submit} className="xl:sticky xl:top-4 self-start rounded-2xl border border-[#1d4f4a]/30 bg-[#fbf8f1] p-6 shadow-[0_12px_30px_-18px_rgba(18,60,58,0.5)]">
      <h3 className="font-serif text-2xl font-bold">New assignment</h3>
      <p className="mt-1 text-[12px] text-[#6b604c]">Saving creates a draft only. No paid work starts until you approve a worker.</p>

      <div className="mt-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#6b604c]">Roles {selected.length}/{MAX_WORKERS}</p>
        {selected.length === 0 ? (
          <p className="mt-2 text-[13px] text-[#8a7f6a]">Pick roles from the roster.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {selected.map((id) => (
              <li key={id} className="inline-flex items-center gap-1 rounded-full bg-[#1d4f4a] text-[#f3ecdc] pl-3 pr-1.5 py-1 text-[12px]">
                {roleMap.get(id)?.name ?? `Unknown role ${id}`}
                <button type="button" aria-label={`Remove ${roleMap.get(id)?.name ?? id}`} data-testid={`button-remove-role-${id}`} onClick={() => setSelected((p) => p.filter((x) => x !== id))} className="rounded-full p-0.5 hover:bg-white/15 cursor-pointer">
                  <X className="w-3 h-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="block mt-5 text-[13px] font-semibold">Objective
        <textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} maxLength={1000} data-testid="input-objective" className={`${field} mt-1.5 font-normal`} placeholder="Draft a 30-day launch plan for our Dutch heritage classics shelf." />
        <span className="block text-right font-mono text-[10px] text-[#8a7f6a]">{objective.length}/1000</span>
      </label>
      <label className="block mt-2 text-[13px] font-semibold">Context <span className="font-normal text-[#8a7f6a]">(optional)</span>
        <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={5} maxLength={12000} data-testid="input-context" className={`${field} mt-1.5 font-normal`} placeholder="Background, constraints, audience. No secrets or reader personal data." />
        <span className="block text-right font-mono text-[10px] text-[#8a7f6a]">{context.length}/12000</span>
      </label>
      <label className="block mt-2 text-[13px] font-semibold">Spending cap for the whole assignment (USD)
        <input type="number" min={0.05} max={1} step={0.05} value={budget} onChange={(e) => setBudget(e.target.value)} data-testid="input-budget" className={`${field} mt-1.5 font-mono`} />
        <span className="block mt-1 font-normal text-[11px] text-[#8a7f6a]">A hard ceiling on reserved provider cost, from $0.05 to $1.00. Not an invoice.</span>
      </label>

      {problems.length > 0 && (objective || context || selected.length > 0) && (
        <ul className="mt-4 space-y-0.5 text-[12px] text-[#9a3b2e]">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      )}
      {disabled && <p className="mt-4 text-[12px] text-[#9a3b2e]">Private storage is not ready, so assignments cannot be saved.</p>}
      {error && <p role="alert" className="mt-4 text-[12px] font-semibold text-[#9a3b2e]">{error}</p>}
      {saved && <p role="status" className="mt-4 text-[12px] font-semibold text-[#1d4f4a]" data-testid="text-assignment-saved">{saved}</p>}

      <button type="submit" disabled={create.isPending || problems.length > 0 || disabled} data-testid="button-save-assignment" className="mt-5 w-full inline-flex justify-center items-center gap-2 rounded-xl bg-[#1d4f4a] hover:bg-[#123c3a] text-[#f3ecdc] py-3 text-sm font-bold disabled:opacity-50 cursor-pointer">
        {create.isPending ? <RefreshCw className="w-4 h-4 animate-spin" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />}
        Save draft assignment
      </button>
    </form>
  );
};

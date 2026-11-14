import { useEffect, useState } from 'react';
import { Download, Play, RefreshCw, Ban, CheckCircle2, LifeBuoy, ChevronDown } from 'lucide-react';
import {
  useRunWorkforceWorker,
  useReviewWorkforceTask,
  type WorkforceRole,
  type WorkforceTask,
  type WorkforceWorkerResult,
  type WorkforceReviewInputAction,
} from '@workspace/api-client-react';
import { describeError } from '../publishing/AuthedAudioPlayer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../ui/alert-dialog';
import type { PatchTask } from './AITeamWorkspace';

const RECOVER_MS = 3 * 60 * 1000;
const usd = (n: number) => `$${n.toFixed(3)}`;

const TASK_TONE: Record<string, string> = {
  draft: 'bg-[#efe6d4] text-[#4a4335]',
  running: 'bg-[#dbe8f0] text-[#1f4a63]',
  review: 'bg-[#fbf0d6] text-[#7a5a14]',
  approved: 'bg-[#dcefe3] text-[#1d5a3a]',
  cancelled: 'bg-[#ece7df] text-[#6b604c]',
  blocked: 'bg-[#fbe4dd] text-[#8a2f22]',
};
const WORKER_TONE: Record<string, string> = {
  pending: 'text-[#6b604c]', running: 'text-[#1f4a63]', completed: 'text-[#1d5a3a]', failed: 'text-[#8a2f22]', unknown: 'text-[#7a5a14]',
};

type Props = {
  tasks: WorkforceTask[];
  roleMap: Map<string, WorkforceRole>;
  aiConfigured: boolean;
  onPatch: PatchTask;
  ownerId: string | null;
  ownerRef: React.MutableRefObject<string | null>;
  onRunCount: (delta: number) => void;
  onRefetch: () => void;
};

export const TaskLedger: React.FC<Props> = (props) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  const tasks = [...props.tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div>
      <h3 className="font-serif text-2xl font-bold">Saved assignments</h3>
      {tasks.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#cbbfa6] p-10 text-center">
          <p className="font-serif text-lg">The ledger is empty.</p>
          <p className="mt-1 text-[13px] text-[#6b604c]">Select roles, write an objective, and save a draft. Nothing runs until you approve it.</p>
        </div>
      ) : (
        <ol className="mt-5 space-y-5">
          {tasks.map((t, i) => <TaskCard key={t.id} task={t} defaultOpen={i === 0} now={now} {...props} />)}
        </ol>
      )}
    </div>
  );
};

const TaskCard: React.FC<Props & { task: WorkforceTask; defaultOpen: boolean; now: number }> = ({ task, defaultOpen, now, roleMap, aiConfigured, onPatch, ownerId, ownerRef, onRunCount, onRefetch }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [confirmWorker, setConfirmWorker] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const run = useRunWorkforceWorker();
  const review = useReviewWorkforceTask();
  const closed = task.status === 'approved' || task.status === 'cancelled';
  const allDone = task.workers.length > 0 && task.workers.every((w) => w.status === 'completed');
  const remaining = Math.max(0, task.budgetUsd - task.reservedUsd);
  const name = (id: string) => roleMap.get(id)?.name ?? id;

  const doRun = (w: WorkforceWorkerResult) => {
    const forOwner = ownerId;
    setConfirmWorker(null); setError('');
    setRunningIds((p) => [...p, w.workerId]);
    onRunCount(1);
    run.mutate(
      { id: task.id, workerId: w.workerId, data: { approveSpend: true } },
      {
        onSuccess: (t) => onPatch(t),
        onError: (err) => { if (ownerRef.current === forOwner) { setError(describeError(err, `${name(w.workerId)} could not run.`)); onRefetch(); } },
        onSettled: () => { onRunCount(-1); if (ownerRef.current === forOwner) setRunningIds((p) => p.filter((x) => x !== w.workerId)); },
      },
    );
  };

  const doReview = (action: WorkforceReviewInputAction) => {
    const forOwner = ownerId;
    setError('');
    review.mutate(
      { id: task.id, data: { action, note: note.trim() || undefined } },
      {
        onSuccess: (t) => { onPatch(t); if (ownerRef.current === forOwner) setNote(''); },
        onError: (err) => { if (ownerRef.current === forOwner) setError(describeError(err, 'The review action failed.')); },
      },
    );
  };

  const canRecover = task.workers.some((w) => w.status === 'running' && w.startedAt && now - new Date(w.startedAt).getTime() >= RECOVER_MS && !runningIds.includes(w.workerId));

  const download = () => {
    const lines = [
      `# AI Team report`, '', `Objective: ${task.objective}`, `Status: ${task.status}`, `Cap: ${usd(task.budgetUsd)}  Reserved: ${usd(task.reservedUsd)}`,
      `Saved: ${new Date(task.createdAt).toISOString()}`, '', '> Report-only drafts. Recommendations have not been executed. Verify before acting.', '',
      ...(task.context ? ['## Context', '', task.context, ''] : []),
      ...task.workers.flatMap((w) => [`## ${name(w.workerId)} (${w.status})`, '', w.report || w.error || 'No report.', '']),
      ...(task.approvalNote ? ['## Review note', '', task.approvalNote] : []),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `ai-team-${task.id}.md`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <li data-testid={`card-task-${task.id}`} className="rounded-2xl border border-[#d9cfbd] bg-[#fbf8f1] overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid={`button-toggle-task-${task.id}`} className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-[#f3ecdf] cursor-pointer">
        <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${TASK_TONE[task.status]}`} data-testid={`status-task-${task.id}`}>{task.status}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[15px] line-clamp-2">{task.objective}</span>
          <span className="block mt-1 font-mono text-[11px] text-[#6b604c]">
            {task.workers.length} roles / cap {usd(task.budgetUsd)} / reserved {usd(task.reservedUsd)} / updated {new Date(task.updatedAt).toLocaleString()}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div className="border-t border-[#e2d8c5] px-5 py-5 space-y-5">
          {task.context && <p className="text-[13px] text-[#4a4335] whitespace-pre-wrap break-words"><span className="font-mono text-[11px] text-[#8a7f6a]">Context: </span>{task.context}</p>}

          <ul className="space-y-3">
            {task.workers.map((w) => {
              const busy = runningIds.includes(w.workerId);
              return (
                <li key={w.workerId} className="rounded-xl border border-[#e2d8c5] bg-[#f6f1e7] p-4" data-testid={`row-worker-${task.id}-${w.workerId}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{name(w.workerId)}</p>
                      <p className={`font-mono text-[11px] ${WORKER_TONE[w.status]}`}>
                        {busy ? 'request in progress, may take up to 90s' : w.status}
                        {w.reservedUsd > 0 && ` / reserved ${usd(w.reservedUsd)}`}
                        {w.startedAt && ` / started ${new Date(w.startedAt).toLocaleTimeString()}`}
                      </p>
                    </div>
                    {w.status === 'pending' && !closed && task.status !== 'blocked' && (
                      <button type="button" disabled={busy || !aiConfigured} onClick={() => setConfirmWorker(w.workerId)} data-testid={`button-run-${task.id}-${w.workerId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d4f4a] text-[#f3ecdc] px-3 py-1.5 text-[12px] font-bold disabled:opacity-50 cursor-pointer">
                        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Play className="w-3.5 h-3.5" aria-hidden />} Approve and run
                      </button>
                    )}
                  </div>
                  {confirmWorker === w.workerId && (
                    <div role="dialog" aria-label="Confirm paid run" className="mt-3 rounded-lg border border-[#c9a35c] bg-[#fbf3df] p-3 text-[12px] text-[#4a3a12]">
                      <p>This authorizes one paid model call for <strong>{name(w.workerId)}</strong> only. Assignment cap {usd(task.budgetUsd)}, already reserved {usd(task.reservedUsd)}, about {usd(remaining)} left. Reserved amounts are a ceiling, not an invoice. The output is a written report; nothing is executed.</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => doRun(w)} data-testid={`button-confirm-run-${task.id}-${w.workerId}`} className="rounded-lg bg-[#1d4f4a] text-[#f3ecdc] px-3 py-1.5 font-bold cursor-pointer">Approve spend</button>
                        <button type="button" onClick={() => setConfirmWorker(null)} className="rounded-lg border border-[#b8ab90] px-3 py-1.5 cursor-pointer">Not now</button>
                      </div>
                    </div>
                  )}
                  {w.error && <p className="mt-2 text-[12px] text-[#8a2f22] whitespace-pre-wrap">{w.error}</p>}
                  {w.report && (
                    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#fffdf8] border border-[#e2d8c5] p-4 font-sans text-[13px] leading-relaxed text-[#2a2a24]" data-testid={`text-report-${task.id}-${w.workerId}`}>{w.report}</pre>
                  )}
                </li>
              );
            })}
          </ul>

          {task.approvalNote && <p className="text-[13px]"><span className="font-mono text-[11px] text-[#8a7f6a]">Review note: </span>{task.approvalNote}</p>}
          {error && <p role="alert" className="text-[12px] font-semibold text-[#9a3b2e]">{error}</p>}

          <div className="flex flex-col lg:flex-row lg:items-end gap-3 pt-2 border-t border-[#e2d8c5]">
            {!closed && (
              <label className="flex-1 text-[12px] font-semibold">Review note (optional)
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} data-testid={`input-note-${task.id}`} className="mt-1 w-full rounded-lg border border-[#d9cfbd] bg-[#fffdf8] px-3 py-2 text-sm font-normal" />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {!closed && (
                <button type="button" disabled={!allDone || review.isPending} onClick={() => doReview('approve')} title="Approves the written report only, not its recommendations" data-testid={`button-approve-${task.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d5a3a] text-white px-3 py-2 text-[12px] font-bold disabled:opacity-40 cursor-pointer">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> Approve report
                </button>
              )}
              {canRecover && !closed && (
                <button type="button" disabled={review.isPending} onClick={() => doReview('recover')} title="Marks stalled workers unknown. Nothing is retried automatically." data-testid={`button-recover-${task.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#7a5a14] text-[#7a5a14] px-3 py-2 text-[12px] font-bold disabled:opacity-40 cursor-pointer">
                  <LifeBuoy className="w-3.5 h-3.5" aria-hidden /> Recover stalled
                </button>
              )}
              {!closed && (
<AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" disabled={review.isPending} data-testid={`button-cancel-${task.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#8a2f22] text-[#8a2f22] px-3 py-2 text-[12px] font-bold disabled:opacity-40 cursor-pointer">
                  <Ban className="w-3.5 h-3.5" aria-hidden /> Cancel
                </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-md rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this assignment?</AlertDialogTitle>
                      <AlertDialogDescription>No further workers can run on it. Work already done is kept.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep running</AlertDialogCancel>
                      <AlertDialogAction className="bg-rose-600 hover:bg-rose-500" onClick={() => doReview('cancel')}>Cancel assignment</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <button type="button" onClick={download} data-testid={`button-download-${task.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#1d4f4a] text-[#1d4f4a] px-3 py-2 text-[12px] font-bold cursor-pointer">
                <Download className="w-3.5 h-3.5" aria-hidden /> Markdown
              </button>
            </div>
          </div>
          {!closed && !allDone && <p className="text-[11px] text-[#8a7f6a]">Approval unlocks once every worker has completed. Approving accepts the report; it does not carry out any recommendation.</p>}
        </div>
      )}
    </li>
  );
};

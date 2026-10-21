import { useMemo, useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import type { WorkforceRole, WorkforceTeam } from '@workspace/api-client-react';

export const MAX_WORKERS = 5;

type Props = {
  roles: WorkforceRole[];
  teams: WorkforceTeam[];
  selected: string[];
  setSelected: (fn: (prev: string[]) => string[]) => void;
  focusTeam: string | null;
  setFocusTeam: (id: string | null) => void;
};

export const RoleRoster: React.FC<Props> = ({ roles, teams, selected, setSelected, focusTeam, setFocusTeam }) => {
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [limitNote, setLimitNote] = useState('');
  const departments = useMemo(() => Array.from(new Set(roles.map((r) => r.department))).sort(), [roles]);
  const team = teams.find((t) => t.id === focusTeam) ?? null;

  const visible = roles.filter((r) => {
    if (team && !team.workerIds.includes(r.id)) return false;
    if (dept !== 'all' && r.department !== dept) return false;
    const s = q.trim().toLowerCase();
    return !s || `${r.name} ${r.department} ${r.mandate} ${r.deliverable}`.toLowerCase().includes(s);
  });

  const toggle = (id: string) => {
    setLimitNote('');
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_WORKERS) {
        setLimitNote(`An assignment holds at most ${MAX_WORKERS} roles. Remove one before adding another.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-2xl font-bold">Role roster</h3>
        <span className="font-mono text-[11px] text-[#6b604c]" data-testid="text-roster-count">{visible.length} of {roles.length} roles</span>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search roles</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7f6a]" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by role, mandate, deliverable"
            data-testid="input-role-search"
            className="w-full rounded-xl border border-[#d9cfbd] bg-[#fbf8f1] pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4f4a]"
          />
        </label>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          aria-label="Filter by department"
          data-testid="select-department"
          className="rounded-xl border border-[#d9cfbd] bg-[#fbf8f1] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4f4a]"
        >
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {team && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#123c3a] text-[#f3ecdc] px-4 py-2 text-[12px]">
          <span>Showing roles mapped to <strong>{team.name}</strong>. Your selection is unchanged.</span>
          <button type="button" onClick={() => setFocusTeam(null)} className="inline-flex items-center gap-1 underline cursor-pointer" data-testid="button-clear-team-focus">
            <X className="w-3.5 h-3.5" aria-hidden /> Show all
          </button>
        </div>
      )}
      {limitNote && <p role="alert" className="mt-3 text-[12px] font-semibold text-[#9a3b2e]">{limitNote}</p>}

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#cbbfa6] p-8 text-center text-sm text-[#6b604c]">
          No roles match this search. Try another department or clear the filters.
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-[#e2d8c5] border-y border-[#e2d8c5] max-h-[560px] overflow-y-auto">
          {visible.map((r) => {
            const on = selected.includes(r.id);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  aria-pressed={on}
                  data-testid={`button-role-${r.id}`}
                  className={`w-full text-left grid grid-cols-[28px_1fr] gap-3 px-2 py-4 transition-colors cursor-pointer ${on ? 'bg-[#e4efe9]' : 'hover:bg-[#efe8d9]'}`}
                >
                  <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center ${on ? 'bg-[#1d4f4a] border-[#1d4f4a] text-[#f3ecdc]' : 'border-[#b8ab90]'}`}>
                    {on && <Check className="w-3.5 h-3.5" aria-hidden />}
                  </span>
                  <span>
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-semibold text-[15px]">{r.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#9a3b2e]">{r.department}</span>
                    </span>
                    <span className="block mt-1 text-[13px] text-[#4a4335] leading-relaxed">{r.mandate}</span>
                    <span className="block mt-1 text-[12px] text-[#6b604c]"><span className="font-mono">Delivers:</span> {r.deliverable}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

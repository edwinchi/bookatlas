import type { WorkforceRole, WorkforceTeam } from '@workspace/api-client-react';

type Props = {
  teams: WorkforceTeam[];
  roleMap: Map<string, WorkforceRole>;
  focusTeam: string | null;
  setFocusTeam: (id: string | null) => void;
};

/** Human team sizing reference. Headcount describes people, not AI equivalence. */
export const TeamSizing: React.FC<Props> = ({ teams, roleMap, focusTeam, setFocusTeam }) => (
  <div>
    <h3 className="font-serif text-2xl font-bold">Team sizing reference</h3>
    <p className="mt-1 text-[13px] text-[#6b604c] max-w-2xl">
      Typical human team shapes for planning. An AI role is not a replacement for a person; it drafts a written report for one discipline. Focusing a team only narrows the roster above.
    </p>
    {teams.length === 0 ? (
      <p className="mt-4 text-sm text-[#6b604c]">No team presets were returned by the server.</p>
    ) : (
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {teams.map((t) => {
          const on = focusTeam === t.id;
          const max = Math.max(1, ...t.disciplines.map((d) => d.count));
          return (
            <article key={t.id} data-testid={`card-team-${t.id}`} className={`rounded-2xl border p-5 ${on ? 'border-[#1d4f4a] bg-[#e4efe9]' : 'border-[#d9cfbd] bg-[#fbf8f1]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-lg">{t.name}</h4>
                  <p className="font-mono text-[11px] text-[#6b604c]">{t.humanHeadcount} people / {t.workerIds.length} mapped AI roles</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusTeam(on ? null : t.id)}
                  data-testid={`button-focus-team-${t.id}`}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold cursor-pointer ${on ? 'bg-[#1d4f4a] text-[#f3ecdc]' : 'border border-[#1d4f4a] text-[#1d4f4a] hover:bg-[#1d4f4a]/10'}`}
                >
                  {on ? 'Focused' : 'Focus roster'}
                </button>
              </div>
              <ul className="mt-4 space-y-1.5">
                {t.disciplines.map((d) => (
                  <li key={d.name} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[12px]">
                    <span className="relative h-6 rounded bg-[#efe6d4] overflow-hidden">
                      <span className="absolute inset-y-0 left-0 bg-[#c9a35c]/45 origin-left" style={{ width: `${(d.count / max) * 100}%` }} />
                      <span className="relative px-2 leading-6">{d.name}</span>
                    </span>
                    <span className="font-mono w-6 text-right">{d.count}</span>
                  </li>
                ))}
              </ul>
              {t.workerIds.length > 0 && (
                <p className="mt-3 text-[11px] text-[#6b604c]">Roles: {t.workerIds.map((id) => roleMap.get(id)?.name ?? id).join(', ')}</p>
              )}
            </article>
          );
        })}
      </div>
    )}
  </div>
);

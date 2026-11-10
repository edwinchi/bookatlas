import React, { useState } from 'react';
import { useAuth } from '@clerk/react';
import { DatabaseZap, Loader2 } from 'lucide-react';

const PART_BYTES = 3 * 1024 * 1024;

/** CSV parts on row boundaries (never inside a quoted field), each with the header row. */
export function csvParts(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const header = lines.shift() ?? '';
  const parts: string[] = [];
  let part: string[] = [], size = 0, row = '', quotes = 0;
  for (const line of lines) {
    row = row ? `${row}\n${line}` : line;
    quotes += (line.match(/"/g) ?? []).length;
    if (quotes % 2) continue; // still inside a quoted field
    if (row.trim()) { part.push(row); size += row.length + 1; }
    row = ''; quotes = 0;
    if (size >= PART_BYTES) { parts.push([header, ...part].join('\n')); part = []; size = 0; }
  }
  if (part.length) parts.push([header, ...part].join('\n'));
  return parts;
}

/** ONIX parts on <Product> boundaries, each wrapped as its own message. */
export function onixParts(text: string): string[] {
  const products = text.match(/<Product[\s>][\s\S]*?<\/Product>/g) ?? [];
  const parts: string[] = [];
  let part: string[] = [], size = 0;
  for (const p of products) {
    part.push(p); size += p.length;
    if (size >= PART_BYTES) { parts.push(`<ONIXMessage release="3.0">${part.join('\n')}</ONIXMessage>`); part = []; size = 0; }
  }
  if (part.length) parts.push(`<ONIXMessage release="3.0">${part.join('\n')}</ONIXMessage>`);
  return parts;
}

/** Admins load distributor feeds (CSV or ONIX 3.0); titles are listed, not sold, until files are delivered. */
export const FeedImport: React.FC = () => {
  const { getToken } = useAuth();
  const [state, setState] = useState<{ busy: boolean; done: number; total: number; imported: number; errors: { record: string; reason: string }[]; message: string }>(
    { busy: false, done: 0, total: 0, imported: 0, errors: [], message: '' });

  const run = async (file: File) => {
    const onix = /\.(xml|onix)$/i.test(file.name);
    const text = await file.text();
    const parts = onix ? onixParts(text) : csvParts(text);
    if (!parts.length) { setState((s) => ({ ...s, message: 'No records found in this file.' })); return; }
    setState({ busy: true, done: 0, total: parts.length, imported: 0, errors: [], message: '' });
    let imported = 0;
    const errors: { record: string; reason: string }[] = [];
    for (let i = 0; i < parts.length; i += 1) {
      let token: string | null = null;
      try { token = await getToken(); } catch { token = null; }
      const res = await fetch(`/api/admin/catalog/import?format=${onix ? 'onix' : 'csv'}`, {
        method: 'POST', credentials: 'include', body: parts[i],
        headers: { 'Content-Type': onix ? 'application/xml' : 'text/csv', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setState((s) => ({ ...s, busy: false, message: body.error ?? `Part ${i + 1} failed (${res.status}).` })); return; }
      imported += body.imported ?? 0;
      errors.push(...(body.errors ?? []));
      setState((s) => ({ ...s, done: i + 1, imported, errors: errors.slice(0, 50) }));
    }
    setState((s) => ({ ...s, busy: false, message: `Imported ${imported.toLocaleString()} titles${errors.length ? `; ${errors.length.toLocaleString()} records need attention` : ''}.` }));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-slate-900"><DatabaseZap className="h-5 w-5 text-indigo-600" aria-hidden />Import a distributor feed</h2>
      <p className="mt-1 text-xs text-slate-600">
        ONIX 3.0 (.xml, reference tags) or CSV with the columns isbn, title, author, price and optionally subtitle, narrator, format, language,
        categories (BISAC or Thema codes, separated by |), description, cover_url, publisher, publish_date, page_count, duration_minutes, tags.
        Titles are listed as "Coming soon" until the distributor delivers the files.
      </p>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500">
        {state.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        {state.busy ? `Importing part ${state.done + 1} of ${state.total}…` : 'Choose a feed file'}
        <input type="file" accept=".csv,.xml,.onix,text/csv,application/xml" className="hidden" disabled={state.busy}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void run(f); }} />
      </label>
      {state.total > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className="h-full bg-indigo-600 transition-[width] duration-300" style={{ width: `${(state.done / state.total) * 100}%` }} />
        </div>
      )}
      {state.message && <p role="status" className="mt-3 text-xs font-semibold text-slate-800">{state.message}</p>}
      {state.errors.length > 0 && (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-amber-900">
          {state.errors.map((e, i) => <li key={i}><span className="font-semibold">{e.record}:</span> {e.reason}</li>)}
        </ul>
      )}
    </section>
  );
};

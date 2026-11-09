import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { PAPERS, TRIM_SIZES, inchesToMm, printCoverSpec, type PaperId, type TrimSizeId } from '@workspace/bookatlas-catalog/publishing';

const fmt = (inches: number) => `${inches.toFixed(3)} in · ${inchesToMm(inches)} mm`;

/** Full-wrap cover dimensions for a trim, paper and final page count, drawn to scale. */
export const PrintCalculator: React.FC<{
  trimSize: TrimSizeId; paper: PaperId; pageCount: number; binding?: 'paperback' | 'hardcover';
  onChange?: (next: { trimSize: TrimSizeId; paper: PaperId; pageCount: number }) => void;
}> = ({ trimSize, paper, pageCount, binding = 'paperback', onChange }) => {
  const spec = printCoverSpec(trimSize, paper, pageCount || 24, binding);
  const scale = 300 / spec.widthIn;
  const h = spec.heightIn * scale;
  const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-500';

  return (
    <div className="space-y-4">
      {onChange && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-slate-700">Trim size
            <select className={field} value={trimSize} onChange={(e) => onChange({ trimSize: e.target.value as TrimSizeId, paper, pageCount })}>
              {TRIM_SIZES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">Paper
            <select className={field} value={paper} onChange={(e) => onChange({ trimSize, paper: e.target.value as PaperId, pageCount })}>
              {PAPERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">Pages after layout
            <input className={field} type="number" min={24} max={828} value={pageCount || ''} onChange={(e) => onChange({ trimSize, paper, pageCount: Number(e.target.value) })} />
          </label>
        </div>
      )}

      <svg viewBox={`0 0 300 ${h}`} role="img" aria-label={`Full-wrap cover, ${spec.widthIn} by ${spec.heightIn} inches`} className="w-full rounded-lg border border-slate-200 bg-white">
        <rect x={0} y={0} width={300} height={h} fill="#fef3c7" />
        <rect x={0.125 * scale} y={0.125 * scale} width={300 - 0.25 * scale} height={h - 0.25 * scale} fill="#eef2ff" stroke="#6366f1" strokeDasharray="3 2" strokeWidth={0.6} />
        <rect x={spec.spinePanel.x * scale} y={0.125 * scale} width={spec.spinePanel.width * scale} height={h - 0.25 * scale} fill="#c7d2fe" />
        <rect x={spec.barcode.x * scale} y={h - (spec.barcode.y + spec.barcode.height) * scale} width={spec.barcode.width * scale} height={spec.barcode.height * scale} fill="#fff" stroke="#334155" strokeWidth={0.5} />
        <text x={spec.backPanel.width * scale / 2} y={h / 2} textAnchor="middle" fontSize={9} fill="#334155">Back</text>
        <text x={(spec.frontPanel.x + spec.frontPanel.width / 2) * scale} y={h / 2} textAnchor="middle" fontSize={9} fill="#334155">Front</text>
        <text x={(spec.barcode.x + spec.barcode.width / 2) * scale} y={h - (spec.barcode.y + spec.barcode.height / 2) * scale + 2} textAnchor="middle" fontSize={5} fill="#334155">Barcode area</text>
        {spec.spineTextAllowed && (
          <text transform={`translate(${(spec.spinePanel.x + spec.spinePanel.width / 2) * scale} ${h / 2}) rotate(90)`} textAnchor="middle" fontSize={5} fill="#312e81">Spine</text>
        )}
      </svg>
      <p className="text-[11px] text-slate-500">Amber edge: 0.125 in bleed, trimmed off. Dashed line: the trim. Shaded strip: the spine.</p>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-slate-500">Spine width</dt><dd className="font-semibold text-slate-900">{fmt(spec.spineIn)}</dd></div>
        <div><dt className="text-xs text-slate-500">Full cover (with bleed)</dt><dd className="font-semibold text-slate-900">{spec.widthIn.toFixed(3)} × {spec.heightIn.toFixed(3)} in</dd></div>
        <div><dt className="text-xs text-slate-500">At 300 dpi</dt><dd className="font-semibold text-slate-900">{spec.widthPx} × {spec.heightPx} px</dd></div>
        <div><dt className="text-xs text-slate-500">Inside (gutter) margin</dt><dd className="font-semibold text-slate-900">{fmt(spec.gutterIn)}</dd></div>
        <div><dt className="text-xs text-slate-500">Spine text</dt><dd className="font-semibold text-slate-900">{spec.spineTextAllowed ? 'Allowed' : 'Not allowed under 80 pages'}</dd></div>
        <div><dt className="text-xs text-slate-500">Barcode area</dt><dd className="font-semibold text-slate-900">2 × 1.2 in, back lower right</dd></div>
      </dl>
      {spec.problems.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {spec.problems.map((p) => <li key={p} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{p}</li>)}
        </ul>
      )}
    </div>
  );
};

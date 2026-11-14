import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { BookOpenCheck, CheckCircle2, Download, FileText, Info, Loader2, UploadCloud, X } from 'lucide-react';
import type { ConvertedManuscript } from './convert/convert';

/** Radix progress bar in the BookAtlas palette, with its percentage announced to screen readers. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
        <span aria-live="polite">{label}</span>
        <span className="font-semibold tabular-nums text-slate-800">{pct}%</span>
      </div>
      <ProgressPrimitive.Root value={pct} max={100} aria-label={label} className="relative h-2.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <ProgressPrimitive.Indicator
          className="h-full w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
}

const ACCEPT = '.epub,.docx,.pdf,application/epub+zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Choose the manuscript: an EPUB is uploaded as it is; a Word or PDF file is converted to EPUB here, in the
 * browser, with progress and a summary of what was found. Drag and drop or click.
 */
export function ManuscriptPicker({ file, manuscript, converting, error, required, replacing, onPick, onClear, onDownload }: {
  file: File | null;
  manuscript: ConvertedManuscript | null;
  converting: { fraction: number; label: string } | null;
  error: string;
  required: boolean;
  replacing: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  onDownload: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const coverUrl = useMemo(() => (manuscript?.cover ? URL.createObjectURL(new Blob([manuscript.cover.data as Uint8Array<ArrayBuffer>], { type: manuscript.cover.mediaType })) : null), [manuscript]);
  useEffect(() => () => { if (coverUrl) URL.revokeObjectURL(coverUrl); }, [coverUrl]);

  const pick = (f: File | undefined | null) => { if (f) onPick(f); if (inputRef.current) inputRef.current.value = ''; };

  return (
    <div className="space-y-3">
      {!file && (
        <label
          htmlFor={inputId}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-indigo-500 ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40'}`}
        >
          <UploadCloud className="h-8 w-8 text-indigo-500" aria-hidden />
          <span className="text-sm font-semibold text-slate-900">Drop your manuscript here, or choose a file</span>
          <span className="text-xs text-slate-500">EPUB, Word (.docx) or PDF · up to 150 MB{required ? '' : ' · optional'}</span>
          <input ref={inputRef} id={inputId} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      )}

      {file && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <FileText className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">
              {(file.size / 1024 / 1024).toFixed(1)} MB · {manuscript ? `converted from ${manuscript.report.source === 'pdf' ? 'PDF' : 'Word'} to EPUB` : converting ? 'converting to EPUB…' : 'EPUB'}
            </p>
          </div>
          <button type="button" onClick={onClear} disabled={!!converting} aria-label="Remove this file" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 cursor-pointer">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {converting && <ProgressBar value={converting.fraction * 100} label={converting.label} />}

      {manuscript && !converting && (
        <section aria-label="Conversion summary" className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="flex gap-4">
            {coverUrl
              ? <img src={coverUrl} alt="Cover found in your file" className="h-28 w-auto shrink-0 rounded-md border border-slate-200 object-cover shadow-sm" />
              : <div className="grid h-28 w-20 shrink-0 place-items-center rounded-md border border-dashed border-slate-300 text-center text-[10px] text-slate-500">No cover found</div>}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-4 w-4" aria-hidden />Converted to EPUB</p>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[['Chapters', manuscript.report.chapters], ['Words', manuscript.report.words.toLocaleString()], ['Pictures', manuscript.report.images]].map(([k, v]) => (
                  <div key={k as string} className="rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-500">{k}</dt>
                    <dd className="text-sm font-bold text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
              <button type="button" onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 cursor-pointer">
                <Download className="h-3.5 w-3.5" aria-hidden />Download the EPUB to check it
              </button>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
            <li className="flex gap-1.5"><BookOpenCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />Added: EPUB 3 package, a clickable table of contents, your title, author, language and rights in the book's details{manuscript.report.hasCopyrightPage ? '' : ', a title page and a copyright page'}. Then we fix what stores reject and run EPUBCheck.</li>
            {manuscript.report.notes.map((n) => <li key={n} className="flex gap-1.5"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />{n}</li>)}
          </ul>
        </section>
      )}

      {converting && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Converting on your device: your manuscript is not uploaded until you press the button below.</p>}
      {error && <p className="text-xs text-rose-700" role="alert">{error}</p>}
      {replacing && !file && <p className="text-xs text-slate-500">Made corrections? Choose the new file. Your details and cover choice are kept, and the book is prepared and checked again. Leave this empty to keep the current file.</p>}
    </div>
  );
}

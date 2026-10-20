import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Sliders,
  Sparkles,
  RefreshCw,
  X,
  ArrowRight,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { CSVValidationPreview, CSVColumnMapping, SubscriberTier } from '../../types';

interface CSVValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  previewData: CSVValidationPreview;
  onConfirmImport: (mapping: CSVColumnMapping, defaultTier: SubscriberTier, defaultTag: string) => Promise<void>;
  isImporting: boolean;
  importProgress: number;
}

export const CSVValidationModal: React.FC<CSVValidationModalProps> = ({
  isOpen,
  onClose,
  fileName,
  previewData,
  onConfirmImport,
  isImporting,
  importProgress
}) => {
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping>({
    emailCol: previewData.headers.find(h => /email|mail|address/i.test(h)) || previewData.headers[0] || 'email',
    nameCol: previewData.headers.find(h => /name|full|first/i.test(h)) || '',
    tierCol: previewData.headers.find(h => /tier|plan|level/i.test(h)) || '',
    tagsCol: previewData.headers.find(h => /tag|group|category/i.test(h)) || '',
    interestsCol: previewData.headers.find(h => /interest|genre|preference/i.test(h)) || '',
  });

  const [defaultTier, setDefaultTier] = useState<SubscriberTier>('free_reader');
  const [defaultTag, setDefaultTag] = useState('csv_import_2026');
  const [activeTab, setActiveTab] = useState<'mapping' | 'errors' | 'preview'>('mapping');

  if (!isOpen) return null;

  const validRate = previewData.totalRows > 0
    ? Math.round((previewData.validCount / previewData.totalRows) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Pre-Ingest Verification
                </span>
                <span className="text-xs font-mono text-slate-400">{fileName}</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-white mt-0.5">
                CSV Contact Validation & Column Mapping
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Score Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Rows In File</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {previewData.totalRows.toLocaleString()}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">Valid Deliverable</span>
            <span className="text-lg font-bold text-emerald-600 font-mono flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {previewData.validCount.toLocaleString()} ({validRate}%)
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-rose-500 block">Syntax / Invalid</span>
            <span className="text-lg font-bold text-rose-600 font-mono flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {previewData.invalidCount.toLocaleString()}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">Duplicates / Suppressed</span>
            <span className="text-lg font-bold text-amber-700 font-mono flex items-center justify-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {(previewData.duplicateCount + previewData.unsubscribedCount).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Sub-tabs inside modal */}
        <div className="flex items-center gap-4 px-6 pt-3 border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('mapping')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'mapping'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            1. Schema & Column Mapping
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'preview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            2. Parsed Data Preview (5 Sample Rows)
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'errors'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            3. Error & Flagged Records ({previewData.errors.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: MAPPING */}
          {activeTab === 'mapping' && (
            <div className="space-y-5">
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 leading-relaxed flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-0.5">High-Performance CSV Column Matcher</strong>
                  Map the columns from your uploaded CSV to the Bookatlas subscriber profile fields. The system handles 100,000+ records with duplicate deduplication and RFC-5322 compliance.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Column (Required) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Email Address Column <span className="text-rose-600">* (Required)</span>
                  </label>
                  <select
                    value={columnMapping.emailCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, emailCol: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    {previewData.headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 block">Identifies the primary recipient inbox</span>
                </div>

                {/* Name Column */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Full Name / First Name Column
                  </label>
                  <select
                    value={columnMapping.nameCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, nameCol: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- None (Auto-derive from email) --</option>
                    {previewData.headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 block">Used for {`{{subscriber_name}}`} interpolation</span>
                </div>

                {/* Tier Column */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Subscriber Tier Column
                  </label>
                  <select
                    value={columnMapping.tierCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, tierCol: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- None (Assign Default Tier Below) --</option>
                    {previewData.headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 block">Values: free_reader, member_subscriber, vip_patron</span>
                </div>

                {/* Tags Column */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Segmentation Tags Column
                  </label>
                  <select
                    value={columnMapping.tagsCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, tagsCol: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- None --</option>
                    {previewData.headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 block">Comma-separated tags for custom audience targeting</span>
                </div>
              </div>

              {/* Default Ingest Defaults */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Fallback Subscriber Tier
                  </label>
                  <select
                    value={defaultTier}
                    onChange={(e) => setDefaultTier(e.target.value as SubscriberTier)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="free_reader">📖 Free Reader Tier</option>
                    <option value="member_subscriber">✨ Bookatlas Plus Member</option>
                    <option value="vip_patron">👑 VIP Patron Circle (40% discount perk)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Batch Ingest Tag
                  </label>
                  <input
                    type="text"
                    value={defaultTag}
                    onChange={(e) => setDefaultTag(e.target.value)}
                    placeholder="e.g. amsterdam_bookfair_2026"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Top 5 Rows Evaluated From File:
              </span>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      {previewData.headers.map(h => (
                        <th key={h} className="py-2.5 px-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {previewData.previewRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {previewData.headers.map(h => (
                          <td key={h} className="py-2 px-3 whitespace-nowrap text-slate-800">
                            {row[h] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ERRORS */}
          {activeTab === 'errors' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Flagged Discrepancies & Sanitization Report:
              </span>
              {previewData.errors.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm">Prism Health Check Passed!</p>
                  <p className="text-xs text-emerald-700">0 syntax errors or malformed email headers detected in sampled rows.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-72">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Row #</th>
                        <th className="py-2.5 px-3">Raw Content</th>
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3">Diagnosis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.errors.map((err, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-600">
                            Line {err.rowNumber}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-800 max-w-xs truncate">
                            {err.rawEmail}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              err.severity === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {err.severity.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {err.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar when importing */}
        {isImporting && (
          <div className="px-6 py-3 bg-indigo-50 border-t border-indigo-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                Ingesting {previewData.validCount.toLocaleString()} verified contacts into high-speed memory...
              </span>
              <span>{importProgress}%</span>
            </div>
            <div className="w-full h-2 bg-indigo-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isImporting || previewData.validCount === 0}
            onClick={() => onConfirmImport(columnMapping, defaultTier, defaultTag)}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Stream...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Finalize & Ingest {previewData.validCount.toLocaleString()} Contacts</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

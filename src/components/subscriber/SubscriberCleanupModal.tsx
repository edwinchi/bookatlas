import React, { useState } from 'react';
import {
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  RefreshCw,
  X,
  Sparkles,
  Zap,
  Download
} from 'lucide-react';
import { SubscriberCleanupCriteria, SubscriberCleanupReport } from '../../types';

interface SubscriberCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalSubscribers: number;
  onRunCleanupSuccess: (report: SubscriberCleanupReport) => void;
  onNotification?: (msg: string) => void;
}

export const SubscriberCleanupModal: React.FC<SubscriberCleanupModalProps> = ({
  isOpen,
  onClose,
  totalSubscribers,
  onRunCleanupSuccess,
  onNotification
}) => {
  const [criteria, setCriteria] = useState<SubscriberCleanupCriteria>({
    removeBounced: true,
    removeInactive90Days: false,
    removeUnsubscribed: true,
    removeDuplicateDomains: false,
    flagSyntaxErrors: true
  });

  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<SubscriberCleanupReport | null>(null);

  if (!isOpen) return null;

  const handleExecuteCleanup = async () => {
    setIsCleaning(true);
    try {
      const res = await fetch('/api/subscribers/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria })
      });
      const data = await res.json();
      if (data.success && data.report) {
        setCleanupReport(data.report);
        onRunCleanupSuccess(data.report);
        if (onNotification) {
          onNotification(`✨ List hygiene complete: Deliverability score increased to ${data.report.deliverabilityScoreAfter}/100!`);
        }
      }
    } catch (e: any) {
      console.error('List cleanup error', e);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Audience List Hygiene Engine
              </span>
              <h2 className="text-xl font-serif font-bold text-white mt-0.5">
                Automated Subscriber Cleanup & Deliverability
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isCleaning}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {cleanupReport ? (
            /* Result Report */
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <h3 className="font-serif font-bold text-lg text-emerald-950">
                    Hygiene Cleanse Complete!
                  </h3>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  The automated scan evaluated <strong className="text-emerald-950">{cleanupReport.scannedCount.toLocaleString()}</strong> subscriber records and pruned low-reputation entries.
                </p>

                {/* Score Comparison */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Deliverability Before</span>
                    <span className="text-xl font-bold text-slate-600">{cleanupReport.deliverabilityScoreBefore}/100</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-300 text-center ring-2 ring-emerald-500/20">
                    <span className="text-[10px] text-emerald-600 uppercase font-bold block">Deliverability After</span>
                    <span className="text-xl font-bold text-emerald-600 flex items-center justify-center gap-1">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      {cleanupReport.deliverabilityScoreAfter}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Stats Table */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Hard & Soft Bounces Purged:</span>
                  <span className="font-bold text-slate-900">{cleanupReport.bouncedRemoved}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Unsubscribed Contacts Cleaned:</span>
                  <span className="font-bold text-slate-900">{cleanupReport.unsubscribedRemoved}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Inactive 90-Day Dormant Contacts:</span>
                  <span className="font-bold text-slate-900">{cleanupReport.inactiveRemoved}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Duplicate Domain Entries Deduplicated:</span>
                  <span className="font-bold text-slate-900">{cleanupReport.duplicatesRemoved}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-600">Estimated Inbox Placement Boost:</span>
                  <span className="font-bold text-emerald-600">{cleanupReport.estimatedInboxPlacementBoost}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Criteria Selector */
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Regularly cleaning your 100,000+ subscriber list improves sender reputation, eliminates spam-trap triggers, and maximizes Gmail/Apple Mail primary inbox placement.
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={criteria.removeBounced}
                    onChange={(e) => setCriteria({ ...criteria, removeBounced: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Purge Hard & Soft Bounced Addresses (Recommended)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Instantly eliminates addresses that failed delivery or rejected connections.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={criteria.removeUnsubscribed}
                    onChange={(e) => setCriteria({ ...criteria, removeUnsubscribed: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Prune Opted-Out & Suppressed Records
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Permanently cleans unsubs to optimize memory footprint and database indexing.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={criteria.removeInactive90Days}
                    onChange={(e) => setCriteria({ ...criteria, removeInactive90Days: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Archive Dormant Inactive Contacts (0 Opens in 90+ Days)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Reduces spam score penalties by sending exclusively to engaged readers.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={criteria.flagSyntaxErrors}
                    onChange={(e) => setCriteria({ ...criteria, flagSyntaxErrors: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Fix Whitespace & Formatting Discrepancies
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Auto-trims trailing whitespace, lowercase normalizes domain strings.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isCleaning}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {cleanupReport ? 'Close' : 'Cancel'}
          </button>

          {!cleanupReport ? (
            <button
              type="button"
              disabled={isCleaning}
              onClick={handleExecuteCleanup}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-300 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isCleaning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning 100k Subscriber Index...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Execute Automated Cleanse ({totalSubscribers.toLocaleString()} records)</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCleanupReport(null)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              Run Another Scan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

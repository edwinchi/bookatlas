import React from 'react';
import {
  Lock,
  Sparkles,
  Award,
  Crown,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Headphones,
  Zap
} from 'lucide-react';
import { SubscriberTier } from '../../types';

interface TierAccessGateProps {
  currentTier: SubscriberTier;
  minTierRequired: SubscriberTier;
  featureTitle: string;
  featureDescription: string;
  onUpgradeTier?: (tier: SubscriberTier) => void;
  children: React.ReactNode;
}

const TIER_LEVELS: Record<SubscriberTier, number> = {
  free_reader: 1,
  member_subscriber: 2,
  vip_patron: 3
};

const TIER_INFO: Record<SubscriberTier, { name: string; badge: string; color: string; perk: string }> = {
  free_reader: {
    name: 'Free Reader',
    badge: '📖 Standard Tier',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    perk: 'Read sample chapters & receive weekly dispatches'
  },
  member_subscriber: {
    name: 'Bookatlas Plus Member',
    badge: '✨ Plus Tier',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    perk: 'Unlimited DRM-Free eReader & studio audiobook dock'
  },
  vip_patron: {
    name: 'VIP Patron Circle',
    badge: '👑 VIP Patron (40% Off)',
    color: 'bg-amber-100 text-amber-900 border-amber-300',
    perk: '40% discount privilege, AI companion & early manuscripts'
  }
};

export const TierAccessGate: React.FC<TierAccessGateProps> = ({
  currentTier = 'free_reader',
  minTierRequired,
  featureTitle,
  featureDescription,
  onUpgradeTier,
  children
}) => {
  const currentLevel = TIER_LEVELS[currentTier] || 1;
  const requiredLevel = TIER_LEVELS[minTierRequired] || 1;
  const hasAccess = currentLevel >= requiredLevel;

  if (hasAccess) {
    return <>{children}</>;
  }

  const requiredInfo = TIER_INFO[minTierRequired];

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-indigo-900/60 shadow-xl relative overflow-hidden text-center space-y-4 animate-fadeIn">
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-md">
        <Lock className="w-6 h-6" />
      </div>

      <div className="space-y-1 max-w-md mx-auto relative z-10">
        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5" />
          Requires {requiredInfo.name} Status
        </span>
        <h3 className="font-serif font-bold text-xl text-white">
          {featureTitle}
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          {featureDescription}
        </p>
      </div>

      {/* Tier Comparison Pill */}
      <div className="bg-slate-800/80 rounded-2xl p-4 max-w-sm mx-auto border border-slate-700 text-left space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Your Current Status:</span>
          <span className="font-bold text-slate-200 font-mono">{TIER_INFO[currentTier]?.name}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-400 font-semibold">Tier Required:</span>
          <span className="font-bold text-amber-300 font-mono">{requiredInfo.name}</span>
        </div>
      </div>

      {/* Action Button */}
      {onUpgradeTier && (
        <div className="pt-2">
          <button
            onClick={() => onUpgradeTier(minTierRequired)}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] cursor-pointer inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upgrade to {requiredInfo.name}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { X } from 'lucide-react';
import { TierAccessGate } from './subscriber/TierAccessGate';

interface AIAccessGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle: string;
  featureDescription: string;
  onUpgrade: () => void;
  isUpgrading?: boolean;
}

// Shown instead of an AI feature when the browsing reader isn't at least a
// Bookatlas Plus Member — reuses TierAccessGate purely for its locked-state
// card (this modal is only ever mounted when access is already known to be
// denied, so TierAccessGate's own children/hasAccess branch never fires).
export const AIAccessGateModal: React.FC<AIAccessGateModalProps> = ({
  isOpen,
  onClose,
  featureTitle,
  featureDescription,
  onUpgrade,
  isUpgrading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 shadow-md cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <TierAccessGate
          currentTier="free_reader"
          minTierRequired="member_subscriber"
          featureTitle={featureTitle}
          featureDescription={featureDescription}
          onUpgradeTier={isUpgrading ? undefined : onUpgrade}
        >
          {null}
        </TierAccessGate>
      </div>
    </div>
  );
};

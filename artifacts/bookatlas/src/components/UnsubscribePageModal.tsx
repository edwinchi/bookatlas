import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft, ShieldCheck, Heart, Volume2 } from 'lucide-react';

interface UnsubscribePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  token?: string;
  language?: 'en' | 'nl';
}

export const UnsubscribePageModal: React.FC<UnsubscribePageModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  token = '',
  language = 'en'
}) => {
  const isNl = language === 'nl';
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<'idle' | 'unsubscribed' | 'subscribed' | 'loading' | 'error'>('idle');
  const [subscriberData, setSubscriberData] = useState<any>(null);
  const [selectedReason, setSelectedReason] = useState('Too many emails');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      fetchSubscriberInfo(initialEmail, token);
    }
  }, [initialEmail, token]);

  const fetchSubscriberInfo = async (targetEmail: string, unsubToken?: string) => {
    try {
      const res = await fetch(`/api/subscribers/unsubscribe-info?email=${encodeURIComponent(targetEmail)}&token=${unsubToken || ''}`);
      const data = await res.json();
      if (data.success && data.exists) {
        setSubscriberData(data);
        if (data.status === 'unsubscribed') {
          setStatus('unsubscribed');
        }
      }
    } catch (e) {
      // Ignore network fallback
    }
  };

  const handleUnsubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/subscribers/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token,
          reason: selectedReason,
          resubscribe: false
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('unsubscribed');
        setFeedbackMessage(data.message || (isNl ? 'U bent succesvol uitgeschreven.' : 'You have been successfully unsubscribed.'));
      } else {
        setStatus('error');
        setFeedbackMessage(data.error || 'Failed to process request.');
      }
    } catch (err: any) {
      setStatus('error');
      setFeedbackMessage(err.message || 'Connection error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResubscribe = async () => {
    if (!email) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/subscribers/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token,
          resubscribe: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('subscribed');
        setFeedbackMessage(isNl ? 'Welkom terug! U bent opnieuw geabonneerd op Bookatlas.' : 'Welcome back! You have successfully re-subscribed to Bookatlas.');
      }
    } catch (err) {
      // fallback
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header Ribbon */}
        <div className="bg-slate-950 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">
                {isNl ? 'E-mail Voorkeuren & Uitschrijven' : 'Email Preferences & 1-Click Opt-Out'}
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Bookatlas Publishing Group &bull; Keizersgracht 421, Amsterdam
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {status === 'unsubscribed' ? (
            <div className="text-center space-y-4 py-3">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 font-serif">
                  {isNl ? 'U bent succesvol uitgeschreven' : 'You are successfully unsubscribed'}
                </h4>
                <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                  {isNl 
                    ? `Het adres (${email}) ontvangt geen marketingbulletins of nieuwe boekuitgaven meer van Bookatlas. Uw account blijft actief voor eReader-aankopen.`
                    : `Your email address (${email}) has been removed from all marketing broadcasts and book launch announcements. Your account access remains intact.`}
                </p>
              </div>

              {/* Resubscribe button if clicked by accident */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleResubscribe}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>{isNl ? 'Per ongeluk geklikt? Opnieuw abonneren' : 'Clicked by accident? Re-subscribe'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isNl ? 'Terug naar Bookstore' : 'Return to Bookstore'}
                </button>
              </div>
            </div>
          ) : status === 'subscribed' ? (
            <div className="text-center space-y-4 py-3">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
                <Heart className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 font-serif">
                  {isNl ? 'Welkom terug bij Bookatlas!' : 'Welcome back to Bookatlas!'}
                </h4>
                <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                  {isNl 
                    ? `Uw abonnement voor (${email}) is weer actief. U ontvangt exclusieve voorpublicaties, VIP kortingscodes en samengestelde filosofische werken.`
                    : `Your subscription for (${email}) is active again. You will continue receiving curated literary releases, audio previews, and VIP subscriber perks.`}
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isNl ? 'Verder Lezen' : 'Continue Reading'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="space-y-5">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold">{isNl ? 'GDPR & CAN-SPAM Conformiteit:' : 'CAN-SPAM & GDPR 1-Click Guarantee:'}</span>{' '}
                  {isNl 
                    ? 'Wij respecteren uw privacy. U kunt zich op elk moment met 1 klik direct uitschrijven van alle e-mailcampagnes.'
                    : 'We value your inbox peace. You can instantly opt-out from all newsletter digests and book release campaigns.'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isNl ? 'E-mailadres om uit te schrijven:' : 'Email address to unsubscribe:'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isNl ? 'Reden (optioneel):' : 'Reason for unsubscribing (optional):'}
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Too many emails">{isNl ? 'Te veel e-mails' : 'Too many emails'}</option>
                  <option value="Not interested in current genres">{isNl ? 'Niet geïnteresseerd in huidige genres' : 'Not interested in current genres'}</option>
                  <option value="Never signed up">{isNl ? 'Nooit zelf aangemeld' : 'Never signed up'}</option>
                  <option value="Temporary pause">{isNl ? 'Tijdelijke pauze' : 'Temporary reading break'}</option>
                </select>
              </div>

              {status === 'error' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{feedbackMessage}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isProcessing || !email.trim()}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isNl ? 'Verwerken...' : 'Processing Opt-Out...'}</span>
                    </>
                  ) : (
                    <span>{isNl ? '1-Klik Uitschrijven Bevestigen' : 'Confirm 1-Click Unsubscribe'}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {isNl ? 'Annuleren' : 'Keep Subscription'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

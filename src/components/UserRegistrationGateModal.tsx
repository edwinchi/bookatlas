import React, { useState } from 'react';
import { 
  BookOpen, 
  Mail, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  ArrowRight,
  Headphones,
  CheckCircle2,
  Globe,
  Flame,
  Award
} from 'lucide-react';
import { TRANSLATIONS } from '../data/translations';

interface UserRegistrationGateModalProps {
  isOpen: boolean;
  onSuccess: (userData: { email: string; name: string }) => void;
  language?: 'en' | 'nl';
}

export const UserRegistrationGateModal: React.FC<UserRegistrationGateModalProps> = ({
  isOpen,
  onSuccess,
  language = 'en'
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError(language === 'nl' ? 'Voer een geldig e-mailadres in om toegang te krijgen.' : 'Please enter a valid email address to unlock access.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, name: name.trim() || cleanEmail.split('@')[0] })
      });

      const data = await response.json();
      if (data.success && data.user) {
        // Persist registration in localStorage for instant seamless experience
        localStorage.setItem('bookatlas_registered_user', JSON.stringify(data.user));
        onSuccess(data.user);
      } else {
        // Fallback offline persistence
        const fallbackUser = {
          email: cleanEmail,
          name: name.trim() || cleanEmail.split('@')[0],
          registeredAt: Date.now(),
          lastActive: Date.now(),
          readingStreak: 1,
          booksRead: 0
        };
        localStorage.setItem('bookatlas_registered_user', JSON.stringify(fallbackUser));
        onSuccess(fallbackUser);
      }
    } catch (err) {
      // Local fallback
      const fallbackUser = {
        email: cleanEmail,
        name: name.trim() || cleanEmail.split('@')[0],
        registeredAt: Date.now(),
        lastActive: Date.now(),
        readingStreak: 1,
        booksRead: 0
      };
      localStorage.setItem('bookatlas_registered_user', JSON.stringify(fallbackUser));
      onSuccess(fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Top Hero Banner */}
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle glow background */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {t.guestPreviewBadge}
            </span>
            <span className="text-xs text-slate-400">Amsterdam & Global</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-white leading-tight">
            {t.registrationRequired}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            {t.registrationSubtitle}
          </p>

          {/* Quick Perks List */}
          <div className="grid grid-cols-2 gap-2 mt-5 text-[11px] font-medium text-slate-200">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Full In-Browser eReader</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Headphones className="w-3.5 h-3.5 text-indigo-300" />
              <span>Instant Audiobook Player</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Reading Streak & Stats</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Library PDF Dossier Export</span>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              {language === 'nl' ? 'E-mailadres (Vereist om te verkennen)' : 'Email Address (Required to Explore)'} *
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.fullName} ({language === 'nl' ? 'Optioneel' : 'Optional'})
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'nl' ? 'bijv. Sanne van Dijk' : 'e.g. Sanne van Dijk / Marcus'}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="terms-check"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="terms-check" className="text-[11px] text-slate-500 leading-snug cursor-pointer">
              {t.gdprNotice}
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !acceptTerms}
            className="w-full py-4 bg-gradient-to-r from-slate-950 via-indigo-900 to-slate-950 hover:from-slate-900 hover:to-indigo-900 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Registering & Initializing Digital Shelf...</span>
              </span>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>{t.startReading}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-slate-400 pt-1">
            Atlantean Globals Services B.V. • Amsterdam, Netherlands • DRM EPUB3 Compliant
          </p>
        </form>
      </div>
    </div>
  );
};

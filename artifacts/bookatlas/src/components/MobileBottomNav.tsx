import React from 'react';
import { 
  Compass, 
  Headphones, 
  Sparkles, 
  BookOpen, 
  ShoppingBag 
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'store' | 'library' | 'deals' | 'audiobooks' | 'bookatlasplus' | 'manager' | 'publish';
  setActiveTab: (tab: 'store' | 'library' | 'deals' | 'audiobooks' | 'bookatlasplus' | 'manager' | 'publish') => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAIHub: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  onOpenCart,
  onOpenAIHub,
}) => {
  return (
    <nav 
      aria-label="Mobile Navigation Bar" 
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {/* Store / Explore */}
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'store' || activeTab === 'deals' || activeTab === 'bookatlasplus'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Store Explore"
        >
          <Compass className={`w-5 h-5 mb-0.5 ${activeTab === 'store' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">Explore</span>
        </button>

        {/* Audiobooks */}
        <button
          type="button"
          onClick={() => setActiveTab('audiobooks')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'audiobooks'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Audio books"
        >
          <Headphones className={`w-5 h-5 mb-0.5 ${activeTab === 'audiobooks' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">Audio</span>
        </button>

        {/* AI Studio / Matchmaker */}
        <button
          type="button"
          onClick={onOpenAIHub}
          className="flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors cursor-pointer group"
          aria-label="Gemini AI Studio Hub"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm -mt-2 group-active:scale-95 transition-transform">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-bold">AI Studio</span>
        </button>

        {/* My Bookshelf */}
        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'library'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="My Bookshelf"
        >
          <BookOpen className={`w-5 h-5 mb-0.5 ${activeTab === 'library' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">Bookshelf</span>
        </button>

        {/* Cart Drawer */}
        <button
          type="button"
          onClick={onOpenCart}
          className="flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer relative"
          aria-label={`Cart (${cartCount} items)`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Cart</span>
        </button>
      </div>
    </nav>
  );
};


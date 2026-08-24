import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  ShoppingBag, 
  Sparkles, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Tag,
  BookOpen,
  Headphones
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveItem: (index: number) => void;
  onCheckout: () => void;
  currencySymbol?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  onCheckout,
  currencySymbol = '$',
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  if (!isOpen) return null;

  const rawSubtotal = cart.reduce((acc, item) => acc + item.book.price, 0);
  const discountAmount = (rawSubtotal * discountPercent) / 100;
  const total = Math.max(0, rawSubtotal - discountAmount);
  const totalSuperPoints = cart.reduce((acc, item) => acc + item.book.superPointsEarned, 0);

  const applyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'KOBO20' || promoCode.trim().toUpperCase() === 'READMORE') {
      setDiscountPercent(20);
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid promo code. Try "KOBO20" for 20% off.');
    }
  };

  const handleCompleteOrder = () => {
    setIsCheckingOut(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      setIsCheckingOut(false);
      onCheckout();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Cart Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#bf0000]" />
            <h2 className="text-base font-bold text-gray-900">Your Shopping Cart</h2>
            <span className="text-xs bg-[#bf0000]/10 text-[#bf0000] px-2 py-0.5 rounded-full font-bold">
              {cart.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Your cart is empty</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Browse our curated eBook & Audiobook catalog to add titles to your digital cart.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-[#bf0000] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#a60000]"
              >
                Browse Books
              </button>
            </div>
          ) : (
            cart.map((item, index) => (
              <div
                key={`${item.book.id}-${index}`}
                className="flex gap-3.5 p-3 rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-gray-300 transition-colors"
              >
                <img
                  src={item.book.coverImage}
                  alt={item.book.title}
                  className="w-16 aspect-[2/3] object-cover rounded-md shadow-xs border border-gray-200"
                  referrerPolicy="no-referrer"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-semibold">
                      {item.format === 'audiobook' ? (
                        <span className="flex items-center gap-0.5 text-indigo-700">
                          <Headphones className="w-2.5 h-2.5" /> Audiobook
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-gray-700">
                          <BookOpen className="w-2.5 h-2.5" /> eBook (EPUB)
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-gray-900 line-clamp-1 leading-tight mt-0.5">
                      {item.book.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate">{item.book.author}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-extrabold text-gray-950">
                      {item.book.price === 0 ? 'Free' : `${currencySymbol}${item.book.price.toFixed(2)}`}
                    </span>
                    <button
                      onClick={() => onRemoveItem(index)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Remove from cart"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout Footer */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-gray-200 bg-gray-50/80 space-y-4">
            
            {/* Promo Code Form */}
            <form onSubmit={applyPromo} className="space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promo code (e.g. KOBO20)"
                    disabled={promoApplied}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-gray-300 focus:outline-hidden focus:ring-1 focus:ring-[#bf0000] focus:border-[#bf0000] uppercase font-mono"
                  />
                  <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="submit"
                  disabled={promoApplied || !promoCode}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {promoApplied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : 'Apply'}
                </button>
              </div>

              {promoApplied && (
                <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> 20% discount coupon applied!
                </p>
              )}
              {promoError && <p className="text-[11px] text-red-600">{promoError}</p>}
            </form>

            {/* Price Calculations */}
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">{currencySymbol}{rawSubtotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount (20%)</span>
                  <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Digital Delivery</span>
                <span className="text-emerald-700 font-medium">Free (Instant)</span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline text-sm">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-lg font-black text-gray-950">
                  {currencySymbol}{total.toFixed(2)}
                </span>
              </div>

              {totalSuperPoints > 0 && (
                <div className="bg-emerald-50 text-emerald-800 p-2 rounded-lg text-[11px] flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Bookatlas Reader Club Points
                  </span>
                  <span className="font-bold">+{totalSuperPoints} points earned</span>
                </div>
              )}
            </div>

            {/* Checkout Action */}
            <button
              onClick={handleCompleteOrder}
              disabled={isCheckingOut}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75"
            >
              {isCheckingOut ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Processing Instant Digital Delivery...
                </span>
              ) : (
                <>
                  <span>Complete Instant Purchase</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Secure 256-bit SSL encrypted checkout • 30-Day Guarantee</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

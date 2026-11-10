import { useAuth } from '@clerk/react';
import { useEffect, useRef, useState } from 'react';

export class PaymentRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Stripe Checkout (TASK-0004): whether payments are live, starting a checkout, and the buyer's books. */
export function usePayments() {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/payments/config').then((r) => r.json()).then((d) => setEnabled(!!d.enabled)).catch(() => setEnabled(false));
  }, []);

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    let token: string | null = null;
    try { token = await tokenRef.current(); } catch { token = null; }
    const res = await fetch(path, {
      ...init, credentials: 'include',
      headers: { ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new PaymentRequestError(body.error ?? `Request failed (${res.status}).`, res.status);
    return body as T;
  };

  return {
    enabled,
    startCheckout: (bookIds: string[]) => request<{ url: string }>('/api/checkout/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookIds }),
    }),
    status: (sessionId: string) => request<{ paid: boolean; pending: boolean; bookIds: string[] }>(`/api/checkout/sessions/${encodeURIComponent(sessionId)}`),
    purchases: () => request<{ bookIds: string[] }>('/api/purchases').then((r) => r.bookIds),
  };
}

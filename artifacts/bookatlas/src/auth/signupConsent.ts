/** Mirrors PRIVACY_NOTICE_VERSION in the API; bump both when the privacy notice changes. */
export const PRIVACY_NOTICE_VERSION = '2026-11-08';
export const SIGNUP_CONSENT_KEY = 'bookatlas:signup-consent:v1';

export type SignupConsent = { ageConfirmed: true; privacyNoticeVersion: string };

type SessionStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const browserStore = (): SessionStore | undefined => {
  try { return window.sessionStorage; } catch { return undefined; }
};

/** Held only until the first profile sync after sign-up, which records it on the server. */
export function saveSignupConsent(store = browserStore()): void {
  const consent: SignupConsent = { ageConfirmed: true, privacyNoticeVersion: PRIVACY_NOTICE_VERSION };
  try { store?.setItem(SIGNUP_CONSENT_KEY, JSON.stringify(consent)); } catch { /* storage disabled */ }
}

export function readSignupConsent(store = browserStore()): SignupConsent | undefined {
  try {
    const value = JSON.parse(store?.getItem(SIGNUP_CONSENT_KEY) || 'null');
    return value?.ageConfirmed === true && typeof value.privacyNoticeVersion === 'string'
      ? { ageConfirmed: true, privacyNoticeVersion: value.privacyNoticeVersion }
      : undefined;
  } catch { return undefined; }
}

export function clearSignupConsent(store = browserStore()): void {
  try { store?.removeItem(SIGNUP_CONSENT_KEY); } catch { /* storage disabled */ }
}

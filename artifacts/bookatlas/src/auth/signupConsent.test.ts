import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRIVACY_NOTICE_VERSION as SERVER_VERSION } from '../../../api-server/src/bookatlas/account';
import { PRIVACY_NOTICE_VERSION, SIGNUP_CONSENT_KEY, clearSignupConsent, readSignupConsent, saveSignupConsent } from './signupConsent';

function memoryStore() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

test('client and server agree on the privacy notice version readers accept', () => {
  assert.equal(PRIVACY_NOTICE_VERSION, SERVER_VERSION);
});

test('sign-up consent survives until the first profile sync, then is cleared', () => {
  const store = memoryStore();
  assert.equal(readSignupConsent(store), undefined);
  saveSignupConsent(store);
  assert.deepEqual(readSignupConsent(store), { ageConfirmed: true, privacyNoticeVersion: PRIVACY_NOTICE_VERSION });
  clearSignupConsent(store);
  assert.equal(readSignupConsent(store), undefined);
});

test('tampered or malformed stored consent is ignored rather than sent', () => {
  const store = memoryStore();
  store.setItem(SIGNUP_CONSENT_KEY, '{not json');
  assert.equal(readSignupConsent(store), undefined);
  store.setItem(SIGNUP_CONSENT_KEY, JSON.stringify({ ageConfirmed: 'yes', privacyNoticeVersion: 'x' }));
  assert.equal(readSignupConsent(store), undefined);
  assert.equal(readSignupConsent(undefined), undefined, 'storage unavailable');
});

import { ReplitConnectors } from '@replit/connectors-sdk';
import type { PublishingReadinessCheck } from '@workspace/api-zod';

type ResendDomain = {
  id: string;
  name: string;
  status: string;
  capabilities?: { sending?: string };
};
type Proxy = (connector: string, path: string, options: { method: string }) => Promise<Response>;

/** Read only. No contacts, messages, API keys, or credentials are retrieved. */
export async function readSendingDomains(proxy: Proxy): Promise<ResendDomain[]> {
  const domains: ResendDomain[] = [];
  let after: string | undefined;
  const cursors = new Set<string>();
  for (let page = 0; page < 10; page++) {
    const response = await proxy('resend', `/domains?limit=100${after ? `&after=${encodeURIComponent(after)}` : ''}`, { method: 'GET' });
    if (!response.ok) throw new Error(`Resend domain check returned HTTP ${response.status}`);
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('data' in body) || !Array.isArray(body.data)) {
      throw new Error('Resend returned an invalid domain response');
    }
    for (const domain of body.data) {
      if (!domain || typeof domain.id !== 'string' || typeof domain.name !== 'string' || typeof domain.status !== 'string') {
        throw new Error('Resend returned invalid domain metadata');
      }
      domains.push(domain);
    }
    if (!('has_more' in body) || body.has_more !== true) return domains;
    after = domains.at(-1)?.id;
    if (!after || cursors.has(after)) throw new Error('Resend pagination did not advance');
    cursors.add(after);
  }
  throw new Error('Resend domain pagination limit reached; sender verification is incomplete');
}

export function emailReadiness(domains: ResendDomain[], sender?: string): PublishingReadinessCheck[] {
  const connection: PublishingReadinessCheck = {
    id: 'email-connection', label: 'Resend connection', state: 'verified',
    detail: 'Connected: Resend answered the read-only domain check. No email was sent.',
  };
  // Require a bare mailbox in configuration, not a guessed address at a verified domain.
  const mailbox = sender?.trim();
  const valid = !!mailbox && /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}$/i.test(mailbox);
  if (!valid) return [connection, {
    id: 'email-sender', label: 'Email sender', state: 'missing',
    detail: 'Set BOOKATLAS_EMAIL_FROM to the sender mailbox you want to use. A connected provider alone does not authorize sending.',
  }];
  const domain = mailbox.split('@')[1].toLowerCase();
  const verified = domains.some(item =>
    item.name.toLowerCase() === domain && item.status === 'verified' && item.capabilities?.sending === 'enabled',
  );
  return [connection, {
    id: 'email-sender', label: 'Email sender', state: verified ? 'verified' : 'blocked',
    detail: verified
      ? 'The configured sender domain is verified and enabled for sending. Delivery has not been tested.'
      : 'The configured sender domain is not verified and enabled for sending. Sending remains blocked.',
  }];
}

let cached: { expires: number; value: PublishingReadinessCheck[] } | undefined;
let inFlight: Promise<PublishingReadinessCheck[]> | undefined;

async function checkConnection(): Promise<PublishingReadinessCheck[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const connectors = new ReplitConnectors();
    const domains = await Promise.race([
      readSendingDomains((connector, path, options) => connectors.proxy(connector, path, options)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Resend domain check timed out')), 10_000);
      }),
    ]);
    return emailReadiness(domains, process.env.BOOKATLAS_EMAIL_FROM);
  } catch {
    // Do not expose raw proxy exceptions or provider payloads: these may contain private configuration.
    return [{
      id: 'email-connection', label: 'Resend connection', state: 'error',
      detail: 'Resend could not be verified. Check the connected integration and its domain-read permissions; no email was sent.',
    }, {
      id: 'email-sender', label: 'Email sender', state: 'blocked',
      detail: 'Sender verification is blocked until the provider check succeeds.',
    }];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Coalesced read-only check so refreshing the studio cannot flood the provider. */
export async function checkResendReadiness(): Promise<PublishingReadinessCheck[]> {
  if (cached && cached.expires > Date.now()) return cached.value;
  if (!inFlight) {
    inFlight = checkConnection().then(value => {
      cached = { value, expires: Date.now() + 30_000 };
      return value;
    }).finally(() => { inFlight = undefined; });
  }
  return inFlight;
}

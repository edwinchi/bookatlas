/**
 * Lulu Print API client (https://api.lulu.com/docs/). Lulu prints each order on demand and ships it to the reader;
 * Lulu charges the payment method saved in the BooksAtlas Lulu account.
 *
 * Configuration (Vercel environment, never committed):
 * - LULU_CLIENT_KEY, LULU_CLIENT_SECRET: the API keys from developers.lulu.com (sandbox) or the live account.
 * - LULU_ENV: 'production' for live printing; anything else uses the sandbox (no books are printed or charged).
 * The Lulu account must bill in euros, so prices, costs and payouts stay in one currency.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ShippingAddress, ShippingLevel } from './pricing.js';

export class LuluError extends Error {
  constructor(message: string, public status = 502, public detail?: unknown) { super(message); }
}

export interface LuluCost {
  currency: string;
  /** All amounts in cents, excluding tax. */
  printExcl: number;
  fulfilmentExcl: number;
  shippingExcl: number;
  /** What Lulu charges BooksAtlas in total, tax included. */
  totalIncl: number;
}

export interface LuluJob {
  id: number;
  status: string;
  statusMessage?: string;
  tracking: { id?: string; urls: string[]; carrier?: string }[];
}

export interface LuluFileCheck { id: number; status: string; pageCount?: number; errors: string[] }

export interface LuluClient {
  cost(input: { podPackageId: string; pageCount: number; quantity: number; level: ShippingLevel; address: Pick<ShippingAddress, 'city' | 'countryCode' | 'postcode' | 'stateCode' | 'street1' | 'phone'> }): Promise<LuluCost>;
  createJob(input: { externalId: string; email: string; title: string; podPackageId: string; quantity: number; interiorUrl: string; coverUrl: string; level: ShippingLevel; address: ShippingAddress }): Promise<LuluJob>;
  getJob(id: number): Promise<LuluJob>;
  validateInterior(sourceUrl: string): Promise<LuluFileCheck>;
  interiorCheck(id: number): Promise<LuluFileCheck>;
  validateCover(sourceUrl: string, podPackageId: string, pageCount: number): Promise<LuluFileCheck>;
  coverCheck(id: number): Promise<LuluFileCheck>;
  coverDimensions(podPackageId: string, pageCount: number): Promise<{ widthMm: number; heightMm: number }>;
}

let override: LuluClient | null = null;
/** Tests substitute a fake. */
export function setLuluClient(client: LuluClient | null) { override = client; }

export const luluConfigured = () => !!override || (!!process.env.LULU_CLIENT_KEY?.trim() && !!process.env.LULU_CLIENT_SECRET?.trim());
export const luluLive = () => process.env.LULU_ENV?.trim() === 'production';
const apiBase = () => (luluLive() ? 'https://api.lulu.com' : 'https://api.sandbox.lulu.com');

/** Lulu signs webhooks with HMAC-SHA256 of the raw body, keyed with the API secret. */
export function validLuluSignature(rawBody: Buffer, signature: string | undefined) {
  const secret = process.env.LULU_CLIENT_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(signature.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

const toCents = (v: unknown) => Math.round(Number(v ?? 0) * 100);

let token: { value: string; until: number } | null = null;
async function accessToken() {
  if (token && token.until > Date.now() + 30_000) return token.value;
  const key = process.env.LULU_CLIENT_KEY?.trim(), secret = process.env.LULU_CLIENT_SECRET?.trim();
  if (!key || !secret) throw new LuluError('Printed books are not set up yet.', 503);
  const res = await fetch(`${apiBase()}/auth/realms/glasstree/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new LuluError('The printer could not be reached. Please retry in a minute.', 503);
  const body = await res.json() as { access_token: string; expires_in: number };
  token = { value: body.access_token, until: Date.now() + body.expires_in * 1000 };
  return token.value;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    // Lulu explains rejected addresses, files and product codes; pass a short version on.
    const detail = typeof data === 'object' && data ? JSON.stringify(data).slice(0, 400) : String(data).slice(0, 400);
    throw new LuluError(res.status === 400 ? `The printer could not accept this: ${detail}` : 'The printer is temporarily unavailable. Please retry.', res.status === 400 ? 422 : 503, data);
  }
  return data as T;
}

type RawJob = { id: number; status?: { name?: string; message?: string }; line_items?: { tracking_id?: string; tracking_urls?: string[]; carrier_name?: string }[] };
const job = (r: RawJob): LuluJob => ({
  id: r.id, status: r.status?.name ?? 'CREATED', statusMessage: r.status?.message || undefined,
  tracking: (r.line_items ?? []).filter((l) => l.tracking_id || l.tracking_urls?.length).map((l) => ({ id: l.tracking_id, urls: l.tracking_urls ?? [], carrier: l.carrier_name })),
});
type RawCheck = { id: number; status: string; page_count?: number; errors?: unknown[] | null };
const check = (r: RawCheck): LuluFileCheck => ({ id: r.id, status: r.status, pageCount: r.page_count ?? undefined, errors: (r.errors ?? []).map((e) => (typeof e === 'string' ? e : JSON.stringify(e))) });

const luluAddress = (a: Partial<ShippingAddress>) => ({
  name: a.name, street1: a.street1, street2: a.street2, city: a.city, postcode: a.postcode, state_code: a.stateCode,
  country_code: a.countryCode, phone_number: a.phone, email: a.email,
});

const http: LuluClient = {
  async cost({ podPackageId, pageCount, quantity, level, address }) {
    const r = await call<{ currency: string; total_cost_incl_tax: string; line_item_costs: { total_cost_excl_tax: string }[]; shipping_cost: { total_cost_excl_tax: string }; fulfillment_cost?: { total_cost_excl_tax: string } }>(
      'POST', '/print-job-cost-calculations/',
      { line_items: [{ page_count: pageCount, pod_package_id: podPackageId, quantity }], shipping_address: luluAddress(address), shipping_option: level },
    );
    return {
      currency: r.currency,
      printExcl: r.line_item_costs.reduce((n, l) => n + toCents(l.total_cost_excl_tax), 0),
      fulfilmentExcl: toCents(r.fulfillment_cost?.total_cost_excl_tax),
      shippingExcl: toCents(r.shipping_cost.total_cost_excl_tax),
      totalIncl: toCents(r.total_cost_incl_tax),
    };
  },
  async createJob(i) {
    return job(await call<RawJob>('POST', '/print-jobs/', {
      contact_email: i.email,
      external_id: i.externalId,
      line_items: [{ external_id: i.externalId, title: i.title.slice(0, 200), quantity: i.quantity, printable_normalization: { cover: { source_url: i.coverUrl }, interior: { source_url: i.interiorUrl }, pod_package_id: i.podPackageId } }],
      shipping_address: luluAddress(i.address),
      shipping_level: i.level,
    }));
  },
  async getJob(id) { return job(await call<RawJob>('GET', `/print-jobs/${id}/`)); },
  async validateInterior(sourceUrl) { return check(await call<RawCheck>('POST', '/validate-interior/', { source_url: sourceUrl })); },
  async interiorCheck(id) { return check(await call<RawCheck>('GET', `/validate-interior/${id}/`)); },
  async validateCover(sourceUrl, podPackageId, pageCount) { return check(await call<RawCheck>('POST', '/validate-cover/', { source_url: sourceUrl, pod_package_id: podPackageId, interior_page_count: pageCount })); },
  async coverCheck(id) { return check(await call<RawCheck>('GET', `/validate-cover/${id}/`)); },
  async coverDimensions(podPackageId, pageCount) {
    const r = await call<{ width: string; height: string }>('POST', '/cover-dimensions/', { pod_package_id: podPackageId, interior_page_count: pageCount, unit: 'mm' });
    return { widthMm: Number(r.width), heightMm: Number(r.height) };
  },
};

export function lulu(): LuluClient {
  if (override) return override;
  if (!luluConfigured()) throw new LuluError('Printed books are not set up yet.', 503);
  return http;
}

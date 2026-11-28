import { randomUUID } from 'node:crypto';
import { getObject, listObjects, putObject, removeObject } from '../ebookPrep/store.js';

/**
 * Book enquiries (owner request 2026-11-18): "Start my book" and the other contact buttons were mailto links,
 * which do nothing on a computer or phone without an email app. Visitors now send the form on the site; each
 * enquiry is a small JSON file in the private book storage (no new table), and administrators answer by email.
 * Retention: enquiries are deleted 12 months after they arrive (see the privacy notice).
 */
export class EnquiryError extends Error { constructor(message: string, readonly status = 400) { super(message); } }

export const ENQUIRY_FORMATS = ['ebook', 'paperback', 'hardcover', 'audiobook'] as const;
// 'copyright': a rights holder reports a book (notice and action, EU Digital Services Act art. 16).
export const ENQUIRY_TOPICS = ['start', 'print', 'premium', 'ebook', 'audiobook', 'question', 'help', 'copyright'] as const;
export type EnquiryTopic = typeof ENQUIRY_TOPICS[number];

export interface Enquiry {
  id: string; createdAt: string; topic: EnquiryTopic;
  name: string; email: string; title: string; formats: string[];
  trimSize: string; paper: string; pages: number | null; message: string;
  status: 'new' | 'answered'; answeredAt: string | null; answeredBy: string | null;
}

const FOLDER = 'enquiries';
const key = (id: string) => `${FOLDER}/${id}.json`;
const EMAIL = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}$/i;
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);

/** The id starts with the time, so listing by name is newest first. */
const newId = () => `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`;
const ID = /^\d{14}-[0-9a-f]{8}$/;

export async function submitEnquiry(body: Record<string, unknown>): Promise<{ id: string; enquiry?: Enquiry }> {
  // A field people never see: bots fill it in. Pretend it worked.
  if (clean(body.website, 200)) return { id: 'received' };
  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const message = clean(body.message, 4000);
  if (!name) throw new EnquiryError('Please enter your name.');
  if (!EMAIL.test(email)) throw new EnquiryError('Please enter an email address we can reply to.');
  if (message.length < 10) throw new EnquiryError('Please tell us a little about your book or question (at least 10 characters).');
  const topic = (ENQUIRY_TOPICS as readonly string[]).includes(String(body.topic)) ? body.topic as EnquiryTopic : 'start';
  const formats = Array.isArray(body.formats) ? body.formats.map(String).filter((f) => (ENQUIRY_FORMATS as readonly string[]).includes(f)) : [];
  const pagesNum = Number(body.pages);
  const enquiry: Enquiry = {
    id: newId(), createdAt: new Date().toISOString(), topic, name, email,
    title: clean(body.title, 200), formats: [...new Set(formats)], trimSize: clean(body.trimSize, 40), paper: clean(body.paper, 40),
    pages: Number.isInteger(pagesNum) && pagesNum > 0 && pagesNum < 5000 ? pagesNum : null, message,
    status: 'new', answeredAt: null, answeredBy: null,
  };
  await putObject(key(enquiry.id), new TextEncoder().encode(JSON.stringify(enquiry)), 'application/json');
  return { id: enquiry.id, enquiry };
}

async function read(id: string): Promise<Enquiry> {
  if (!ID.test(id)) throw new EnquiryError('Enquiry not found.', 404);
  try { return JSON.parse(new TextDecoder().decode(await getObject(key(id)))) as Enquiry; } catch { throw new EnquiryError('Enquiry not found.', 404); }
}

export async function listEnquiries(): Promise<Enquiry[]> {
  const keys = await listObjects(FOLDER, 200);
  const all = await Promise.all(keys.map((k) => read(k.slice(FOLDER.length + 1, -'.json'.length)).catch(() => null)));
  return all.filter((e): e is Enquiry => !!e);
}

export async function setAnswered(id: string, answered: boolean, by: string): Promise<Enquiry> {
  const e = await read(id);
  const next: Enquiry = { ...e, status: answered ? 'answered' : 'new', answeredAt: answered ? new Date().toISOString() : null, answeredBy: answered ? by : null };
  await putObject(key(id), new TextEncoder().encode(JSON.stringify(next)), 'application/json');
  return next;
}

/** Retention: 12 months after the enquiry arrived. */
export async function purgeOldEnquiries(now = Date.now()) {
  const year = 365 * 86_400_000;
  for (const e of await listEnquiries()) {
    const age = now - Date.parse(e.createdAt);
    if (age > year) await removeObject(key(e.id)).catch(() => undefined);
  }
}

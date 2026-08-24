import { supabase } from './supabaseClient.js';
import type { Book } from '../src/types.js';
import type { ServerSubscriber, ServerCampaign } from '../server.js';

// Every function here is safe to call fire-and-forget (`void repo.fn(...)`):
// each one swallows its own errors and logs them, so a Supabase outage or
// misconfiguration never breaks the in-memory-backed API response that
// already went out to the client. In-memory stays the source of truth for
// the running process; Supabase is best-effort durable persistence on top.

const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type RegisteredUser = {
  email: string;
  name?: string;
  registeredAt: number;
  lastActive: number;
  readingStreak: number;
  booksRead: number;
};

// ---------- Books ----------

export async function hydrateBooksFromDb(): Promise<Book[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('books').select('data').order('updated_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data.map((row: any) => row.data as Book);
  } catch (err) {
    console.error('[db] hydrateBooksFromDb failed:', err);
    return null;
  }
}

export async function seedBooksInDb(books: Book[]): Promise<void> {
  if (!supabase || books.length === 0) return;
  try {
    for (const group of chunk(books, CHUNK_SIZE)) {
      const { error } = await supabase.from('books').upsert(
        group.map((b) => ({ id: b.id, title: b.title, author: b.author, primary_genre: b.primaryGenre, price: b.price, data: b }))
      );
      if (error) throw error;
    }
  } catch (err) {
    console.error('[db] seedBooksInDb failed:', err);
  }
}

export async function upsertBookInDb(book: Book): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('books')
      .upsert({ id: book.id, title: book.title, author: book.author, primary_genre: book.primaryGenre, price: book.price, data: book, updated_at: new Date().toISOString() });
    if (error) throw error;
  } catch (err) {
    console.error('[db] upsertBookInDb failed:', err);
  }
}

export async function deleteBookFromDb(id: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('[db] deleteBookFromDb failed:', err);
  }
}

export async function replaceAllBooksInDb(books: Book[]): Promise<void> {
  if (!supabase) return;
  try {
    const { error: delError } = await supabase.from('books').delete().neq('id', '__none__');
    if (delError) throw delError;
    await seedBooksInDb(books);
  } catch (err) {
    console.error('[db] replaceAllBooksInDb failed:', err);
  }
}

// ---------- Categories ----------

export async function hydrateCategoriesFromDb(): Promise<string[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('categories').select('name');
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data.map((row: any) => row.name as string);
  } catch (err) {
    console.error('[db] hydrateCategoriesFromDb failed:', err);
    return null;
  }
}

export async function seedCategoriesInDb(names: string[]): Promise<void> {
  if (!supabase || names.length === 0) return;
  try {
    const { error } = await supabase.from('categories').upsert(names.map((name) => ({ name })));
    if (error) throw error;
  } catch (err) {
    console.error('[db] seedCategoriesInDb failed:', err);
  }
}

export async function addCategoryToDb(name: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('categories').upsert({ name });
    if (error) throw error;
  } catch (err) {
    console.error('[db] addCategoryToDb failed:', err);
  }
}

export async function removeCategoryFromDb(name: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('categories').delete().eq('name', name);
    if (error) throw error;
  } catch (err) {
    console.error('[db] removeCategoryFromDb failed:', err);
  }
}

// ---------- Registered Users ----------

export async function hydrateUsersFromDb(): Promise<RegisteredUser[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('registered_users').select('*');
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data.map((row: any) => ({
      email: row.email,
      name: row.name ?? undefined,
      registeredAt: Number(row.registered_at),
      lastActive: Number(row.last_active),
      readingStreak: row.reading_streak,
      booksRead: row.books_read,
    }));
  } catch (err) {
    console.error('[db] hydrateUsersFromDb failed:', err);
    return null;
  }
}

export async function seedUsersInDb(users: RegisteredUser[]): Promise<void> {
  if (!supabase || users.length === 0) return;
  try {
    const { error } = await supabase.from('registered_users').upsert(users.map(toUserRow));
    if (error) throw error;
  } catch (err) {
    console.error('[db] seedUsersInDb failed:', err);
  }
}

export async function upsertUserInDb(user: RegisteredUser): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('registered_users').upsert(toUserRow(user));
    if (error) throw error;
  } catch (err) {
    console.error('[db] upsertUserInDb failed:', err);
  }
}

function toUserRow(u: RegisteredUser) {
  return {
    email: u.email,
    name: u.name ?? null,
    registered_at: u.registeredAt,
    last_active: u.lastActive,
    reading_streak: u.readingStreak,
    books_read: u.booksRead,
  };
}

// ---------- Subscribers ----------

function toSubscriberRow(s: ServerSubscriber) {
  return {
    email: s.email,
    name: s.name ?? null,
    tier: s.tier ?? null,
    status: s.status,
    subscribed_at: s.subscribedAt,
    unsubscribed_at: s.unsubscribedAt ?? null,
    tags: s.tags,
    source: s.source,
    unsubscribe_token: s.unsubscribeToken,
    emails_received_count: s.emailsReceivedCount,
    last_email_sent_at: s.lastEmailSentAt ?? null,
    last_opened_at: s.lastOpenedAt ?? null,
    last_clicked_at: s.lastClickedAt ?? null,
    bounce_reason: s.bounceReason ?? null,
    reading_interests: s.readingInterests ?? null,
    user_discount_code: s.userDiscountCode ?? null,
    reading_streak_days: s.readingStreakDays ?? null,
    pages_read_total: s.pagesReadTotal ?? null,
  };
}

function fromSubscriberRow(row: any): ServerSubscriber {
  return {
    email: row.email,
    name: row.name ?? undefined,
    tier: row.tier ?? undefined,
    status: row.status,
    subscribedAt: Number(row.subscribed_at),
    unsubscribedAt: row.unsubscribed_at != null ? Number(row.unsubscribed_at) : undefined,
    tags: row.tags ?? [],
    source: row.source,
    unsubscribeToken: row.unsubscribe_token,
    emailsReceivedCount: row.emails_received_count,
    lastEmailSentAt: row.last_email_sent_at != null ? Number(row.last_email_sent_at) : undefined,
    lastOpenedAt: row.last_opened_at != null ? Number(row.last_opened_at) : undefined,
    lastClickedAt: row.last_clicked_at != null ? Number(row.last_clicked_at) : undefined,
    bounceReason: row.bounce_reason ?? undefined,
    readingInterests: row.reading_interests ?? undefined,
    userDiscountCode: row.user_discount_code ?? undefined,
    readingStreakDays: row.reading_streak_days ?? undefined,
    pagesReadTotal: row.pages_read_total ?? undefined,
  };
}

export async function hydrateSubscribersFromDb(): Promise<Map<string, ServerSubscriber> | null> {
  if (!supabase) return null;
  try {
    const map = new Map<string, ServerSubscriber>();
    const pageSize = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await supabase.from('subscribers').select('*').range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const row of data) map.set(row.email, fromSubscriberRow(row));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return map.size > 0 ? map : null;
  } catch (err) {
    console.error('[db] hydrateSubscribersFromDb failed:', err);
    return null;
  }
}

export async function seedSubscribersInDb(subs: ServerSubscriber[]): Promise<void> {
  return bulkUpsertSubscribersInDb(subs);
}

export async function upsertSubscriberInDb(sub: ServerSubscriber): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('subscribers').upsert(toSubscriberRow(sub));
    if (error) throw error;
  } catch (err) {
    console.error('[db] upsertSubscriberInDb failed:', err);
  }
}

export async function bulkUpsertSubscribersInDb(subs: ServerSubscriber[]): Promise<void> {
  if (!supabase || subs.length === 0) return;
  try {
    for (const group of chunk(subs, CHUNK_SIZE)) {
      const { error } = await supabase.from('subscribers').upsert(group.map(toSubscriberRow));
      if (error) throw error;
    }
  } catch (err) {
    console.error('[db] bulkUpsertSubscribersInDb failed:', err);
  }
}

export async function deleteSubscriberFromDb(email: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('subscribers').delete().eq('email', email);
    if (error) throw error;
  } catch (err) {
    console.error('[db] deleteSubscriberFromDb failed:', err);
  }
}

export async function bulkDeleteSubscribersFromDb(emails: string[]): Promise<void> {
  if (!supabase || emails.length === 0) return;
  try {
    for (const group of chunk(emails, CHUNK_SIZE)) {
      const { error } = await supabase.from('subscribers').delete().in('email', group);
      if (error) throw error;
    }
  } catch (err) {
    console.error('[db] bulkDeleteSubscribersFromDb failed:', err);
  }
}

// ---------- Campaigns ----------

export async function hydrateCampaignsFromDb(): Promise<ServerCampaign[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('campaigns').select('data').order('sent_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data.map((row: any) => row.data as ServerCampaign);
  } catch (err) {
    console.error('[db] hydrateCampaignsFromDb failed:', err);
    return null;
  }
}

export async function seedCampaignsInDb(campaigns: ServerCampaign[]): Promise<void> {
  if (!supabase || campaigns.length === 0) return;
  try {
    const { error } = await supabase.from('campaigns').upsert(campaigns.map((c) => ({ id: c.id, sent_at: c.sentAt, data: c })));
    if (error) throw error;
  } catch (err) {
    console.error('[db] seedCampaignsInDb failed:', err);
  }
}

export async function addCampaignToDb(campaign: ServerCampaign): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('campaigns').upsert({ id: campaign.id, sent_at: campaign.sentAt, data: campaign });
    if (error) throw error;
  } catch (err) {
    console.error('[db] addCampaignToDb failed:', err);
  }
}

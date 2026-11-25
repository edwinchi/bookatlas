import { createClerkClient } from '@clerk/express';
import type { BookatlasTable } from '../bookatlas/db/tables';
import { bookatlasDb } from '../bookatlas/db/supabaseClient';
import { logger } from '../lib/logger';

/**
 * Moving accounts from the Clerk development instance to the production instance (owner request 2026-11-24).
 *
 * A Clerk instance gives every user its own id, and BooksAtlas keys each reader's data (purchases, invoices,
 * bookshelf, notes, submissions, payouts…) by that id. So the first time someone signs in on the production instance,
 * the server looks up the same verified email in the previous instance (`CLERK_PREVIOUS_SECRET_KEY`), moves every
 * row from the old id to the new one, copies the administrator role and sign-up consent, and marks the new account
 * so the move runs only once. Without `CLERK_PREVIOUS_SECRET_KEY` nothing happens. Remove that variable once
 * everyone has signed in again (or after 90 days); see docs/runbooks/accounts-and-auth.md.
 */

/** Every column that holds a Clerk user id. `accountMove.test.ts` checks this against schema.sql. */
export const USER_ID_COLUMNS: readonly (readonly [BookatlasTable, string])[] = [
  ['purchases', 'user_id'], ['invoices', 'user_id'], ['crypto_orders', 'user_id'], ['author_payouts', 'user_id'],
  ['reader_progress', 'user_id'], ['reader_annotations', 'user_id'], ['reader_preferences', 'user_id'],
  ['reading_sessions', 'user_id'], ['follows', 'user_id'], ['reviews', 'user_id'],
  ['reading_group_members', 'user_id'], ['reading_group_posts', 'user_id'], ['reader_reports', 'reporter_id'],
  ['ebook_submissions', 'owner_id'], ['publishing_jobs', 'owner_id'], ['narrations', 'owner_id'], ['reading_groups', 'owner_id'],
  ['reading_classes', 'owner_id'], ['reading_class_members', 'user_id'],
];

export const MOVE_FLAG = 'bookatlasAccountMove';

export interface MoveUser {
  id: string;
  email: string;
  publicMetadata: Record<string, unknown>;
  privateMetadata: Record<string, unknown>;
}

export interface MoveDeps {
  /** The user with this verified email in the previous instance, if any. */
  findPrevious(email: string): Promise<MoveUser | undefined>;
  /** Re-keys one column; returns an error message or undefined. */
  rekey(table: BookatlasTable, column: string, from: string, to: string): Promise<string | undefined>;
  updateMetadata(userId: string, metadata: { publicMetadata?: Record<string, unknown>; privateMetadata: Record<string, unknown> }): Promise<void>;
}

export async function moveAccount(user: MoveUser, deps: MoveDeps, now = new Date()) {
  if (user.privateMetadata[MOVE_FLAG]) return { moved: false as const, reason: 'done' };
  const previous = await deps.findPrevious(user.email);
  const at = now.toISOString();
  if (!previous || previous.id === user.id) {
    await deps.updateMetadata(user.id, { privateMetadata: { [MOVE_FLAG]: { from: null, at } } });
    return { moved: false as const, reason: 'no previous account' };
  }
  const failed: string[] = [];
  for (const [table, column] of USER_ID_COLUMNS) {
    const error = await deps.rekey(table, column, previous.id, user.id);
    if (error) failed.push(`${table}.${column}: ${error}`);
  }
  // Leave the flag unset so the next sign-in retries; rows already moved are simply not found again.
  if (failed.length) return { moved: false as const, reason: 'failed', failed };

  const publicMetadata = { ...user.publicMetadata };
  if (previous.publicMetadata.role === 'admin') publicMetadata.role = 'admin';
  const privateMetadata: Record<string, unknown> = { [MOVE_FLAG]: { from: previous.id, at } };
  if (!user.privateMetadata.bookatlasSignupConsent && previous.privateMetadata.bookatlasSignupConsent) {
    privateMetadata.bookatlasSignupConsent = previous.privateMetadata.bookatlasSignupConsent;
  }
  await deps.updateMetadata(user.id, { publicMetadata, privateMetadata });
  return { moved: true as const, from: previous.id, publicMetadata };
}

function clerkDeps(previousSecretKey: string, current: { updateUserMetadata: MoveDeps['updateMetadata'] }): MoveDeps {
  const previous = createClerkClient({ secretKey: previousSecretKey });
  return {
    async findPrevious(email) {
      const { data } = await previous.users.getUserList({ emailAddress: [email], limit: 5 });
      const match = data.find((u) => u.emailAddresses.some((a) => a.emailAddress.toLowerCase() === email && a.verification?.status === 'verified'));
      return match && { id: match.id, email, publicMetadata: match.publicMetadata as Record<string, unknown>, privateMetadata: match.privateMetadata as Record<string, unknown> };
    },
    async rekey(table, column, from, to) {
      if (!bookatlasDb) return 'no database';
      const r = await bookatlasDb.from(table).update({ [column]: to }).eq(column, from);
      return r.error ? r.error.message : undefined;
    },
    updateMetadata: (id, metadata) => current.updateUserMetadata(id, metadata),
  };
}

const inFlight = new Map<string, Promise<unknown>>();

/** Runs the move once per account (parallel first requests share one run). Never blocks sign-in on failure. */
export async function moveAccountFromPreviousInstance(user: MoveUser, current: { updateUserMetadata(id: string, m: object): Promise<unknown> }) {
  const key = process.env.CLERK_PREVIOUS_SECRET_KEY?.trim();
  if (!key || user.privateMetadata[MOVE_FLAG]) return undefined;
  let run = inFlight.get(user.id);
  if (!run) {
    run = moveAccount(user, clerkDeps(key, { updateUserMetadata: async (id, m) => { await current.updateUserMetadata(id, m); } }))
      .then((result) => {
        if (result.moved) logger.info({ event: 'account.moved', userId: user.id, from: result.from }, 'Account moved from the previous sign-in instance');
        else if (result.reason === 'failed') logger.error({ event: 'account.move_failed', userId: user.id, failed: result.failed }, 'Account move incomplete; retried at next sign-in');
        return result;
      })
      .catch((err) => { logger.error({ err, event: 'account.move_failed', userId: user.id }, 'Account move failed; retried at next sign-in'); return undefined; })
      .finally(() => inFlight.delete(user.id));
    inFlight.set(user.id, run);
  }
  return run as Promise<Awaited<ReturnType<typeof moveAccount>> | undefined>;
}

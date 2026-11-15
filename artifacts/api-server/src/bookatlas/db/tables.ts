/** Fixed namespace: never query or mutate the shared project's unprefixed tables. */
export const BOOKATLAS_TABLES = Object.freeze({
  books: 'bookatlas_books',
  categories: 'bookatlas_categories',
  registered_users: 'bookatlas_registered_users',
  subscribers: 'bookatlas_subscribers',
  campaigns: 'bookatlas_campaigns',
  publishing_jobs: 'bookatlas_publishing_jobs',
  publishing_messages: 'bookatlas_publishing_messages',
  publishing_test_books: 'bookatlas_publishing_test_books',
  ebook_submissions: 'bookatlas_ebook_submissions',
  prep_feedback: 'bookatlas_prep_feedback',
  purchases: 'bookatlas_purchases',
  invoices: 'bookatlas_invoices',
  narrations: 'bookatlas_narrations',
  reviews: 'bookatlas_reviews',
  follows: 'bookatlas_follows',
  crypto_orders: 'bookatlas_crypto_orders',
  author_payouts: 'bookatlas_author_payouts',
  reader_progress: 'bookatlas_reader_progress',
  reader_annotations: 'bookatlas_reader_annotations',
  reader_preferences: 'bookatlas_reader_preferences',
  reading_sessions: 'bookatlas_reading_sessions',
} as const);

export type BookatlasTable = keyof typeof BOOKATLAS_TABLES;

export function bookatlasTable(table: BookatlasTable): string {
  if (!Object.hasOwn(BOOKATLAS_TABLES, table)) throw new Error('Unknown BooksAtlas table');
  return BOOKATLAS_TABLES[table];
}

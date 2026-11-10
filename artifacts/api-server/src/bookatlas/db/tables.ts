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
} as const);

export type BookatlasTable = keyof typeof BOOKATLAS_TABLES;

export function bookatlasTable(table: BookatlasTable): string {
  if (!Object.hasOwn(BOOKATLAS_TABLES, table)) throw new Error('Unknown Bookatlas table');
  return BOOKATLAS_TABLES[table];
}

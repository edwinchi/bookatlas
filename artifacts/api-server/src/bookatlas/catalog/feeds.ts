/**
 * Distributor feeds (TASK-0005, S2): CSV and ONIX 3.0 product records become catalogue books.
 * Imported titles are listed, not sold, until the distributor delivers the files.
 */
import type { Book } from '@workspace/bookatlas-catalog/types';
import { isValidIsbn, normaliseIsbn } from '@workspace/bookatlas-catalog/publishing';
import { decodeEntities } from '../ebookPrep/opf.js';

export interface FeedRecord {
  isbn: string; title: string; subtitle?: string; authors: string[]; narrators: string[];
  format: Book['format']; language: string; price: number; categories: string[]; description: string;
  coverUrl?: string; publisher?: string; publishDate?: string; pageCount?: number; durationMinutes?: number; tags: string[];
}
export interface FeedResult { books: Book[]; errors: { record: string; reason: string }[] }

export const MAX_FEED_RECORDS = 5000;

/** RFC 4180: quoted fields may hold commas, quotes ("") and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

/** BISAC subject prefixes (US trade) and Thema codes (international) to BookAtlas categories. */
const BISAC: [RegExp, string][] = [
  [/^FIC0(28|09)/, 'Sci-Fi & Fantasy'], [/^FIC022/, 'Mystery & Suspense'], [/^FIC031/, 'Thriller & Crime'],
  [/^FIC027/, 'Romance & Contemporary'], [/^FIC014/, 'Historical Fiction'], [/^FIC/, 'Fiction & Literature'],
  [/^CGN/, 'Graphic Novels & Manga'], [/^BIO/, 'Biography & Memoir'], [/^BUS/, 'Business & Leadership'],
  [/^(SEL|PSY)/, 'Self-Improvement & Psychology'], [/^PHI/, 'Philosophy & Deep Thought'], [/^POE/, 'Poetry & Anthologies'],
  [/^(SCI|TEC|COM|MAT)/, 'Science & Technology'], [/^OCC/, 'Consciousness & Ancient Wisdom'], [/^BOD/, 'Holistic Energy, Chakras & Kundalini'],
  [/^SOC0(01|56)/, 'African Diaspora & Black Studies'], [/^HIS001/, 'Pan-African History & Civilizations'],
];
const THEMA: [RegExp, string][] = [
  [/^FM/, 'Sci-Fi & Fantasy'], [/^FF/, 'Mystery & Suspense'], [/^FH/, 'Thriller & Crime'], [/^FR/, 'Romance & Contemporary'],
  [/^FV/, 'Historical Fiction'], [/^F/, 'Fiction & Literature'], [/^X/, 'Graphic Novels & Manga'], [/^DN/, 'Biography & Memoir'],
  [/^K/, 'Business & Leadership'], [/^VS/, 'Self-Improvement & Psychology'], [/^Q[DR]/, 'Philosophy & Deep Thought'], [/^DC/, 'Poetry & Anthologies'],
  [/^[PTU]/, 'Science & Technology'], [/^VX/, 'Consciousness & Ancient Wisdom'],
];

export function mapCategory(value: string, known: Set<string>): string | null {
  const v = value.trim();
  if (!v) return null;
  if (known.has(v)) return v;
  const code = v.toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z]{3}\d{6}$/.test(code)) return BISAC.find(([re]) => re.test(code))?.[1] ?? 'Non-Fiction & Essays';
  if (/^[A-Z0-9]{1,8}$/.test(code)) return THEMA.find(([re]) => re.test(code))?.[1] ?? null;
  return null;
}

const FORMATS: Record<string, Book['format']> = { ebook: 'ebook', epub: 'ebook', audiobook: 'audiobook', audio: 'audiobook', bundle: 'bundle' };
const https = (url: string | undefined) => (url && /^https:\/\/[^\s"<>]+$/i.test(url.trim()) ? url.trim() : undefined);

export function recordToBook(r: FeedRecord, known: Set<string>): Book {
  if (!isValidIsbn(r.isbn)) throw new Error('ISBN-13 missing or invalid.');
  if (!r.title.trim()) throw new Error('Title missing.');
  if (!r.authors.length) throw new Error('Author missing.');
  if (!Number.isFinite(r.price) || r.price < 0 || r.price > 10_000) throw new Error('Price missing or invalid.');
  const categories = [...new Set(r.categories.map((c) => mapCategory(c, known)).filter((c): c is string => !!c))].slice(0, 3);
  const genres = categories.length ? categories : [r.format === 'audiobook' ? 'Fiction & Literature' : 'Non-Fiction & Essays'];
  const isbn = normaliseIsbn(r.isbn);
  const price = Math.round(r.price * 100) / 100;
  return {
    id: `isbn-${isbn}`, availability: 'listed',
    title: r.title.trim().slice(0, 300), subtitle: r.subtitle?.trim().slice(0, 300) || undefined,
    author: r.authors.join(', ').slice(0, 300), narrator: r.narrators.join(', ').slice(0, 300) || undefined,
    authorBio: '', coverImage: https(r.coverUrl) ?? '', price, originalPrice: price,
    isDeal: false, isBestseller: false, isNewRelease: false, rating: 0, reviewCount: 0, format: r.format,
    genres, primaryGenre: genres[0]!, pageCount: Math.max(0, Math.round(r.pageCount ?? 0)),
    audioDurationMinutes: r.durationMinutes && r.durationMinutes > 0 ? Math.round(r.durationMinutes) : undefined,
    publishDate: r.publishDate ?? '', publisher: r.publisher?.trim() ?? '', isbn, language: r.language || 'English',
    synopsis: r.description.trim().slice(0, 4000), editorialReview: '', sampleChapters: [], superPointsEarned: 0,
    tags: r.tags.slice(0, 12), reviews: [], readingTimeHours: Math.max(1, Math.round((r.pageCount ?? 300) / 45)),
  } as Book;
}

/** Columns: isbn,title,subtitle,author,narrator,format,language,price,categories,description,cover_url,publisher,publish_date,page_count,duration_minutes,tags. Lists use "|". */
export function csvToRecords(text: string): { records: FeedRecord[]; errors: FeedResult['errors'] } {
  const [header, ...rows] = parseCsv(text);
  if (!header) return { records: [], errors: [{ record: 'file', reason: 'The CSV is empty.' }] };
  const col = new Map(header.map((h, i) => [h.trim().toLowerCase().replace(/\s+/g, '_'), i]));
  for (const required of ['isbn', 'title', 'author', 'price']) {
    if (!col.has(required)) return { records: [], errors: [{ record: 'header', reason: `Missing the "${required}" column.` }] };
  }
  const get = (row: string[], key: string) => (col.has(key) ? (row[col.get(key)!] ?? '').trim() : '');
  const list = (v: string) => v.split('|').map((x) => x.trim()).filter(Boolean);
  const num = (v: string) => (v ? Number(v.replace(',', '.')) : undefined);
  return {
    records: rows.slice(0, MAX_FEED_RECORDS).map((row) => ({
      isbn: get(row, 'isbn'), title: get(row, 'title'), subtitle: get(row, 'subtitle'), authors: list(get(row, 'author')),
      narrators: list(get(row, 'narrator')), format: FORMATS[get(row, 'format').toLowerCase()] ?? 'ebook', language: get(row, 'language'),
      price: num(get(row, 'price')) ?? NaN, categories: list(get(row, 'categories')), description: get(row, 'description'),
      coverUrl: get(row, 'cover_url'), publisher: get(row, 'publisher'), publishDate: get(row, 'publish_date'),
      pageCount: num(get(row, 'page_count')), durationMinutes: num(get(row, 'duration_minutes')), tags: list(get(row, 'tags')),
    })),
    errors: rows.length > MAX_FEED_RECORDS ? [{ record: 'file', reason: `Only the first ${MAX_FEED_RECORDS} rows of a part are read; send the rest in further parts.` }] : [],
  };
}

const inner = (xml: string, tag: string) => new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml)?.[1];
const all = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1]!);
const text = (xml: string | undefined, tag: string) => (xml ? decodeEntities((inner(xml, tag) ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : '');
const LANGUAGES: Record<string, string> = { eng: 'English', dut: 'Dutch', nld: 'Dutch', fre: 'French', fra: 'French', ger: 'German', deu: 'German', spa: 'Spanish', por: 'Portuguese', swa: 'Swahili', yor: 'Yoruba', ibo: 'Igbo', hau: 'Hausa', zul: 'Zulu', amh: 'Amharic', ara: 'Arabic' };

/** ONIX 3.0 reference tags: the fields a storefront needs from each <Product>. */
export function onixToRecords(xml: string): { records: FeedRecord[]; errors: FeedResult['errors'] } {
  if (/<!ENTITY/i.test(xml)) return { records: [], errors: [{ record: 'file', reason: 'Entity declarations are not accepted.' }] };
  const products = all(xml, 'Product');
  if (!products.length && /<product[\s>]/.test(xml)) return { records: [], errors: [{ record: 'file', reason: 'Send ONIX 3.0 with reference tags (<Product>), not short tags.' }] };
  return {
    records: products.slice(0, MAX_FEED_RECORDS).map((p) => {
      const isbn = all(p, 'ProductIdentifier').find((id) => text(id, 'ProductIDType') === '15');
      const detail = inner(p, 'DescriptiveDetail') ?? '';
      const form = text(detail, 'ProductForm');
      const contributors = all(detail, 'Contributor');
      const named = (role: string) => contributors.filter((c) => all(c, 'ContributorRole').some((r) => r.trim() === role))
        .map((c) => text(c, 'PersonName') || [text(c, 'NamesBeforeKey'), text(c, 'KeyNames')].filter(Boolean).join(' ') || text(c, 'CorporateName')).filter(Boolean);
      const title = inner(detail, 'TitleDetail');
      const descriptions = all(inner(p, 'CollateralDetail') ?? '', 'TextContent');
      const description = descriptions.find((t) => ['03', '02'].includes(text(t, 'TextType')));
      const cover = all(inner(p, 'CollateralDetail') ?? '', 'SupportingResource').find((r) => text(r, 'ResourceContentType') === '01');
      const date = all(inner(p, 'PublishingDetail') ?? '', 'PublishingDate').find((d) => text(d, 'PublishingDateRole') === '01');
      const raw = text(date, 'Date');
      const prices = all(inner(p, 'ProductSupply') ?? '', 'Price');
      const price = prices.find((x) => text(x, 'CurrencyCode') === 'EUR') ?? prices[0];
      const extent = all(detail, 'Extent');
      const pages = extent.find((e) => ['00', '07', '08'].includes(text(e, 'ExtentType')) && text(e, 'ExtentUnit') === '03');
      const minutes = extent.find((e) => text(e, 'ExtentType') === '09' && ['05', '06'].includes(text(e, 'ExtentUnit')));
      return {
        isbn: text(isbn, 'IDValue'), title: text(title, 'TitleText') || [text(title, 'TitlePrefix'), text(title, 'TitleWithoutPrefix')].filter(Boolean).join(' '),
        subtitle: text(title, 'Subtitle'), authors: named('A01'), narrators: named('E07'),
        format: /^A[A-Z]$/.test(form) ? 'audiobook' : 'ebook',
        language: LANGUAGES[text(inner(detail, 'Language'), 'LanguageCode')] ?? 'English',
        price: Number(text(price, 'PriceAmount')), categories: all(detail, 'Subject').map((s) => text(s, 'SubjectCode') || text(s, 'SubjectHeadingText')),
        description: text(description, 'Text'), coverUrl: text(cover, 'ResourceLink'), publisher: text(inner(p, 'PublishingDetail'), 'PublisherName'),
        publishDate: /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw,
        pageCount: Number(text(pages, 'ExtentValue')) || undefined,
        durationMinutes: minutes ? Number(text(minutes, 'ExtentValue')) * (text(minutes, 'ExtentUnit') === '06' ? 60 : 1) || undefined : undefined,
        tags: [],
      } satisfies FeedRecord;
    }),
    errors: products.length > MAX_FEED_RECORDS ? [{ record: 'file', reason: `Only the first ${MAX_FEED_RECORDS} products of a part are read.` }] : [],
  };
}

export function feedToBooks(kind: 'csv' | 'onix', body: string, known: Set<string>): FeedResult {
  const { records, errors } = kind === 'csv' ? csvToRecords(body) : onixToRecords(body);
  const books: Book[] = [];
  records.forEach((r, i) => {
    try { books.push(recordToBook(r, known)); }
    catch (error) { errors.push({ record: r.isbn || `${kind === 'csv' ? 'row' : 'product'} ${i + 1}`, reason: (error as Error).message }); }
  });
  return { books, errors };
}

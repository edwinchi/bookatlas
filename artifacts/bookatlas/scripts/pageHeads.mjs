// Each public page's own head (2026-11-27): the app is one HTML file, so every address used to be served with the
// home page's title, description and canonical link, which told search engines the pages were copies of the home
// page. After `vite build`, write-page-heads.mjs writes one copy of index.html per page with its own head, and
// vercel.json serves each address its copy. Tested in pageHeads.test.ts.

export const SITE = 'https://booksatlas.app';

/** @type {{ path: string; file: string; title: string; description: string }[]} */
export const PAGES = [
  {
    path: '/pricing', file: 'pricing',
    title: 'Pricing calculator: what you earn | BooksAtlas',
    description: 'Work out what each format costs and what every sale earns. Authors keep 81% of every eBook and audiobook sale on BooksAtlas, or 91% with Author Pro.',
  },
  {
    path: '/reading-intelligence', file: 'reading-intelligence',
    title: 'Reading Intelligence: read faster, understand more | BooksAtlas',
    description: 'Tools built into every BooksAtlas book: speed reading, bold word starts, focus sprints, listening with the words highlighted, and a focus gym.',
  },
  {
    path: '/reading-intelligence/young-readers', file: 'young-readers',
    title: 'Young readers: stories, letter sounds and word games | BooksAtlas',
    description: 'Free stories read aloud, letter sounds, word games and a calm focus gym for children, in English, French, Spanish, Portuguese and Dutch. No account needed.',
  },
  {
    path: '/reading-intelligence/little-ones', file: 'little-ones',
    title: 'Little ones: reading from birth to 3 | BooksAtlas',
    description: 'A few minutes a day of rhymes, picture talk and bedtime stories for babies and toddlers, with a simple plan for every age from birth to 3.',
  },
  { path: '/privacy', file: 'privacy', title: 'Privacy Notice | BooksAtlas', description: 'What personal data BooksAtlas collects, why, who processes it for us, how long we keep it and your rights.' },
  { path: '/legal', file: 'legal', title: 'Legal Notice | BooksAtlas', description: 'Who runs BooksAtlas and how to reach us.' },
  { path: '/refunds', file: 'refunds', title: 'Refund Policy | BooksAtlas', description: 'When and how you can get your money back for an eBook or audiobook bought on BooksAtlas.' },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The shell with this page's title, description, canonical link and preview tags; throws if a tag is missing. */
export function pageHtml(shell, page) {
  const url = SITE + page.path;
  const swaps = [
    [/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`],
    [/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(page.description)}" />`],
    [/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`],
    [/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(page.title)}" />`],
    [/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(page.description)}" />`],
    [/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`],
  ];
  let html = shell;
  for (const [find, put] of swaps) {
    if (!find.test(html)) throw new Error(`index.html has no ${find} to set for ${page.path}`);
    html = html.replace(find, put);
  }
  return html;
}

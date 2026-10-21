import type { Book } from '@workspace/bookatlas-catalog/types';
import { database, updateJob, PublishingError, type Job } from './jobs.js';
import { readJson, readAsset } from './storage.js';
import type { Manuscript } from './epub.js';
import { inspectWav } from './audio.js';

export async function publishJob(job: Job): Promise<{ job: Job; book: Book }> {
  const config = job.data.config;
  if (!['review', 'published'].includes(job.status) || !job.data.progress.epub ||
      job.data.progress.chapters !== config.chapterCount ||
      (config.includeAudio && job.data.progress.audio !== config.chapterCount)) {
    throw new PublishingError('All requested manuscript and audio assets must be complete before publishing.', 409);
  }
  const manuscript = await readJson<Manuscript>(job.id, 'manuscript.json');
  await readAsset(job.id, 'book.epub'); // Confirm the durable output still exists.
  if (config.includeAudio) {
    for (let i = 0; i < config.chapterCount; i++) inspectWav(await readAsset(job.id, `chapter-${i + 1}.wav`));
  }
  const words = manuscript.chapters.reduce((sum, chapter) => sum + (chapter.text.match(/\S+/gu)?.length ?? 0), 0);
  const cover = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#111735"/><path d="M70 180H530M70 700H530" stroke="#f4c75d" stroke-width="4"/><text x="70" y="420" fill="white" font-size="48" font-family="serif">BOOKATLAS</text><text x="70" y="490" fill="#f4c75d" font-size="26">Independent publication</text></svg>';
  const book: Book = {
    id: job.id, publicationId: job.id, title: config.title, author: config.author, authorBio: '',
    narrator: config.includeAudio ? config.voice : undefined,
    coverImage: `data:image/svg+xml;base64,${Buffer.from(cover).toString('base64')}`,
    price: 0, originalPrice: 0, isDeal: false, isBestseller: false, isNewRelease: true,
    rating: 0, reviewCount: 0, format: config.includeAudio ? 'bundle' : 'ebook',
    genres: [config.category], primaryGenre: config.category,
    pageCount: 0, // EPUB is reflowable; do not fabricate a fixed page count.
    audioDurationMinutes: config.includeAudio ? job.data.audioDurations.reduce((a, b) => a + b, 0) / 60 : undefined,
    publishDate: new Date().toISOString().slice(0, 10), publisher: config.author, isbn: '',
    language: config.language, synopsis: manuscript.description, editorialReview: '',
    sampleChapters: manuscript.chapters.slice(0, 1).map(chapter => ({
      title: chapter.title, content: chapter.text.split(/\n\s*\n/).slice(0, 2),
    })),
    superPointsEarned: 0, tags: ['AI-assisted', 'Free publication'], reviews: [],
    readingTimeHours: words / 200 / 60,
  };
  const result = job.is_test
    ? await database().from('publishing_test_books').upsert({ id: job.id, data: book, updated_at: new Date().toISOString() })
    : await database().from('books').upsert({
      id: book.id, title: book.title, author: book.author, primary_genre: book.primaryGenre,
      price: 0, data: book, updated_at: new Date().toISOString(),
    });
  if (result.error) throw new PublishingError('Could not persist the publication. Retry is idempotent; no campaign was sent.', 503);
  if (!job.is_test) {
    const category = await database().from('categories').upsert({ name: config.category });
    if (category.error) throw new PublishingError('Publication category could not be persisted. No campaign was sent.', 503);
  }
  return { job: job.status === 'published' ? job : await updateJob(job, { status: 'published', stage: 'published' }), book };
}

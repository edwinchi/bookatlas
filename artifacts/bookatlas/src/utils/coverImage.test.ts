import test from 'node:test';
import assert from 'node:assert/strict';
import { coverProps } from './coverImage.js';

test('BooksAtlas covers get display sizes; other images are untouched', () => {
  assert.deepEqual(coverProps('/api/catalog/covers/atlas-ebook-9893222e.jpg', 240), {
    src: '/api/catalog/covers/atlas-ebook-9893222e-w720.jpg',
    srcSet: '/api/catalog/covers/atlas-ebook-9893222e-w360.jpg 360w, /api/catalog/covers/atlas-ebook-9893222e-w720.jpg 720w, /api/catalog/covers/atlas-ebook-9893222e-w1200.jpg 1200w',
    sizes: '240px',
  });
  assert.equal(coverProps('/api/catalog/covers/atlas-ebook-9893222e.jpg', 420).src, '/api/catalog/covers/atlas-ebook-9893222e-w1200.jpg');
  assert.deepEqual(coverProps('https://images.unsplash.com/photo-1?auto=format&fit=crop&w=700&q=80', 160), {
    src: 'https://images.unsplash.com/photo-1?auto=format&fit=crop&w=320&q=80',
    srcSet: 'https://images.unsplash.com/photo-1?auto=format&fit=crop&w=160&q=80 160w, https://images.unsplash.com/photo-1?auto=format&fit=crop&w=320&q=80 320w, https://images.unsplash.com/photo-1?auto=format&fit=crop&w=480&q=80 480w',
    sizes: '160px',
  });
  assert.deepEqual(coverProps('https://example.com/cover.jpg?w=400', 240), { src: 'https://example.com/cover.jpg?w=400' });
  assert.deepEqual(coverProps(undefined, 240), { src: undefined });
});

test('sample-title covers are served in 360, 720 and 800 px widths', () => {
  assert.deepEqual(coverProps('/covers/samples/atlas-afr-001.jpg', 160), {
    src: '/covers/samples/atlas-afr-001-w720.jpg',
    srcSet: '/covers/samples/atlas-afr-001-w360.jpg 360w, /covers/samples/atlas-afr-001-w720.jpg 720w, /covers/samples/atlas-afr-001.jpg 800w',
    sizes: '160px',
  });
  assert.equal(coverProps('/covers/samples/atlas-afr-001.jpg', 420).src, '/covers/samples/atlas-afr-001.jpg');
  assert.deepEqual(coverProps('/covers/samples/../secret.jpg', 160), { src: '/covers/samples/../secret.jpg' });
});

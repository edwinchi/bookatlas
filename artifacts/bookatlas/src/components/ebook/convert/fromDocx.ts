import type { EpubChapter, EpubImage } from './epubBuilder';
import { finishReport, inspectFront, splitChapters, toXhtml, type ConversionReport } from './structure';

type Progress = (fraction: number, label: string) => void;

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/webp': 'webp' };
const SUPPORTED = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']);

/**
 * Word (.docx) to EPUB chapters with mammoth: headings become chapters, the first picture before any text is
 * the cover, other pictures are kept, Word's own contents list is dropped (the EPUB has a real one).
 */
export async function fromDocx(data: ArrayBuffer, formYear: number, onProgress: Progress): Promise<{ chapters: EpubChapter[]; images: EpubImage[]; cover?: EpubImage; report: ConversionReport }> {
  onProgress(0.05, 'Reading the Word file…');
  const mammoth = (await import('mammoth')).default;
  const images: EpubImage[] = [];
  const notes: string[] = [];
  let skippedImages = 0;
  // The browser build reads `arrayBuffer`, the Node build (tests) `buffer`.
  const nodeBuffer = (globalThis as { Buffer?: { from(d: ArrayBuffer): unknown } }).Buffer?.from(data);
  const input = (nodeBuffer ? { buffer: nodeBuffer } : { arrayBuffer: data }) as { arrayBuffer: ArrayBuffer };
  const result = await mammoth.convertToHtml(input, {
    styleMap: ["p[style-name='toc 1'] => !", "p[style-name='toc 2'] => !", "p[style-name='toc 3'] => !", "p[style-name='Title'] => p.title:fresh", "p[style-name='Subtitle'] => p.subtitle:fresh"],
    convertImage: mammoth.images.imgElement(async (image) => {
      const type = image.contentType;
      if (!SUPPORTED.has(type)) { skippedImages += 1; return { src: '' }; }
      const name = `img-${String(images.length + 1).padStart(3, '0')}.${EXT[type]}`;
      images.push({ name, mediaType: type, data: new Uint8Array(await image.readAsArrayBuffer()) });
      onProgress(0.1 + Math.min(0.5, images.length * 0.05), `Extracting pictures (${images.length})…`);
      return { src: `images/${name}`, alt: (image as { altText?: string }).altText || '' };
    }),
  });
  if (skippedImages) notes.push(`${skippedImages} picture(s) in a format e-readers do not support (such as EMF or WMF) were left out. Save them as PNG or JPEG in Word and upload again if you need them.`);
  onProgress(0.65, 'Finding chapters…');

  let html = result.value.replace(/<img src=""[^>]*>/g, '');
  // The cover is the first picture, if it comes before any words.
  let cover: EpubImage | undefined;
  const firstImg = /<img src="images\/([^"]+)"[^>]*>/.exec(html);
  if (firstImg && !/\S/.test(html.slice(0, firstImg.index).replace(/<[^>]+>/g, ''))) {
    const idx = images.findIndex((i) => i.name === firstImg[1]);
    if (idx >= 0 && images[idx]!.mediaType !== 'image/svg+xml') {
      cover = { ...images[idx]!, name: 'cover' };
      images.splice(idx, 1);
      html = html.slice(0, firstImg.index) + html.slice(firstImg.index + firstImg[0].length);
    }
  }

  const { front, chapters, droppedContents } = splitChapters(html);
  if (droppedContents) notes.push('Your typed table of contents was replaced by a clickable one built from your headings.');
  const frontInfo = inspectFront(front);
  const frontXhtml = toXhtml(front);
  // Front matter (title page, copyright page) stays at the start, untitled in the contents.
  const all: EpubChapter[] = /\S/.test(frontXhtml.replace(/<[^>]+>/g, '')) ? [{ title: '', level: 2, xhtml: frontXhtml }, ...chapters] : chapters;
  if (!chapters.length) all.splice(0, all.length, { title: '', level: 1, xhtml: toXhtml(html) });
  onProgress(0.8, `Found ${chapters.length} chapters…`);
  return { chapters: all, images, cover, report: finishReport('docx', chapters, images, cover, frontInfo, formYear, notes) };
}

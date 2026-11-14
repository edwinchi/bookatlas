import type { EpubChapter, EpubImage } from './epubBuilder';
import { blocksOf, blocksToHtml, chromeFilter, isPicturePage, linesOf, type PageText } from './pdfLayout';
import { finishReport, inspectFront, splitChapters, toXhtml, type ConversionReport } from './structure';

type Progress = (fraction: number, label: string) => void;

/** Renders a PDF page to a JPEG (the cover), in the browser. Injected so the converter is testable. */
export type PageRenderer = (page: unknown, targetHeight: number) => Promise<Uint8Array | null>;

/** Bounding box of the non-white pixels: a cover printed on a larger page loses its white margins. */
export function contentBox(rgba: Uint8ClampedArray, width: number, height: number, threshold = 244) {
  const ink = (i: number) => rgba[i + 3]! > 0 && (rgba[i]! < threshold || rgba[i + 1]! < threshold || rgba[i + 2]! < threshold);
  // Rows and columns need a few inked pixels, so dust and anti-aliasing do not count.
  const minInk = Math.max(3, Math.round(Math.min(width, height) * 0.01));
  const rowInk = (y: number) => { let n = 0; for (let x = 0; x < width; x += 1) if (ink((y * width + x) * 4) && ++n >= minInk) return true; return false; };
  const colInk = (x: number, top: number, bottom: number) => { let n = 0; for (let y = top; y <= bottom; y += 1) if (ink((y * width + x) * 4) && ++n >= minInk) return true; return false; };
  let top = 0; while (top < height - 1 && !rowInk(top)) top += 1;
  let bottom = height - 1; while (bottom > top && !rowInk(bottom)) bottom -= 1;
  let left = 0; while (left < width - 1 && !colInk(left, top, bottom)) left += 1;
  let right = width - 1; while (right > left && !colInk(right, top, bottom)) right -= 1;
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** Browser renderer: draw the page large, trim white margins, scale to cover height, encode as JPEG. */
export const canvasRenderer: PageRenderer = async (page, targetHeight) => {
  const p = page as { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: unknown) => { promise: Promise<void> } };
  const base = p.getViewport({ scale: 1 });
  // Render larger than needed so the trimmed artwork still reaches the target height.
  const viewport = p.getViewport({ scale: (targetHeight * 1.4) / base.height });
  const page1 = document.createElement('canvas');
  page1.width = Math.round(viewport.width);
  page1.height = Math.round(viewport.height);
  const ctx = page1.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, page1.width, page1.height);
  await p.render({ canvasContext: ctx, viewport }).promise;
  const box = contentBox(ctx.getImageData(0, 0, page1.width, page1.height).data, page1.width, page1.height);
  // Keep the whole page when trimming would leave almost nothing (a mostly white design).
  const crop = box.width > page1.width * 0.3 && box.height > page1.height * 0.3 ? box : { x: 0, y: 0, width: page1.width, height: page1.height };
  const scale = Math.min(1, targetHeight / crop.height);
  const cover = document.createElement('canvas');
  cover.width = Math.round(crop.width * scale);
  cover.height = Math.round(crop.height * scale);
  const out = cover.getContext('2d');
  if (!out) return null;
  out.imageSmoothingQuality = 'high';
  out.drawImage(page1, crop.x, crop.y, crop.width, crop.height, 0, 0, cover.width, cover.height);
  const blob = await new Promise<Blob | null>((resolve) => cover.toBlob(resolve, 'image/jpeg', 0.9));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
};

type PdfJs = typeof import('pdfjs-dist');

/** Loads pdf.js with its worker (browser); tests pass the legacy Node build instead. */
async function browserPdfJs(): Promise<PdfJs> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  return pdfjs;
}

/**
 * PDF to EPUB chapters: text is reflowed into paragraphs and headings (see pdfLayout); a first page that is
 * a picture becomes the cover; other picture-only pages are reported.
 */
export async function fromPdf(data: ArrayBuffer, formYear: number, onProgress: Progress, opts: { pdfjs?: PdfJs; render?: PageRenderer } = {}): Promise<{ chapters: EpubChapter[]; images: EpubImage[]; cover?: EpubImage; report: ConversionReport }> {
  onProgress(0.02, 'Opening the PDF…');
  const pdfjs = opts.pdfjs ?? await browserPdfJs();
  const render = opts.render ?? canvasRenderer;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true, isEvalSupported: false }).promise;
  const notes: string[] = [];
  const pages: { page: PageText; lines: ReturnType<typeof linesOf> }[] = [];
  let cover: EpubImage | undefined;
  let pictureOnly = 0;
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const ops = await page.getOperatorList();
    const images = ops.fnArray.filter((f: number) => f === pdfjs.OPS.paintImageXObject || f === pdfjs.OPS.paintInlineImageXObject).length;
    const styles = content.styles as Record<string, { fontFamily?: string }>;
    const items = (content.items as { str?: string; transform?: number[]; width?: number; fontName?: string }[])
      .filter((i) => typeof i.str === 'string' && i.transform)
      .map((i) => ({
        str: i.str!, x: i.transform![4]!, y: i.transform![5]!, width: i.width ?? 0,
        size: Math.round(Math.hypot(i.transform![2]!, i.transform![3]!) * 10) / 10,
        bold: /bold|black|heavy|semibold/i.test(`${i.fontName ?? ''} ${styles[i.fontName ?? '']?.fontFamily ?? ''}`),
      }));
    const pageText: PageText = { width: viewport.width, height: viewport.height, items, images };
    if (isPicturePage(pageText)) {
      if (n === 1 && !cover) {
        onProgress(0.05, 'Taking the cover from the first page…');
        const jpeg = await render(page, 2560).catch(() => null);
        if (jpeg) cover = { name: 'cover', mediaType: 'image/jpeg', data: jpeg };
      } else pictureOnly += 1;
      page.cleanup();
      continue;
    }
    pages.push({ page: pageText, lines: linesOf(pageText, n) });
    page.cleanup();
    onProgress(0.05 + 0.8 * (n / doc.numPages), `Reading page ${n} of ${doc.numPages}…`);
  }
  await doc.destroy();
  if (pictureOnly) notes.push(`${pictureOnly} page(s) contained only a picture and no text; pictures inside a PDF are not carried over. Upload a Word file instead if you need them.`);
  const words = pages.reduce((n, p) => n + p.lines.length, 0);
  if (!words) throw new Error('This PDF has no selectable text (it may be scanned). Upload the Word file or an EPUB instead.');

  onProgress(0.87, 'Rebuilding paragraphs and chapters…');
  const keep = chromeFilter(pages);
  const lines = pages.flatMap(({ page, lines }) => lines.filter((l) => keep(l, page)));
  const blocks = blocksOf(lines);
  // Title page and copyright page are front matter: their large type is not a chapter heading.
  const firstPage = blocks[0]?.page ?? 1;
  const copyright = blocks.findIndex((b) => b.page <= firstPage + 6 && /copyright|©|all rights reserved/i.test(b.text));
  if (copyright >= 0) {
    const lastFrontPage = blocks[copyright]!.page;
    for (const b of blocks) if (b.page <= lastFrontPage) b.kind = 'p';
  }
  const { front, chapters, droppedContents } = splitChapters(blocksToHtml(blocks));
  if (droppedContents) notes.push('The table of contents pages were replaced by a clickable one built from your headings.');
  notes.push('Text was reflowed from the PDF: check headings, italics and special layouts in the preview before publishing.');
  const frontInfo = inspectFront(front);
  const frontXhtml = toXhtml(front);
  const all: EpubChapter[] = /\S/.test(frontXhtml.replace(/<[^>]+>/g, '')) ? [{ title: '', level: 2, xhtml: frontXhtml }, ...chapters] : chapters;
  onProgress(0.92, `Found ${chapters.length} chapters…`);
  return { chapters: all, images: [], cover, report: finishReport('pdf', chapters, [], cover, frontInfo, formYear, notes) };
}

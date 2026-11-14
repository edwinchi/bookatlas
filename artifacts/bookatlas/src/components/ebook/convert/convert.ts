import { buildEpub, type EpubChapter, type EpubImage, type EpubMeta } from './epubBuilder';
import type { ConversionReport } from './structure';

export type { ConversionReport } from './structure';
export type ConvertProgress = (fraction: number, label: string) => void;

/** What a manuscript became: chapters and pictures, ready to be packaged with the form's details. */
export interface ConvertedManuscript {
  fileName: string;
  chapters: EpubChapter[];
  images: EpubImage[];
  cover?: EpubImage;
  report: ConversionReport;
}

export const convertibleKind = (file: File) => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf' as const;
  if (name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx' as const;
  return null;
};

/** Read a Word or PDF manuscript in the browser; nothing is uploaded until the author submits. */
export async function readManuscript(file: File, formYear: number, onProgress: ConvertProgress): Promise<ConvertedManuscript> {
  const kind = convertibleKind(file);
  if (!kind) throw new Error('Choose an EPUB, Word (.docx) or PDF file.');
  if (file.size > 150 * 1024 * 1024) throw new Error('The file is larger than 150 MB.');
  const data = await file.arrayBuffer();
  const result = kind === 'docx'
    ? await (await import('./fromDocx')).fromDocx(data, formYear, onProgress)
    : await (await import('./fromPdf')).fromPdf(data, formYear, onProgress);
  onProgress(1, 'Converted.');
  return { fileName: file.name, ...result };
}

/** Package the manuscript as an EPUB with the form's current details (title, author, rights, ISBN). */
export function packageEpub(m: ConvertedManuscript, meta: EpubMeta): File {
  const epub = buildEpub({ meta, chapters: m.chapters, images: m.images, cover: m.cover, addCopyrightPage: !m.report.hasCopyrightPage });
  const name = m.fileName.replace(/\.(pdf|docx)$/i, '') + '.epub';
  return new File([epub as Uint8Array<ArrayBuffer>], name, { type: 'application/epub+zip' });
}

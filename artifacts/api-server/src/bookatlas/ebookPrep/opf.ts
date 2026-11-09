import { EpubFiles, PrepError } from './archive.js';

/** Attributes of one start tag. Names keep their prefix (`opf:role`). */
export function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  const body = tag.replace(/^<\/?[\w:.-]+/, '').replace(/\/?>$/, '');
  for (const match of body.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1]!] = match[2] ?? match[3] ?? '';
  }
  return result;
}

export function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, ' ').replace(/&copy;/g, '©').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** Resolve an href relative to a directory inside the archive. */
export function resolvePath(dir: string, href: string) {
  const clean = decodeURIComponent(href.split('#')[0]!.split('?')[0]!);
  const parts = (dir ? `${dir}/${clean}` : clean).split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '..') out.pop();
    else if (part && part !== '.') out.push(part);
  }
  return out.join('/');
}

/** Href from one archive path to another, for writing references. */
export function relativeHref(fromDir: string, toPath: string) {
  const from = fromDir ? fromDir.split('/') : [];
  const to = toPath.split('/');
  let i = 0;
  while (i < from.length && i < to.length - 1 && from[i] === to[i]) i += 1;
  return [...Array(from.length - i).fill('..'), ...to.slice(i)].map(encodeURI).join('/');
}

export interface ManifestItem {
  id: string;
  href: string;
  path: string;
  mediaType: string;
  properties: string[];
  tag: string;
}

const ITEM = /<(?:opf:)?item\b[^>]*>/g;

export class PackageDocument {
  readonly path: string;
  readonly dir: string;
  xml: string;

  constructor(public epub: EpubFiles) {
    if (!epub.has('META-INF/container.xml')) throw new PrepError('The EPUB has no META-INF/container.xml.');
    const container = epub.text('META-INF/container.xml');
    const rootfile = /<rootfile\b[^>]*>/.exec(container);
    const fullPath = rootfile ? attributes(rootfile[0])['full-path'] : undefined;
    if (!fullPath || !epub.has(fullPath)) throw new PrepError('The EPUB container does not point to a package document.');
    this.path = fullPath;
    this.dir = fullPath.includes('/') ? fullPath.slice(0, fullPath.lastIndexOf('/')) : '';
    this.xml = epub.text(fullPath);
  }

  save() { this.epub.setText(this.path, this.xml); }

  get version() { return attributes(/<(?:opf:)?package\b[^>]*>/.exec(this.xml)?.[0] ?? '').version ?? '2.0'; }
  get uniqueIdentifierId() { return attributes(/<(?:opf:)?package\b[^>]*>/.exec(this.xml)?.[0] ?? '')['unique-identifier']; }

  items(): ManifestItem[] {
    return [...this.xml.matchAll(ITEM)].map((m) => {
      const a = attributes(m[0]);
      return {
        id: a.id ?? '', href: a.href ?? '', path: resolvePath(this.dir, a.href ?? ''),
        mediaType: a['media-type'] ?? '', properties: (a.properties ?? '').split(/\s+/).filter(Boolean), tag: m[0],
      };
    });
  }

  item(id: string) { return this.items().find((i) => i.id === id); }
  itemByPath(path: string) { return this.items().find((i) => i.path === path); }

  spine(): ManifestItem[] {
    const byId = new Map(this.items().map((i) => [i.id, i]));
    return [...this.xml.matchAll(/<(?:opf:)?itemref\b[^>]*>/g)]
      .map((m) => byId.get(attributes(m[0]).idref ?? ''))
      .filter((i): i is ManifestItem => !!i && /xhtml|html/.test(i.mediaType));
  }

  /** Rewrite one manifest item's attributes; `null` removes an attribute. */
  updateItem(item: ManifestItem, changes: Record<string, string | null>) {
    const a = attributes(item.tag);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) delete a[key]; else a[key] = value;
    }
    const tag = `<item ${Object.entries(a).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ')}/>`;
    this.xml = this.xml.replace(item.tag, tag);
  }

  addItem(id: string, path: string, mediaType: string, properties?: string) {
    const href = relativeHref(this.dir, path);
    const tag = `<item id="${escapeXml(id)}" href="${escapeXml(href)}" media-type="${mediaType}"${properties ? ` properties="${properties}"` : ''}/>`;
    this.xml = this.xml.replace(/(<\/(?:opf:)?manifest>)/, `  ${tag}\n  $1`);
  }

  removeItem(item: ManifestItem) {
    this.xml = this.xml.replace(new RegExp(`\\s*${item.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '');
    this.xml = this.xml.replace(new RegExp(`\\s*<(?:opf:)?itemref\\b[^>]*idref="${item.id}"[^>]*>`, 'g'), '');
  }

  /** Text values of a Dublin Core element, for example `title` or `rights`. */
  dc(name: string): string[] {
    return [...this.xml.matchAll(new RegExp(`<dc:${name}\\b[^>]*>([\\s\\S]*?)</dc:${name}>`, 'g'))].map((m) => decodeEntities(m[1]!.trim()));
  }

  /** Replace every `dc:<name>` element with one value, or add it before `</metadata>`. */
  setDc(name: string, value: string) {
    const element = `<dc:${name}>${escapeXml(value)}</dc:${name}>`;
    const pattern = new RegExp(`[ \\t]*<dc:${name}\\b[^>]*>[\\s\\S]*?</dc:${name}>\\s*`, 'g');
    if (pattern.test(this.xml)) {
      let first = true;
      this.xml = this.xml.replace(pattern, () => (first ? ((first = false), `    ${element}\n`) : ''));
    } else {
      this.addMetadata(element);
    }
  }

  addMetadata(element: string) {
    this.xml = this.xml.replace(/(\s*<\/(?:opf:)?metadata>)/, `\n    ${element}$1`);
  }

  /** The cover image item: EPUB 3 `cover-image`, else EPUB 2 `<meta name="cover">`. */
  coverItem(): ManifestItem | undefined {
    const items = this.items();
    const byProperty = items.find((i) => i.properties.includes('cover-image'));
    if (byProperty) return byProperty;
    const meta = [...this.xml.matchAll(/<meta\b[^>]*>/g)].map((m) => attributes(m[0])).find((a) => a.name === 'cover');
    const byMeta = meta?.content ? items.find((i) => i.id === meta.content) : undefined;
    if (byMeta && byMeta.mediaType.startsWith('image/')) return byMeta;
    return items.find((i) => i.mediaType.startsWith('image/') && /cover/i.test(i.id + i.href));
  }
}

/** Synthetic EPUB fixtures for the preparation tests; the real manuscripts never enter git. */
import { strToU8, zipSync } from 'fflate';
import { PNG } from 'pngjs';

/** A print wrap on a purple background: back panel, a thin spine mark, and a gold front panel. */
export function wrapCover(scale = 1) {
  const w = 400 * scale, h = 250 * scale;
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const [sx, sy] = [x / scale, y / scale];
      const inBack = sx >= 10 && sx < 180 && sy >= 15 && sy < 235;
      const inSpine = sx >= 195 && sx < 200 && sy >= 40 && sy < 120;
      const inFront = sx >= 215 && sx < 390 && sy >= 12 && sy < 238;
      const [r, g, b] = inFront ? [220, 170, 40] : inBack ? [20, 40, 90] : inSpine ? [255, 255, 255] : [73, 44, 123];
      png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
    }
  }
  return new Uint8Array(PNG.sync.write(png));
}

/** A plain portrait front cover, as an author would upload to replace a small one. */
export function frontCover(width: number, height: number) {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) { png.data[i] = 220; png.data[i + 1] = 170; png.data[i + 2] = 40; png.data[i + 3] = 255; }
  return new Uint8Array(PNG.sync.write(png));
}

/** Minimal sfnt with an OS/2 table carrying the Microsoft vendor id. */
export function microsoftFont() {
  const os2 = new Uint8Array(78);
  new DataView(os2.buffer).setUint16(8, 0x0008);
  os2.set(strToU8('MS  '), 58);
  const font = new Uint8Array(12 + 16 + os2.length);
  const view = new DataView(font.buffer);
  view.setUint32(0, 0x00010000);
  view.setUint16(4, 1);
  font.set(strToU8('OS/2'), 12);
  view.setUint32(20, 28);
  view.setUint32(24, os2.length);
  font.set(os2, 28);
  return font;
}

/** An EPUB 2 with every problem from the first Lulu rejection, plus a Microsoft font and a print barcode. */
export function epub2(coverScale = 1) {
  const page = (body: string) => `<?xml version='1.0' encoding='utf-8'?>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Unknown</title><link href="style.css" rel="stylesheet" type="text/css"/></head><body>${body}</body></html>`;
  return zipSync({
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'),
    'content.opf': strToU8(`<?xml version='1.0' encoding='utf-8'?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uuid_id">
  <metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:language>en</dc:language>
    <dc:creator opf:file-as="Unknown" opf:role="aut">Ada Writer</dc:creator>
    <dc:contributor opf:role="bkp">calibre</dc:contributor>
    <dc:identifier id="uuid_id" opf:scheme="uuid">0f8b8f5e-1111-4222-8333-944455556666</dc:identifier>
    <dc:identifier opf:scheme="ISBN">9781326157951</dc:identifier>
    <dc:title>The Test Codex</dc:title>
    <meta name="cover" content="cover"/>
  </metadata>
  <manifest>
    <item id="cover" href="cover.png" media-type="image/png"/>
    <item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>
    <item id="p1" href="front.html" media-type="application/xhtml+xml"/>
    <item id="p2" href="chapter1.html" media-type="application/xhtml+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    <item id="font" href="fonts/Aptos.ttf" media-type="application/x-font-truetype"/>
    <item id="bar" href="images/barcode.png" media-type="image/png"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx"><itemref idref="titlepage"/><itemref idref="p1"/><itemref idref="p2"/></spine>
  <guide><reference type="cover" href="titlepage.xhtml" title="Cover"/></guide>
</package>`),
    'titlepage.xhtml': strToU8(`<?xml version='1.0' encoding='utf-8'?>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Cover</title></head><body><div><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="100%" height="100%" viewBox="0 0 ${400 * coverScale} ${250 * coverScale}" preserveAspectRatio="none"><image width="${400 * coverScale}" height="${250 * coverScale}" xlink:href="cover.png"/></svg></div></body></html>`),
    'front.html': strToU8(page('<p>The Test Codex</p><p>Copyright © 2026 by Test Press</p><p><img src="images/barcode.png" alt="A bar code with numbers  AI-generated content may be incorrect."/></p>')),
    'chapter1.html': strToU8(page(`<h2 id="c1">Chapter 1</h2><h3>Welcome</h3>${Array.from({ length: 12 }, (_, i) => `<p>Paragraph ${i + 1} of the opening chapter.</p>`).join('')}<ol class="list"><li value="3">Matthew 7:13</li></ol><ol><li value="4">John 14:6</li></ol>`)),
    'style.css': strToU8('@font-face { font-family: "Aptos"; src: url(fonts/Aptos.ttf) }\np { font-family: "Aptos", serif }\n'),
    'fonts/Aptos.ttf': microsoftFont(),
    'images/barcode.png': wrapCover(),
    'cover.png': wrapCover(coverScale),
    'toc.ncx': strToU8(`<?xml version='1.0' encoding='utf-8'?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="0f8b8f5e-1111-4222-8333-944455556666"/></head>
<docTitle><text>The Test Codex</text></docTitle><navMap>
<navPoint id="n1" playOrder="1"><navLabel><text>Front</text></navLabel><content src="front.html"/></navPoint>
<navPoint id="n2" playOrder="2"><navLabel><text>Chapter 1</text></navLabel><content src="chapter1.html#c1"/>
  <navPoint id="n3" playOrder="3"><navLabel><text>Welcome</text></navLabel><content src="chapter1.html#c1"/></navPoint></navPoint>
</navMap></ncx>`),
  });
}

/**
 * Sharp book covers everywhere they appear: BooksAtlas covers are served in display sizes made on the server
 * (area-averaged and lightly sharpened), and the browser picks the size that matches how large the cover is
 * shown and the screen's sharpness. Sample titles have their own covers in /covers/samples (360, 720 and 800 px
 * wide). Other images are used as they are.
 */
const OWN_COVER = /^(\/api\/catalog\/covers\/atlas-ebook-[0-9a-f]{8})\.jpg$/;
const WIDTHS = [360, 720, 1200];
const SAMPLE_COVER = /^(\/covers\/samples\/[a-z0-9-]+)\.jpg$/;
const SAMPLE_WIDTHS = [360, 720, 800];
const UNSPLASH = /^https:\/\/images\.unsplash\.com\/[^?]+\?(.*&)?w=\d+/;

/** Sample-title photos from Unsplash: ask for the width shown (and 2× and 3× for sharp screens), not the 700 px original. */
function unsplash(url: string, displayWidth: number) {
  const at = (w: number) => url.replace(/([?&])w=\d+/, `$1w=${w}`);
  const dw = Math.round(displayWidth);
  return { src: at(dw * 2), srcSet: [1, 2, 3].map((x) => `${at(dw * x)} ${dw * x}w`).join(', '), sizes: `${dw}px` };
}

export function coverProps(url: string | undefined, displayWidth: number): { src?: string; srcSet?: string; sizes?: string } {
  const sample = url ? SAMPLE_COVER.exec(url) : null;
  if (sample) {
    const file = (w: number) => (w === 800 ? `${sample[1]}.jpg` : `${sample[1]}-w${w}.jpg`);
    return { src: file(displayWidth > 300 ? 800 : 720), srcSet: SAMPLE_WIDTHS.map((w) => `${file(w)} ${w}w`).join(', '), sizes: `${displayWidth}px` };
  }
  const m = url ? OWN_COVER.exec(url) : null;
  if (!m) return url && UNSPLASH.test(url) ? unsplash(url, displayWidth) : { src: url };
  return {
    src: `${m[1]}-w${displayWidth > 300 ? 1200 : 720}.jpg`,
    srcSet: WIDTHS.map((w) => `${m[1]}-w${w}.jpg ${w}w`).join(', '),
    sizes: `${displayWidth}px`,
  };
}

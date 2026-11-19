/**
 * Sharp book covers everywhere they appear: BooksAtlas covers are served in display sizes made on the server
 * (area-averaged and lightly sharpened), and the browser picks the size that matches how large the cover is
 * shown and the screen's sharpness. Other images (sample titles) are used as they are.
 */
const OWN_COVER = /^(\/api\/catalog\/covers\/atlas-ebook-[0-9a-f]{8})\.jpg$/;
const WIDTHS = [360, 720, 1200];
const UNSPLASH = /^https:\/\/images\.unsplash\.com\/[^?]+\?(.*&)?w=\d+/;

/** Sample-title photos from Unsplash: ask for the width shown (and 2× and 3× for sharp screens), not the 700 px original. */
function unsplash(url: string, displayWidth: number) {
  const at = (w: number) => url.replace(/([?&])w=\d+/, `$1w=${w}`);
  const dw = Math.round(displayWidth);
  return { src: at(dw * 2), srcSet: [1, 2, 3].map((x) => `${at(dw * x)} ${dw * x}w`).join(', '), sizes: `${dw}px` };
}

export function coverProps(url: string | undefined, displayWidth: number): { src?: string; srcSet?: string; sizes?: string } {
  const m = url ? OWN_COVER.exec(url) : null;
  if (!m) return url && UNSPLASH.test(url) ? unsplash(url, displayWidth) : { src: url };
  return {
    src: `${m[1]}-w${displayWidth > 300 ? 1200 : 720}.jpg`,
    srcSet: WIDTHS.map((w) => `${m[1]}-w${w}.jpg ${w}w`).join(', '),
    sizes: `${displayWidth}px`,
  };
}

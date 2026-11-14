/**
 * Sharp book covers everywhere they appear: BooksAtlas covers are served in display sizes made on the server
 * (area-averaged and lightly sharpened), and the browser picks the size that matches how large the cover is
 * shown and the screen's sharpness. Other images (sample titles) are used as they are.
 */
const OWN_COVER = /^(\/api\/catalog\/covers\/atlas-ebook-[0-9a-f]{8})\.jpg$/;
const WIDTHS = [360, 720, 1200];

export function coverProps(url: string | undefined, displayWidth: number): { src?: string; srcSet?: string; sizes?: string } {
  const m = url ? OWN_COVER.exec(url) : null;
  if (!m) return { src: url };
  return {
    src: `${m[1]}-w${displayWidth > 300 ? 1200 : 720}.jpg`,
    srcSet: WIDTHS.map((w) => `${m[1]}-w${w}.jpg ${w}w`).join(', '),
    sizes: `${displayWidth}px`,
  };
}

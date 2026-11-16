/**
 * Lock-screen and headphone controls for the natural audiobook (Media Session API). The narration is a real
 * audio track, so phones keep playing it with the screen off; this adds the title, cover and buttons there.
 * Browsers without the API simply skip it.
 */
export interface NowPlaying { title: string; artist: string; album: string; artwork?: string }
export interface MediaControls {
  play: () => void; pause: () => void; stop: () => void;
  next?: () => void; previous?: () => void; seekBy: (seconds: number) => void;
}

const ACTIONS: MediaSessionAction[] = ['play', 'pause', 'stop', 'nexttrack', 'previoustrack', 'seekbackward', 'seekforward'];
const supported = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator;
const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
  try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* action not supported here */ }
};

export function showNowPlaying(now: NowPlaying, controls: MediaControls) {
  if (!supported()) return;
  try {
    const artwork = now.artwork ? [{ src: new URL(now.artwork, window.location.href).href, sizes: '512x512' }] : [];
    navigator.mediaSession.metadata = new MediaMetadata({ title: now.title, artist: now.artist, album: now.album, artwork });
  } catch { /* metadata not supported */ }
  set('play', () => controls.play());
  set('pause', () => controls.pause());
  set('stop', () => controls.stop());
  set('nexttrack', controls.next ? () => controls.next!() : null);
  set('previoustrack', controls.previous ? () => controls.previous!() : null);
  set('seekbackward', (d) => controls.seekBy(-(d.seekOffset ?? 10)));
  set('seekforward', (d) => controls.seekBy(d.seekOffset ?? 30));
}

export function setPlaying(state: 'playing' | 'paused', audio?: HTMLAudioElement) {
  if (!supported()) return;
  navigator.mediaSession.playbackState = state;
  if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
    try { navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate }); } catch { /* ignore */ }
  }
}

export function clearNowPlaying() {
  if (!supported()) return;
  try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } catch { /* ignore */ }
  for (const a of ACTIONS) set(a, null);
}

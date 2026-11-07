export const AUDIO_PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0] as const;
export const DEFAULT_AUDIO_DURATION_MINUTES = 480;

export function calculateAudioDurationSeconds(audioDurationMinutes?: number): number {
  const mins = audioDurationMinutes && audioDurationMinutes > 0 ? audioDurationMinutes : DEFAULT_AUDIO_DURATION_MINUTES;
  return mins * 60;
}

export function resolvePlaybackSpeed(speed: number): number {
  return (AUDIO_PLAYBACK_SPEEDS as readonly number[]).includes(speed) ? speed : 1.0;
}

export function skipAudioForward(currentTime: number, duration: number, step = 15): number {
  const boundedCurrent = Math.max(0, Number.isFinite(currentTime) ? currentTime : 0);
  return Math.min(duration, boundedCurrent + step);
}

export function skipAudioBackward(currentTime: number, step = 15): number {
  const boundedCurrent = Math.max(0, Number.isFinite(currentTime) ? currentTime : 0);
  return Math.max(0, boundedCurrent - step);
}

export function formatAudioTime(secs: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(secs) ? secs : 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${rem < 10 ? '0' : ''}${rem}`;
  }
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

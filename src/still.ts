/** Helpers for saving the frame under the playhead as a still image. */

/**
 * File name for a still taken at `seconds` into the source video, e.g.
 * `panreel-frame-1m05.2s.png`. Tenths keep stills of nearby frames apart.
 */
export function stillFileName(seconds: number): string {
  const tenths = Math.max(0, Math.round((Number.isFinite(seconds) ? seconds : 0) * 10));
  const m = Math.floor(tenths / 600);
  const s = (tenths % 600) / 10;
  const ss = s.toFixed(1).padStart(4, "0");
  return `panreel-frame-${m}m${ss}s.png`;
}

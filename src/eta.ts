/**
 * "About 20 s left" for long exports and scans. Pure apart from the clock the
 * caller passes in, so it is easy to test.
 */
import { translate, type Lang } from "./i18n";

/** Don't guess before this much work and time, or early jitter shows silly numbers. */
const MIN_FRACTION = 0.03;
const MIN_ELAPSED_MS = 1500;

/**
 * Tracks progress against the clock. Returns seconds left, or null while it is
 * too early to tell. Uses the average rate since the start: steadier than the
 * latest step, and exports run at a fairly even pace.
 */
export function etaTracker(startMs: number) {
  return (fraction: number, nowMs: number): number | null => {
    const elapsed = nowMs - startMs;
    if (!(fraction >= MIN_FRACTION) || elapsed < MIN_ELAPSED_MS) return null;
    if (fraction >= 1) return 0;
    return ((elapsed / fraction) * (1 - fraction)) / 1000;
  };
}

/** Round to something a person would say: 5 s steps under a minute, whole minutes above. */
export function formatLeft(seconds: number, lang: Lang): string {
  if (seconds < 10) return translate(lang, "left.few");
  if (seconds < 55) return translate(lang, "left.s", { n: Math.round(seconds / 5) * 5 });
  return translate(lang, "left.min", { n: Math.max(1, Math.round(seconds / 60)) });
}

/** "Exporting MP4… 40%" → "Exporting MP4… 40% · about 20 s left" once there is a guess. */
export function withLeft(text: string, seconds: number | null, lang: Lang): string {
  return seconds === null ? text : `${text} · ${formatLeft(seconds, lang)}`;
}

/** Export resolution and frame-rate choices, kept as pure helpers so they can be tested. */
import type { Size } from "./layout";

export interface Resolution {
  id: string;
  label: string;
  /** Length of the canvas's shorter side, in pixels. */
  short: number;
}

export const RESOLUTIONS: Resolution[] = [
  { id: "720", label: "720p", short: 720 },
  { id: "1080", label: "1080p", short: 1080 },
  { id: "1440", label: "1440p", short: 1440 },
  { id: "2160", label: "4K", short: 2160 },
];

export const FRAME_RATES = [30, 60] as const;
export type FrameRate = (typeof FRAME_RATES)[number];

export interface ExportSettings {
  resolution: string;
  frameRate: FrameRate;
}

export const DEFAULT_SETTINGS: ExportSettings = { resolution: "1080", frameRate: 60 };

/**
 * Scale the canvas `base` size so its shorter side is `short` pixels, keeping
 * the aspect ratio. Both sides are rounded to even numbers because H.264 and
 * VP9 encoders reject odd dimensions with 4:2:0 chroma.
 */
export function exportSize(base: Size, short: number): Size {
  const baseShort = Math.min(base.width, base.height);
  if (baseShort <= 0 || short <= 0) return { width: 2, height: 2 };
  const k = short / baseShort;
  return { width: even(base.width * k), height: even(base.height * k) };
}

function even(v: number): number {
  return Math.max(2, Math.round(v / 2) * 2);
}

/** Accept only known values, falling back to defaults (e.g. for stale saved settings). */
export function sanitizeSettings(raw: unknown): ExportSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const resolution = RESOLUTIONS.some((r) => r.id === o.resolution) ? (o.resolution as string) : DEFAULT_SETTINGS.resolution;
  const frameRate = FRAME_RATES.includes(o.frameRate as FrameRate) ? (o.frameRate as FrameRate) : DEFAULT_SETTINGS.frameRate;
  return { resolution, frameRate };
}

export function resolutionById(id: string): Resolution {
  return RESOLUTIONS.find((r) => r.id === id) ?? RESOLUTIONS[1];
}

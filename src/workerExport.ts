/**
 * Page side of the export worker: start a job, relay progress, cancel, and
 * report failures so the caller can fall back to exporting on the page.
 */
import type { ExportRequest, FromWorker, ToWorker } from "./exportProtocol";

/** The part of `Worker` this module uses (a fake one in tests). */
export interface WorkerLike {
  postMessage(msg: ToWorker, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<FromWorker>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  terminate(): void;
}

export class WorkerExportError extends Error {}

export interface WorkerJob {
  /** The file, null when cancelled; rejects with WorkerExportError if the worker failed. */
  done: Promise<Blob | null>;
  cancel(): void;
}

export function exportInWorker(
  worker: WorkerLike,
  request: ExportRequest,
  onProgress: (fraction: number) => void,
  transfer: Transferable[] = [],
): WorkerJob {
  let settled = false;
  const done = new Promise<Blob | null>((resolve, reject) => {
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      fn();
    };
    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "progress") onProgress(msg.fraction);
      else if (msg.type === "done") finish(() => resolve(msg.blob));
      else finish(() => reject(new WorkerExportError(msg.message)));
    };
    worker.onerror = (e) => {
      e.preventDefault?.();
      finish(() => reject(new WorkerExportError(e.message || "The export worker stopped.")));
    };
  });
  worker.postMessage(request, transfer);
  return {
    done,
    cancel: () => {
      if (!settled) worker.postMessage({ type: "cancel" });
    },
  };
}

/**
 * The worker export is opt-in (`?export=worker`) for now: it keeps the page
 * responsive, but in headless Chromium (software rendering) drawing on an
 * OffscreenCanvas in a worker was about twice as slow as on the page, so it
 * stays off until it is measured on real GPUs.
 */
export function workerExportRequested(search: string): boolean {
  return new URLSearchParams(search).get("export") === "worker";
}

/** Whether this browser can run the export worker at all. */
export function workerExportSupported(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap !== "undefined";
}

import { describe, expect, it } from "vitest";
import type { ExportRequest, FromWorker, ToWorker } from "./exportProtocol";
import { WorkerExportError, exportInWorker, workerExportRequested, type WorkerLike } from "./workerExport";

class FakeWorker implements WorkerLike {
  sent: ToWorker[] = [];
  terminated = false;
  onmessage: ((e: MessageEvent<FromWorker>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage(msg: ToWorker) {
    this.sent.push(msg);
  }
  terminate() {
    this.terminated = true;
  }
  reply(msg: FromWorker) {
    this.onmessage?.({ data: msg } as MessageEvent<FromWorker>);
  }
}

const request = { type: "start" } as ExportRequest;

describe("exportInWorker", () => {
  it("sends the request, relays progress and resolves with the file", async () => {
    const w = new FakeWorker();
    const seen: number[] = [];
    const job = exportInWorker(w, request, (f) => seen.push(f));
    expect(w.sent).toEqual([request]);
    w.reply({ type: "progress", fraction: 0.25 });
    w.reply({ type: "progress", fraction: 0.75 });
    const blob = new Blob(["x"]);
    w.reply({ type: "done", blob });
    await expect(job.done).resolves.toBe(blob);
    expect(seen).toEqual([0.25, 0.75]);
    expect(w.terminated).toBe(true);
  });

  it("asks the worker to cancel and resolves to null", async () => {
    const w = new FakeWorker();
    const job = exportInWorker(w, request, () => {});
    job.cancel();
    expect(w.sent.at(-1)).toEqual({ type: "cancel" });
    w.reply({ type: "done", blob: null });
    await expect(job.done).resolves.toBeNull();
  });

  it("rejects with WorkerExportError when the worker reports an error", async () => {
    const w = new FakeWorker();
    const job = exportInWorker(w, request, () => {});
    w.reply({ type: "error", message: "no decoder" });
    await expect(job.done).rejects.toBeInstanceOf(WorkerExportError);
    expect(w.terminated).toBe(true);
  });

  it("rejects when the worker script itself fails, and ignores later messages", async () => {
    const w = new FakeWorker();
    const job = exportInWorker(w, request, () => {});
    w.onerror?.({ message: "SyntaxError", preventDefault() {} } as ErrorEvent);
    w.reply({ type: "done", blob: new Blob(["late"]) });
    await expect(job.done).rejects.toThrow("SyntaxError");
    job.cancel();
    expect(w.sent).toEqual([request]);
  });
});

describe("workerExportRequested", () => {
  it("is on only with ?export=worker", () => {
    expect(workerExportRequested("?export=worker")).toBe(true);
    expect(workerExportRequested("?lang=ja&export=worker")).toBe(true);
    expect(workerExportRequested("")).toBe(false);
    expect(workerExportRequested("?export=page")).toBe(false);
  });
});

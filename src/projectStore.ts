/**
 * Keeps the last project in this browser's IndexedDB so a reload (or a closed
 * tab) does not lose the edit. Nothing leaves the device.
 *
 * Two records: "meta" (small JSON, written often) and "media" (the Blobs,
 * written only when a video or the backdrop image changes).
 */

const DB_NAME = "panreel";
const STORE = "project";

export interface SavedMedia {
  source: Blob;
  camera: Blob | null;
  backdrop: Blob | null;
}

export interface SavedProject {
  data: unknown;
  savedAt: number;
  media: SavedMedia;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB is not available"));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("IndexedDB is blocked"));
    });
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = work(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

export async function saveMeta(data: unknown): Promise<void> {
  await run("readwrite", (s) => void s.put({ data, savedAt: Date.now() }, "meta"));
}

export async function saveMedia(media: SavedMedia): Promise<void> {
  await run("readwrite", (s) => void s.put(media, "media"));
}

/** The last project, or null when there is none (or storage is unavailable). */
export async function loadProject(): Promise<SavedProject | null> {
  try {
    const [meta, media] = await Promise.all([
      run<{ data: unknown; savedAt: number } | undefined>("readonly", (s) => s.get("meta")),
      run<SavedMedia | undefined>("readonly", (s) => s.get("media")),
    ]);
    if (!meta || !media || !(media.source instanceof Blob)) return null;
    return { data: meta.data, savedAt: meta.savedAt, media };
  } catch {
    return null;
  }
}

export async function clearProject(): Promise<void> {
  await run("readwrite", (s) => void s.clear());
}

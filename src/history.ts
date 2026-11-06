/**
 * Undo / redo stack of editor snapshots.
 *
 * Call `record(current)` *before* changing anything, passing the state as it
 * is now. Rapid changes that share a `key` (for example, one slider being
 * dragged) are merged into a single undo step.
 */
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  private lastKey: string | null = null;
  private lastAt = -Infinity;

  constructor(
    private readonly limit = 100,
    private readonly mergeWindowMs = 1000,
  ) {}

  record(current: T, key: string | null = null, now = Date.now()): void {
    const merge = key !== null && key === this.lastKey && now - this.lastAt <= this.mergeWindowMs;
    this.lastKey = key;
    this.lastAt = now;
    if (merge) return;
    this.past.push(current);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  /** Returns the state to restore, or null when there is nothing to undo. */
  undo(current: T): T | null {
    const prev = this.past.pop();
    if (prev === undefined) return null;
    this.future.push(current);
    this.lastKey = null;
    return prev;
  }

  /** Returns the state to restore, or null when there is nothing to redo. */
  redo(current: T): T | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(current);
    this.lastKey = null;
    return next;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this.lastKey = null;
  }
}

/** A stable, version-independent store. Native data is authoritative once migrated. */
export interface NativePreferences {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
}

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Reject damaged saves rather than replacing them with a fresh game's defaults. */
export function savedObject(raw: string): Record<string, unknown> {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid saved data');
  }
  return value as Record<string, unknown>;
}

export class PersistentStore {
  private ready = false;
  private starting: Promise<void> | undefined;
  private writing: Promise<void> | undefined;
  private readonly values = new Map<string, string | null>();
  private readonly persisted = new Map<string, string | null>();
  private readonly pending = new Map<string, string>();
  onSaveFailure: (failed: boolean) => void = () => {};

  constructor(
    private readonly browser: () => BrowserStorage,
    private readonly native?: NativePreferences,
  ) {}

  initialize(keys: readonly string[]): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.starting) return this.starting;
    this.starting = this.hydrate(keys).finally(() => { this.starting = undefined; });
    return this.starting;
  }

  private async hydrate(keys: readonly string[]): Promise<void> {
    if (this.native) {
      // Read/validate all keys before migrating anything. A bridge failure must
      // never look like a first install, including when the user taps Retry.
      const entries = await Promise.all(keys.map(async key => {
        const { value: original } = await this.native!.get({ key });
        let value = original;
        if (original !== null) {
          try { savedObject(original); }
          catch {
            value = (await this.native!.get({ key: `${key}.backup` })).value;
            if (value === null) throw new Error('Saved data could not be recovered');
            savedObject(value);
          }
        } else {
          // Only import this app WebView's old localStorage, never overwrite a
          // native save with the stale copy left behind after migration.
          value = (await this.native!.get({ key: `${key}.backup` })).value;
          if (value === null) value = this.browser().getItem(key);
          if (value !== null) savedObject(value);
        }
        return { key, value, restore: value !== original };
      }));
      for (const { key, value, restore } of entries) {
        if (restore && value !== null) {
          await this.native.set({ key: `${key}.backup`, value });
          await this.native.set({ key, value });
        }
        this.values.set(key, value);
        this.persisted.set(key, value);
      }
    } else {
      for (const key of keys) this.read(key);
    }
    this.ready = true;
  }

  read(key: string): string | null {
    if (this.native) {
      if (!this.ready) throw new Error('Load saved data before starting the game');
      return this.values.get(key) ?? null;
    }
    const value = this.pending.get(key) ?? this.browser().getItem(key);
    if (value !== null) savedObject(value);
    return value;
  }

  write(key: string, value: string): void {
    savedObject(value);
    if (this.native) {
      if (!this.ready) throw new Error('Load saved data before saving the game');
      this.values.set(key, value);
    }
    this.pending.set(key, value);
    if (!this.native) {
      // Preserve immediate browser writes; do not defer them to a microtask.
      try {
        this.browser().setItem(key, value);
        this.pending.delete(key);
        this.onSaveFailure(this.pending.size > 0);
      } catch { this.onSaveFailure(true); }
    } else {
      void this.flush().catch(() => { /* Kept in pending; surfaced in the UI. */ });
    }
  }

  /** Serializes bridge writes so an older score cannot finish after a newer one. */
  flush(): Promise<void> {
    if (this.writing) return this.writing;
    this.writing = this.drain().finally(() => { this.writing = undefined; });
    return this.writing;
  }

  private async drain(): Promise<void> {
    try {
      while (this.pending.size) {
        for (const [key, value] of [...this.pending]) {
          if (this.native) {
            const previous = this.persisted.get(key);
            if (previous != null) {
              await this.native.set({ key: `${key}.backup`, value: previous });
            }
            await this.native.set({ key, value });
            this.persisted.set(key, value);
          } else {
            this.browser().setItem(key, value);
          }
          if (this.pending.get(key) === value) this.pending.delete(key);
        }
      }
      this.onSaveFailure(false);
    } catch (error) {
      this.onSaveFailure(true);
      throw error;
    }
  }
}

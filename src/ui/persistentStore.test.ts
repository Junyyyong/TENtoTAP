import { describe, expect, it, vi } from 'vitest';
import { PersistentStore, type NativePreferences } from './persistentStore';

const key = 'makezero.progress.v1';
const settings = 'makezero.settings.v1';
const save = (stage: number) => JSON.stringify({ learningStage: stage, bestEndless: 800 });

function fixture() {
  const web = new Map<string, string>();
  const disk = new Map<string, string>();
  const browser = { getItem: vi.fn((key: string) => web.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { web.set(key, value); }) };
  const native = { get: vi.fn(async ({ key }: { key: string }) => ({ value: disk.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => { disk.set(key, value); }) };
  return { web, disk, browser, native, boot: () => new PersistentStore(() => browser, native) };
}

describe('release save storage', () => {
  it('migrates existing WebView data without deleting the original', async () => {
    const f = fixture(); f.web.set(key, save(10)); f.web.set(settings, '{"musicOn":false}');
    const store = f.boot(); await store.initialize([key, settings]);
    expect(store.read(key)).toBe(save(10));
    expect(f.disk.get(key)).toBe(save(10));
    expect(f.disk.get(settings)).toBe('{"musicOn":false}');
    expect(f.web.get(key)).toBe(save(10));
    expect(f.browser.setItem).not.toHaveBeenCalled();
  });

  it('does not migrate a stale browser copy over native progress on a later version', async () => {
    const f = fixture(); f.web.set(key, save(3)); f.disk.set(key, save(22));
    const store = f.boot(); await store.initialize([key]);
    expect(store.read(key)).toBe(save(22)); expect(f.native.set).not.toHaveBeenCalled();
  });

  it('retains scores, tutorial completion, settings and future fields across app restarts/updates', async () => {
    const f = fixture(); const first = f.boot(); await first.initialize([key, settings]);
    const data = JSON.stringify({ learningStage: 31, bestLimitlessScore: 1400,
      bestEndless: 750, bestTimeless: 920, fewestLeft: 0, futureField: { enabled: true } });
    first.write(key, data); first.write(settings, '{"musicOn":false,"soundOn":true}');
    await first.flush();
    // A new JS runtime (as on a new app build), with the same app preferences.
    f.web.clear(); const nextVersion = f.boot(); await nextVersion.initialize([key, settings]);
    expect(nextVersion.read(key)).toBe(data);
    expect(nextVersion.read(settings)).toBe('{"musicOn":false,"soundOn":true}');
  });

  it('does not create defaults on a fresh install', async () => {
    const f = fixture(); const store = f.boot(); await store.initialize([key]);
    expect(store.read(key)).toBeNull(); expect(f.native.set).not.toHaveBeenCalled();
  });

  it('blocks reads and writes until native loading has completed', async () => {
    const f = fixture(); const store = f.boot();
    expect(() => store.read(key)).toThrow(); expect(() => store.write(key, save(1))).toThrow();
    expect(f.native.set).not.toHaveBeenCalled();
    await store.initialize([key]); expect(store.read(key)).toBeNull();
  });

  it('retries a failed native read without replacing saved data with defaults', async () => {
    const f = fixture(); f.disk.set(key, save(13));
    f.native.get.mockRejectedValueOnce(new Error('bridge unavailable'));
    const store = f.boot(); await expect(store.initialize([key])).rejects.toThrow();
    expect(() => store.write(key, save(1))).toThrow(); expect(f.disk.get(key)).toBe(save(13));
    await store.initialize([key]); expect(store.read(key)).toBe(save(13));
  });

  it('validates all records before migrating and leaves malformed source data untouched', async () => {
    const f = fixture(); f.web.set(key, save(10)); f.web.set(settings, 'broken');
    const store = f.boot(); await expect(store.initialize([key, settings])).rejects.toThrow();
    expect(f.native.set).not.toHaveBeenCalled(); expect(f.web.get(settings)).toBe('broken');
  });

  it.each(['broken', 'null', '[]', '42'])('blocks startup for invalid native data: %s', async bad => {
    const f = fixture(); f.disk.set(key, bad); f.web.set(key, save(1));
    const store = f.boot(); await expect(store.initialize([key])).rejects.toThrow();
    expect(f.disk.get(key)).toBe(bad); expect(f.native.set).not.toHaveBeenCalled();
  });

  it.each(['broken', null])('recovers a missing/damaged primary from the native backup (%s)', async bad => {
    const f = fixture(); if (bad !== null) f.disk.set(key, bad);
    f.disk.set(`${key}.backup`, save(29)); f.web.set(key, save(1));
    const store = f.boot(); await store.initialize([key]);
    expect(store.read(key)).toBe(save(29)); expect(f.disk.get(key)).toBe(save(29));
  });

  it('retries an interrupted migration, without changing its source', async () => {
    const f = fixture(); f.web.set(key, save(10));
    f.native.set.mockRejectedValueOnce(new Error('disk temporarily unavailable'));
    const store = f.boot(); await expect(store.initialize([key])).rejects.toThrow();
    expect(f.web.get(key)).toBe(save(10));
    await store.initialize([key]); expect(f.disk.get(key)).toBe(save(10));
  });

  it('serializes delayed bridge writes and keeps the most recent value', async () => {
    const f = fixture(); const store = f.boot(); await store.initialize([key]);
    let release!: () => void;
    f.native.set.mockImplementationOnce(async ({ key, value }) => {
      await new Promise<void>(resolve => { release = resolve; }); f.disk.set(key, value);
    });
    store.write(key, save(6)); store.write(key, save(7)); store.write(key, save(8));
    expect(store.read(key)).toBe(save(8)); expect(f.native.set).toHaveBeenCalledTimes(1);
    release(); await store.flush();
    expect(f.disk.get(key)).toBe(save(8)); expect(f.disk.get(`${key}.backup`)).toBe(save(6));
  });

  it('keeps failed writes pending, reports failure and succeeds on retry', async () => {
    const f = fixture(); f.disk.set(key, save(10));
    const store = f.boot(); await store.initialize([key]); store.onSaveFailure = vi.fn();
    f.native.set.mockRejectedValueOnce(new Error('write failed'));
    store.write(key, save(11)); await expect(store.flush()).rejects.toThrow();
    expect(f.disk.get(key)).toBe(save(10)); expect(store.read(key)).toBe(save(11));
    expect(store.onSaveFailure).toHaveBeenLastCalledWith(true);
    await store.flush(); expect(f.disk.get(key)).toBe(save(11));
    expect(store.onSaveFailure).toHaveBeenLastCalledWith(false);
  });

  it('retains the old primary if a write fails after backing it up', async () => {
    const f = fixture(); f.disk.set(key, save(10)); const store = f.boot(); await store.initialize([key]);
    const set = f.native.set.getMockImplementation()!;
    f.native.set.mockImplementationOnce(set).mockRejectedValueOnce(new Error('write failed'));
    store.write(key, save(11)); await expect(store.flush()).rejects.toThrow();
    expect(f.disk.get(key)).toBe(save(10)); expect(f.disk.get(`${key}.backup`)).toBe(save(10));
    await store.flush(); expect(f.disk.get(key)).toBe(save(11));
  });

  it('supports native saved progress even when browser storage is unavailable', async () => {
    const f = fixture(); f.disk.set(key, save(10));
    const store = new PersistentStore(() => { throw new Error('blocked'); }, f.native as NativePreferences);
    await store.initialize([key]); store.write(key, save(11)); await store.flush();
    expect(f.disk.get(key)).toBe(save(11));
  });

  it('retains immediate browser saves and retries quota failures', async () => {
    const f = fixture(); const store = new PersistentStore(() => f.browser);
    await store.initialize([key]); store.write(key, save(5)); expect(f.web.get(key)).toBe(save(5));
    f.browser.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    store.onSaveFailure = vi.fn(); store.write(key, save(6));
    expect(store.read(key)).toBe(save(6)); expect(store.onSaveFailure).toHaveBeenLastCalledWith(true);
    await store.flush(); expect(f.web.get(key)).toBe(save(6));
    expect(store.onSaveFailure).toHaveBeenLastCalledWith(false);
  });

  it('does not silently discard damaged browser saves on startup', async () => {
    const f = fixture(); f.web.set(key, 'bad');
    const store = new PersistentStore(() => f.browser);
    await expect(store.initialize([key])).rejects.toThrow(); expect(f.web.get(key)).toBe('bad');
  });
});

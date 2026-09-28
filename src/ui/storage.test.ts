import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeStorage, loadDaily, loadProgress, loadSettings, saveProgress, saveSettings, todayKey } from './storage';

const progressKey = 'makezero.progress.v1';
let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); } });
});
afterEach(() => vi.unstubAllGlobals());

describe('save compatibility', () => {
  it('keeps all mode records, completion marker and future fields when saving', async () => {
    data.set(progressKey, JSON.stringify({ learningStage: 31, bestLimitlessScore: 1500,
      bestEndless: 850, bestTimeless: 1000, fewestLeft: 0, futureField: 'keep me' }));
    await initializeStorage();
    const loaded = loadProgress();
    expect(loaded).toMatchObject({ learningStage: 31, bestLimitlessScore: 1500,
      bestEndless: 850, bestTimeless: 1000, fewestLeft: 0 });
    saveProgress({ ...loaded, bestLimitlessScore: 1600 });
    expect(JSON.parse(data.get(progressKey)!)).toMatchObject({ learningStage: 31,
      bestLimitlessScore: 1600, bestEndless: 850, bestTimeless: 1000, futureField: 'keep me' });
  });

  it('adds missing fields from older saves without erasing their records', () => {
    data.set(progressKey, '{"learningStage":10,"bestEndless":123,"bestTimeless":456}');
    expect(loadProgress()).toMatchObject({ learningStage: 10, bestEndless: 123,
      bestTimeless: 456, bestLimitlessScore: 0 });
    saveProgress(loadProgress()); expect(loadProgress().learningStage).toBe(10);
  });

  it('preserves sound preferences and unknown settings fields', () => {
    data.set('makezero.settings.v1', '{"soundOn":false,"future":1}');
    expect(loadSettings()).toEqual({ soundOn: false, musicOn: true, hapticsOn: true });
    saveSettings({ ...loadSettings(), musicOn: false });
    expect(JSON.parse(data.get('makezero.settings.v1')!)).toMatchObject({ soundOn: false, musicOn: false, future: 1 });
  });

  it('resets only daily statistics on a new day, not highest scores or stages', () => {
    data.set('makezero.daily.v1', '{"date":"2000-01-01","best":100,"games":2}');
    data.set(progressKey, '{"learningStage":22,"bestEndless":800}');
    expect(loadDaily()).toEqual({ date: todayKey(), best: 0, games: 0 });
    expect(loadProgress()).toMatchObject({ learningStage: 22, bestEndless: 800 });
  });
});

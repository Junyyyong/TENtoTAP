import { describe, it, expect, vi, afterEach } from 'vitest';
import { musicSceneFor } from './musicSceneFor';
import { AppStateMachine } from './appStateMachine';
import { loadSettings, saveSettings } from './storage';

afterEach(() => vi.unstubAllGlobals());
describe('TAPtoTEN music integration', () => {
  it('uses menu music while choosing and game music during instructions/play', () => {
    expect(musicSceneFor('mainMenu')).toBe('menu');
    expect(musicSceneFor('intro')).toBe('menu');
    expect(musicSceneFor('settings')).toBe('menu');
    expect(musicSceneFor('lessonIntro')).toBe('game');
    expect(musicSceneFor('inGame')).toBe('game');
  });
  it('keeps splash, pause, completion videos and results silent', () => {
    for (const state of ['splash','paused','bonusBreak','result','story'] as const) {
      expect(musicSceneFor(state)).toBe('silent');
    }
  });
  it('notifies scene changes only after valid state transitions', () => {
    const change = vi.fn();
    const flow = new AppStateMachine('mainMenu', change);
    flow.enter('inGame'); flow.enter('bonusBreak');
    expect(change.mock.calls).toEqual([['inGame'],['bonusBreak']]);
    expect(() => flow.enter('settings')).toThrow();
    expect(change).toHaveBeenCalledTimes(2);
  });
  it('defaults old saves to music enabled and saves independent music mute', () => {
    let raw = JSON.stringify({soundOn:false,hapticsOn:true});
    vi.stubGlobal('localStorage', {getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}});
    expect(loadSettings()).toEqual({musicOn:true,soundOn:false,hapticsOn:true});
    saveSettings({musicOn:false,soundOn:true,hapticsOn:false});
    expect(loadSettings()).toEqual({musicOn:false,soundOn:true,hapticsOn:false});
  });
});

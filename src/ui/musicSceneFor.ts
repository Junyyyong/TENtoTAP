import type { AppState } from './appStateMachine';
import type { MusicScene } from './sceneMusic';

/** Instructions belong to the game; videos, results and pause remain silent. */
export function musicSceneFor(state: AppState): MusicScene {
  if (state === 'inGame' || state === 'lessonIntro') return 'game';
  if (['mainMenu', 'intro', 'settings', 'gallery', 'chapters', 'stages', 'tutorial'].includes(state)) return 'menu';
  return 'silent';
}

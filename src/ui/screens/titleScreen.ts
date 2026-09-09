import type { GameMode } from "../../core/types";
import { el } from "../dom";

/**
 * Mode picker, with whatever progress the player has made so far.
 *
 * The wordmark and the modes are the whole screen. A strip of collected
 * pictures used to sit between them; it competed with the wordmark for the
 * same space, so the room it took went to the wordmark instead.
 */
export class TitleScreen {
  constructor(onPick: (mode: GameMode) => void, onSettings: () => void) {
    for (const mode of ["timeAttack", "endless", "timeless"] as const) {
      el<HTMLButtonElement>(`mode-${mode}`).addEventListener("click", () => onPick(mode));
    }
    el<HTMLButtonElement>("btn-title-settings").addEventListener("click", onSettings);
  }

}

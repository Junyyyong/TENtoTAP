import { el } from "../dom";
import type { Settings } from "../storage";

/**
 * Sound and vibration, on their own screen.
 *
 * These used to be one line in the results overlay, which meant the only way
 * to turn the sound off was to open a panel built for something else. Two
 * switches, said plainly, plus the two things the title screen no longer has
 * room to link to.
 */
export class SettingsScreen {
  private readonly music = el<HTMLButtonElement>('switch-music');
  private readonly sound = el<HTMLButtonElement>("switch-sound");
  private readonly haptics = el<HTMLButtonElement>("switch-haptics");
  private readonly note = el<HTMLParagraphElement>("settings-note");

  constructor(onChange: (settings: Partial<Settings>) => void, onBack: () => void) {
    el<HTMLButtonElement>("btn-settings-back").addEventListener("click", onBack);
    this.music.addEventListener('click', () => onChange({ musicOn: this.music.getAttribute('aria-checked') !== 'true' }));
    this.sound.addEventListener("click", () => {
      onChange({ soundOn: this.sound.getAttribute("aria-checked") !== "true" });
    });
    this.haptics.addEventListener("click", () => {
      onChange({ hapticsOn: this.haptics.getAttribute("aria-checked") !== "true" });
    });
  }

  render(settings: Settings): void {
    this.music.setAttribute('aria-checked', String(settings.musicOn));
    this.sound.setAttribute("aria-checked", String(settings.soundOn));
    this.haptics.setAttribute("aria-checked", String(settings.hapticsOn));

    // A switch that is on but cannot do anything is worse than one that is
    // off — the player turns it on, feels nothing, and assumes it is broken.
    // Say which one it is instead.
    const canBuzz = typeof navigator.vibrate === "function";
    this.note.textContent =
      settings.hapticsOn && !canBuzz ? "This phone (or browser) cannot vibrate." : "";
  }
}

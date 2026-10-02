import { el } from "../dom";
import type { Settings } from "../storage";
import { LegalDocuments } from "./legalDocuments";

/** Music and sound, plus local privacy/license documents. */
export class SettingsScreen {
  private readonly music = el<HTMLButtonElement>('switch-music');
  private readonly sound = el<HTMLButtonElement>("switch-sound");

  constructor(onChange: (settings: Partial<Settings>) => void, onBack: () => void) {
    new LegalDocuments();
    el<HTMLButtonElement>("btn-settings-back").addEventListener("click", onBack);
    this.music.addEventListener('click', () => onChange({ musicOn: this.music.getAttribute('aria-checked') !== 'true' }));
    this.sound.addEventListener("click", () => {
      onChange({ soundOn: this.sound.getAttribute("aria-checked") !== "true" });
    });
  }

  render(settings: Settings): void {
    this.music.setAttribute('aria-checked', String(settings.musicOn));
    this.sound.setAttribute("aria-checked", String(settings.soundOn));
  }
}

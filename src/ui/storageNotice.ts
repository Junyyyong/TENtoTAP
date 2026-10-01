/** Only shown on storage errors; normal launch and game layouts stay unchanged. */
export class StorageNotice {
  private readonly panel = document.createElement('section');
  private readonly message = document.createElement('p');
  private readonly retry = document.createElement('button');

  constructor() {
    this.panel.id = 'storage-notice';
    this.panel.className = 'storage-notice';
    this.panel.hidden = true;
    this.panel.setAttribute('role', 'alert');
    this.retry.type = 'button';
    this.retry.textContent = 'Retry';
    this.panel.append(this.message, this.retry);
    if (document.getElementById('app')?.classList.contains('is-native-frame')) {
      const canvas = document.createElement('div');
      canvas.className = 'native-frame-notice';
      canvas.append(this.panel);
      document.body.append(canvas);
    } else document.body.append(this.panel);
  }

  show(blocking: boolean, action: () => Promise<void>): void {
    this.panel.hidden = false;
    this.panel.classList.toggle('storage-blocking', blocking);
    document.getElementById('app')!.inert = blocking;
    this.message.textContent = blocking
      ? 'Unable to load saved progress.\nYour data has not been reset.\nPlease retry.'
      : 'Progress not saved yet.\nKeep the app open and retry.';
    this.retry.onclick = async () => {
      this.retry.disabled = true;
      try { await action(); }
      catch { /* Leave the notice visible; a failed retry must not reset data. */ }
      finally { this.retry.disabled = false; }
    };
    if (blocking) this.retry.focus();
  }

  hide(): void {
    this.panel.hidden = true;
    this.panel.classList.remove('storage-blocking');
    document.getElementById('app')!.inert = false;
  }
}

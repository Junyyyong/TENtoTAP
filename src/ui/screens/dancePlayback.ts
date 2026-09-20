/** Keep a separate soundtrack behind actual decoded video frames, not a timer. */
export class DancePlayback {
  private cleanup: (() => void) | undefined;
  constructor(private video: HTMLVideoElement, private audio: HTMLAudioElement) {}

  stop(): void { this.cleanup?.(); this.cleanup = undefined; this.video.pause(); this.audio.pause(); }

  play(sources: readonly string[], song: string | undefined, soundOn: () => boolean, hold: () => void): void {
    this.stop();
    let disposed = false, attempt = 0, frame: number | undefined;
    let wait: number | undefined, cap: number | undefined;
    const events = new AbortController();
    const { video, audio } = this;
    const silence = () => audio.pause();
    const cancelFrame = () => { if (frame !== undefined) video.cancelVideoFrameCallback?.(frame); frame = undefined; };
    const finish = () => { if (disposed) return; this.stop(); hold(); };
    const failed = () => {
      if (disposed) return;
      silence(); cancelFrame();window.clearTimeout(wait);window.clearTimeout(cap);
      cap = undefined;
      if (++attempt < sources.length) launch();
      else { video.classList.add('hidden'); finish(); }
    };
    const waiting = () => {
      silence();
      window.clearTimeout(wait);
      wait = window.setTimeout(failed, 8000);
    };
    const syncSound = () => {
      if (disposed || video.paused || video.ended || video.readyState < 2 || !video.videoWidth) return;
      window.clearTimeout(wait);
      if (!cap) cap = window.setTimeout(finish, 15000);
      if (!song || !soundOn()) { silence(); return; }
      if (audio.paused || Math.abs(audio.currentTime-video.currentTime) > .25) {
        try { audio.currentTime = video.currentTime; } catch { return; }
        void audio.play().catch(()=>{});
      }
    };
    const playing = () => {
      cancelFrame();
      if (video.requestVideoFrameCallback) {
        // "playing" alone does not guarantee that a frame has reached the compositor.
        const next = () => {
          if (disposed) return;
          syncSound();
          window.clearTimeout(wait);
          wait = window.setTimeout(failed, 4000);
          frame = video.requestVideoFrameCallback(next);
        };
        frame = video.requestVideoFrameCallback(next);
      } else syncSound();
    };
    const launch = () => {
      video.pause();silence();
      video.muted = true;video.playsInline = true;video.classList.remove('hidden');
      const url = new URL(sources[attempt]!, location.href).href;
      if (video.src !== url) video.src = url;
      else { try { video.currentTime=0; } catch { video.load(); } }
      waiting();
      const currentAttempt = attempt;
      void video.play().catch(()=>{if(!disposed && attempt===currentAttempt) failed();});
    };
    for (const event of ['waiting','stalled','pause']) video.addEventListener(event,silence,{signal:events.signal});
    video.addEventListener('waiting',waiting,{signal:events.signal});
    video.addEventListener('stalled',waiting,{signal:events.signal});
    video.addEventListener('playing',playing,{signal:events.signal});
    video.addEventListener('ended',finish,{signal:events.signal});
    video.addEventListener('error',failed,{signal:events.signal});
    if (!video.requestVideoFrameCallback) video.addEventListener('timeupdate',syncSound,{signal:events.signal});
    this.cleanup=()=>{disposed=true;events.abort();cancelFrame();window.clearTimeout(wait);window.clearTimeout(cap);};
    if (song && audio.src !== new URL(song,location.href).href) audio.src=song;
    launch();
  }
}

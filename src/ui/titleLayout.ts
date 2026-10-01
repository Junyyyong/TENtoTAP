import { nativeCanvasScale } from './nativeFrame';

/** Keep the original menu bands where they fit; otherwise use reachable
 * natural flow. Never shrink text to fix a short window. Web stays unchanged. */
export function trackTitleLayout(screen: HTMLElement): void {
  if (!screen.closest('#app.is-native-frame')) return;
  const logo = screen.querySelector<HTMLElement>('.brand-mark')!;
  const modes = screen.querySelector<HTMLElement>('.mode-list')!;
  const prompt = screen.querySelector<HTMLElement>('.title-music-prompt')!;
  const slot = screen.querySelector<HTMLElement>('.title-music-slot')!;
  let frame = 0;
  let hidden = screen.classList.contains('hidden');
  const measure = () => {
    frame = 0;
    if (!screen.getClientRects().length) return;
    const scroll = screen.scrollTop;
    screen.classList.remove('is-space-limited');
    const scale = nativeCanvasScale(screen);
    const hasPrompt = !prompt.classList.contains('hidden');
    const bottom = screen.getBoundingClientRect().bottom;
    const overlaps = logo.getBoundingClientRect().bottom > modes.getBoundingClientRect().top;
    const overflows = hasPrompt && prompt.getBoundingClientRect().bottom + scroll * scale > bottom;
    screen.style.setProperty('--music-footer-space', hasPrompt ? `${slot.getBoundingClientRect().height / scale + 2}px` : '0px');
    screen.classList.toggle('is-space-limited', overlaps || overflows);
    screen.scrollTop = scroll;
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
  const observer = new ResizeObserver(schedule);
  observer.observe(screen);
  observer.observe(logo);
  new MutationObserver(() => {
    const next = screen.classList.contains('hidden');
    if (hidden !== next) { hidden = next; schedule(); }
  }).observe(screen, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(schedule).observe(prompt, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  window.addEventListener('resize', schedule);
  document.fonts.addEventListener('loadingdone', schedule);
  void document.fonts.ready.then(schedule);
}

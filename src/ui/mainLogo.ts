import { nativeCanvasScale } from './nativeFrame';

/** User-approved reduction of the previous painted size, including its caps. */
export const MAIN_LOGO_SIZE = .8;

/** TAPtoTALK's current visible artwork width, not its PNG element's max-width.
 * Both original logos reach their image's left/right alpha bounds. TALK's
 * 3603×3146 PNG is also constrained by its original brand band minus KOREAN.
 * Keep these reference values separate from TEN's existing layout geometry. */
export function talkVisibleLogoWidth(width: number, height: number): number {
  if (!(width > 0 && height > 0) || !Number.isFinite(width + height)) return 0;
  const [bandRatio, bandCap, logoRatio, logoCap] = height <= 580
    ? [.44, 165, .5808, 218]
    : height <= 700 ? [.58, 215, .7656, 284] : [.68, 250, .8976, 330];
  const bandHeight = Math.min(width * bandRatio!, bandCap!) * 726 / 618;
  return Math.max(0, Math.min(width * logoRatio!, logoCap!, (bandHeight - 24) * 3603 / 3146));
}

export function mainLogoPaintScale(targetWidth: number, width: number, height: number, roomWidth: number, roomHeight: number): number {
  if (![targetWidth, width, height].every(v => Number.isFinite(v) && v > 0)) return 1;
  if (![roomWidth, roomHeight].every(Number.isFinite)) return 1;
  return Math.max(0, Math.min(targetWidth / width, roomWidth / width, roomHeight / height));
}

/** Enlarge only the painted logo. Its original flex box and center remain
 * unchanged, so the menu/settings never move. Short windows cap the artwork
 * at the symmetric available space rather than clipping it or moving UI. */
export function trackMainLogoSize(screen: HTMLElement): void {
  const logo = screen.querySelector<HTMLImageElement>('.brand-mark')!;
  const block = screen.querySelector<HTMLElement>('.brand-block')!;
  const modes = screen.querySelector<HTMLElement>('.mode-list')!;
  const app = screen.closest<HTMLElement>('#app')!;
  let frame = 0;
  const measure = () => {
    frame = 0;
    if (!screen.getClientRects().length || !logo.complete) return;
    const scale = nativeCanvasScale(screen);
    const box = screen.getBoundingClientRect(), art = logo.getBoundingClientRect();
    const css = getComputedStyle(screen), imageCss = getComputedStyle(logo);
    const centerY = (art.top + art.bottom) / 2, centerX = (art.left + art.right) / 2;
    const top = box.top + parseFloat(css.paddingTop) * scale;
    const bottom = modes.getBoundingClientRect().top - parseFloat(css.rowGap || '10') * scale;
    const left = box.left + parseFloat(css.paddingLeft) * scale;
    const right = box.right - parseFloat(css.paddingRight) * scale;
    const target = talkVisibleLogoWidth(parseFloat(getComputedStyle(app).width), parseFloat(getComputedStyle(app).height));
    const next = MAIN_LOGO_SIZE * mainLogoPaintScale(target, parseFloat(imageCss.width), parseFloat(imageCss.height),
      Math.max(0, 2 * Math.min(centerX - left, right - centerX) / scale),
      Math.max(0, 2 * Math.min(centerY - top, bottom - centerY) / scale));
    const value = String(next);
    if (logo.style.getPropertyValue('--main-logo-scale') !== value) logo.style.setProperty('--main-logo-scale', value);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
  const observer = new ResizeObserver(schedule);
  for (const element of [screen, block, modes]) observer.observe(element);
  new MutationObserver(schedule).observe(screen, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  logo.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  document.fonts.addEventListener('loadingdone', schedule);
  void document.fonts.ready.then(schedule);
  schedule();
}

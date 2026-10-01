/** Normalize density, not aspect ratio. 390×844 remains the design reference. */
export const NATIVE_FRAME = { width: 390, height: 844, minHeight: 640 } as const;
export interface FrameInsets { top: number; right: number; bottom: number; left: number }

export function fitNativeFrame(width: number, height: number, insets: FrameInsets) {
  const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const left = safe(insets.left), top = safe(insets.top);
  const availableWidth = Math.max(0, safe(width) - left - safe(insets.right));
  const availableHeight = Math.max(0, safe(height) - top - safe(insets.bottom));
  const scale = Math.min(availableWidth / NATIVE_FRAME.width, availableHeight / NATIVE_FRAME.minHeight);
  return {
    scale,
    x: left,
    y: top,
    width: scale > 0 ? availableWidth / scale : 0,
    height: scale > 0 ? availableHeight / scale : 0,
    insets: {
      top: scale > 0 ? top / scale : 0,
      right: scale > 0 ? safe(insets.right) / scale : 0,
      bottom: scale > 0 ? safe(insets.bottom) / scale : 0,
      left: scale > 0 ? left / scale : 0,
    },
  };
}

/** Only convert painted distances when writing them back into canvas CSS.
 * Pointer hit testing stays in client coordinates; layout uses CSS dimensions. */
export function nativeCanvasScale(element: HTMLElement): number {
  const app = element.closest<HTMLElement>('#app.is-native-frame');
  if (!app) return 1;
  const width = parseFloat(getComputedStyle(app).width);
  const scale = app.getBoundingClientRect().width / width;
  return scale > 0 && Number.isFinite(scale) ? scale : 1;
}

/** Never changes OS density, viewport metadata, web layout, or storage. */
export function trackNativeFrame(enabled: boolean): void {
  if (!enabled || !CSS.supports('container-type', 'size')) return;
  const root = document.documentElement;
  const app = document.getElementById('app')!;
  root.classList.add('has-native-frame');
  app.classList.add('is-native-frame');
  let frame = 0;
  const set = (name: string, value: string) => {
    // Root mutations trigger measurement too; do not create a feedback loop.
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
  };
  const measure = (): void => {
    frame = 0;
    const viewport = window.visualViewport;
    // OS accessibility magnification is not something this app should undo.
    if (viewport && viewport.scale > 1.01) return;
    const css = getComputedStyle(root);
    const inset = (side: string) => {
      // MainActivity reports remaining overlap with the actual WebView.
      // Explicit zero wins even if env()/Capacitor still report nonzero bars.
      const overlap = parseFloat(css.getPropertyValue(`--android-game-inset-${side}`));
      return Number.isFinite(overlap) ? overlap : parseFloat(css.getPropertyValue(`--app-safe-${side}`)) || 0;
    };
    const fit = fitNativeFrame(viewport?.width ?? innerWidth, viewport?.height ?? innerHeight, {
      top: inset('top'), right: inset('right'), bottom: inset('bottom'), left: inset('left'),
    });
    set('--frame-scale', String(fit.scale));
    set('--frame-left', `${fit.x}px`);
    set('--frame-top', `${fit.y}px`);
    set('--frame-width', `${fit.width}px`);
    set('--frame-height', `${fit.height}px`);
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      set(`--frame-safe-${side}`, `${fit.insets[side]}px`);
    }
    set('--frame-full-width', `${fit.width + fit.insets.left + fit.insets.right}px`);
    set('--frame-full-height', `${fit.height + fit.insets.top + fit.insets.bottom}px`);
  };
  const schedule = (): void => { if (!frame) frame = requestAnimationFrame(measure); };
  new MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ['style'] });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(schedule).observe(document.body);
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  measure();
}

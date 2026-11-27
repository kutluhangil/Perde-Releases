// Hero heykelinin yerleşimi ve yaşam döngüsü (React bileşenindeki kablolamanın karşılığı).
// Görsel, üst boşlukla metin bloğu arasındaki banda ortalanır; telefonda dikey yelpaze yüklenir.
import { LiquidEngine, clamp, computeRect, type EngineOptions } from './liquid-engine';

const root = document.querySelector<HTMLElement>('[data-hero]');

if (root) {
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const img = root.querySelector<HTMLImageElement>('[data-fallback]')!;
  const hint = root.querySelector<HTMLElement>('[data-hint]')!;
  const navspace = root.querySelector<HTMLElement>('[data-navspace]')!;
  const content = root.querySelector<HTMLElement>('[data-content]')!;
  const backdrop = root.querySelector<HTMLElement>('[data-backdrop]')!;
  const layout = { scale: 1, mobileScale: 1, x: 0, y: 0 };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(hover: none), (pointer: coarse)');
  let aspect = 2.4;
  let mobile = innerWidth < 640;

  if (coarse.matches) hint.textContent = hint.dataset.touch!;

  const bgRgb = (): [number, number, number] => {
    const m = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g) ?? ['235', '233', '229'];
    return [+m[0] / 255, +m[1] / 255, +m[2] / 255];
  };

  const options = (): EngineOptions => ({
    interactive: true,
    strength: 1,
    radius: 220,
    density: 0.8,
    dotSize: 1,
    spread: 1,
    turbulence: 1,
    liquid: 1,
    streaks: true,
    restStyle: 'image',
    returnSpeed: 1,
    ambient: false,
    ambientIntensity: 1,
    speed: 1,
    intro: true,
    reducedMotion: reduced.matches,
    bg: bgRgb(),
    imgBg: null,
  });

  const canvas = document.createElement('canvas');
  canvas.className = 'sh-canvas';
  stage.appendChild(canvas);
  const fail = () => (root.dataset.gl = 'off');
  let engine: LiquidEngine | null = null;
  try {
    engine = new LiquidEngine(canvas, options(), fail);
  } catch {
    fail();
  }

  function relayout() {
    const w = root!.clientWidth;
    const h = root!.clientHeight;
    const band = { top: navspace.offsetTop + navspace.offsetHeight + 8, bottom: content.offsetTop - 8 };
    // dikey yelpaze telefonda metnin üstüne biraz taşar
    if (mobile && aspect < 1.3) band.bottom += content.offsetHeight * 0.08;
    const rect = computeRect(w, h, aspect, band, layout);
    const chars = backdrop.textContent!.length;
    backdrop.style.fontSize = `${Math.min((band.bottom - band.top) * 0.95, (w * 0.92) / (chars * 0.56))}px`;
    backdrop.style.top = `${(band.top + band.bottom) / 2}px`;
    Object.assign(img.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
    img.dataset.placed = '';
    hint.style.display = mobile && aspect < 1.3 ? 'none' : '';
    hint.style.left = `${clamp(rect.x + rect.w / 2, 80, w - 80)}px`;
    hint.style.top = `${Math.min(rect.y + rect.h * 0.97, band.bottom - 20)}px`;
    engine?.resize(w, h, rect);
  }

  function load() {
    const src = mobile ? img.dataset.tall! : img.dataset.wide!;
    const image = new Image();
    image.decoding = 'async';
    const swapping = root!.dataset.gl === 'on';
    if (swapping) root!.dataset.swap = '1';
    image.onload = () => {
      aspect = image.naturalWidth / image.naturalHeight || aspect;
      if (!img.src.endsWith(src)) img.src = src;
      relayout();
      if (engine && root!.dataset.gl !== 'off') {
        try {
          engine.onFirstFrame = () => {
            root!.dataset.gl = 'on';
            delete root!.dataset.swap;
          };
          engine.setImage(image);
          relayout();
        } catch {
          fail();
        }
      } else delete root!.dataset.swap;
    };
    image.onerror = () => delete root!.dataset.swap;
    setTimeout(() => (image.src = src), swapping ? 280 : 0);
  }

  new ResizeObserver(() => {
    const next = root.clientWidth < 640;
    if (next !== mobile) {
      mobile = next;
      load();
    }
    relayout();
  }).observe(root);
  new IntersectionObserver(([e]) => engine?.setVisible(e.isIntersecting && !document.hidden)).observe(root);
  document.addEventListener('visibilitychange', () => engine?.setVisible(!document.hidden));
  reduced.addEventListener('change', () => engine?.setOptions({ reducedMotion: reduced.matches }));
  document.addEventListener('perde:theme', () => requestAnimationFrame(() => engine?.setOptions({ bg: bgRgb() })));

  const pos = (e: PointerEvent) => {
    const b = root.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top] as const;
  };
  const touched = () => (root.dataset.touched = '1');
  root.addEventListener(
    'pointermove',
    (e) => {
      const touch = e.pointerType === 'touch';
      if (touch && e.buttons === 0 && e.pressure === 0) return;
      engine?.pointer('move', ...pos(e), touch);
      touched();
    },
    { passive: true },
  );
  root.addEventListener(
    'pointerdown',
    (e) => {
      engine?.pointer('down', ...pos(e), e.pointerType === 'touch');
      touched();
    },
    { passive: true },
  );
  const up = (e: PointerEvent) => engine?.pointer('up', ...pos(e), e.pointerType === 'touch');
  root.addEventListener('pointerup', up, { passive: true });
  root.addEventListener('pointercancel', up, { passive: true });
  root.addEventListener('pointerleave', (e) => engine?.pointer('leave', ...pos(e), e.pointerType === 'touch'), { passive: true });

  load();
}

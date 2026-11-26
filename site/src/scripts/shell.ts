// Sayfa kabuğu: tema, dil, sistem algılayan indirme, üst çubuk ve hero sahneleri.
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Tema ---------- */
type Theme = 'light' | 'dark';
const themeButton = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');

function labelTheme() {
  if (!themeButton) return;
  const dark = root.dataset.theme === 'dark';
  themeButton.setAttribute('aria-label', dark ? themeButton.dataset.labelLight! : themeButton.dataset.labelDark!);
}

function setTheme(next: Theme, origin?: { x: number; y: number }) {
  const apply = () => {
    root.dataset.theme = next;
    labelTheme();
    document.dispatchEvent(new CustomEvent('perde:theme', { detail: next }));
  };
  try {
    localStorage.setItem('perde-theme', next);
  } catch {}
  const start = (document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } })
    .startViewTransition;
  if (!start || reduced.matches) return apply();
  root.style.setProperty('--vt-x', `${origin?.x ?? innerWidth - 80}px`);
  root.style.setProperty('--vt-y', `${origin?.y ?? 40}px`);
  start.call(document, apply);
}

labelTheme();
themeButton?.addEventListener('click', (e) => {
  const r = themeButton.getBoundingClientRect();
  setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', {
    x: e.clientX || r.left + r.width / 2,
    y: e.clientY || r.top + r.height / 2,
  });
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('perde-theme');
  } catch {}
  if (!saved) setTheme(e.matches ? 'dark' : 'light');
});

/* ---------- Dil ---------- */
document.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]').forEach((a) => {
  a.addEventListener('click', () => {
    try {
      localStorage.setItem('perde-lang', a.dataset.langSwitch!);
    } catch {}
    a.href = a.href.split('#')[0] + location.hash;
  });
});

/* ---------- İndirme: sistemi tahmin et ---------- */
type OS = 'macos' | 'windows' | 'linux';
const base = 'https://github.com/kutluhangil/Perde-Releases/releases/latest/download/';

async function detect(): Promise<{ os: OS; arm: boolean }> {
  const uad = (navigator as Navigator & {
    userAgentData?: { platform: string; getHighEntropyValues(h: string[]): Promise<{ architecture?: string }> };
  }).userAgentData;
  const p = (uad?.platform || navigator.platform || navigator.userAgent).toLowerCase();
  const os: OS = p.includes('win') ? 'windows' : p.includes('linux') || p.includes('x11') ? 'linux' : 'macos';
  let arm = /arm|aarch64/i.test(navigator.userAgent);
  try {
    const h = await uad?.getHighEntropyValues(['architecture']);
    if (h?.architecture) arm = h.architecture === 'arm';
  } catch {}
  return { os, arm };
}

const labels = JSON.parse(document.querySelector<HTMLElement>('[data-hero]')?.dataset.downloadLabels || '{}') as Record<string, string>;

detect().then(({ os, arm }) => {
  root.dataset.os = os;
  const file =
    os === 'linux' ? (arm ? 'Perde-Linux-aarch64.AppImage' : 'Perde-Linux-x86_64.AppImage') : 'Perde-macOS-arm64.dmg';
  document.querySelectorAll<HTMLAnchorElement>('[data-download-link]').forEach((a) => {
    if (os === 'windows') {
      a.href = '#indir';
    } else {
      a.href = base + file;
    }
    const label = a.matches('[data-download-label]') ? a.querySelector('span') : null;
    if (label && labels[os]) label.textContent = os === 'windows' ? labels.soon : labels[os];
  });
  document.dispatchEvent(new CustomEvent('perde:os', { detail: os }));
});

/* ---------- Üst çubuk ---------- */
const topbar = document.querySelector<HTMLElement>('[data-topbar]');
const edge = document.querySelector<HTMLElement>('[data-scroll-edge]');
const hero = document.querySelector<HTMLElement>('[data-hero]');
if (topbar && hero) {
  new IntersectionObserver(
    ([entry]) => {
      topbar.toggleAttribute('data-over-media', entry.isIntersecting);
      edge?.toggleAttribute('data-on', !entry.isIntersecting);
    },
    { rootMargin: '-72px 0px 0px 0px', threshold: 0 },
  ).observe(hero);
}

/* ---------- Hero sahneleri ---------- */
const scenes = [...document.querySelectorAll<HTMLElement>('[data-scenes] .scene')];
const titleEl = document.querySelector('[data-scene-title]');
const yearEl = document.querySelector('[data-scene-year]');
let timer = 0;
let index = 0;

function load(scene: HTMLElement) {
  scene.querySelectorAll<HTMLSourceElement>('source[data-srcset]').forEach((s) => {
    s.srcset = s.dataset.srcset!;
    s.removeAttribute('data-srcset');
  });
  const img = scene.querySelector<HTMLImageElement>('img[data-src]');
  if (img) {
    img.src = img.dataset.src!;
    img.removeAttribute('data-src');
  }
}

function playlist() {
  return scenes.filter((s) => s.dataset.mood === (root.dataset.theme === 'dark' ? 'dark' : 'light'));
}

function show(scene: HTMLElement) {
  load(scene);
  scenes.forEach((s) => s.toggleAttribute('data-on', s === scene));
  if (titleEl) titleEl.textContent = scene.dataset.title!;
  if (yearEl) yearEl.textContent = scene.dataset.year!;
  root.style.setProperty('--tint', scene.dataset.tint!);
}

function schedule() {
  clearInterval(timer);
  const list = playlist();
  if (reduced.matches || list.length < 2) return;
  load(list[(index + 1) % list.length]);
  timer = window.setInterval(() => {
    if (document.hidden) return;
    index = (index + 1) % list.length;
    show(list[index]);
    load(list[(index + 1) % list.length]);
  }, 7000);
}

function restart() {
  index = 0;
  const list = playlist();
  if (list[0]) show(list[0]);
  schedule();
}

if (scenes.length) {
  restart();
  document.addEventListener('perde:theme', restart);
}

/* ---------- PERDE yazısını genişliğe sığdır ----------
   Ölçüm canvas'ta, yazı tipi açıkça yüklendikten sonra yapılır (yerleşimden ve yedek yazı tipinden bağımsız). */
document.querySelectorAll<HTMLElement>('[data-fit]').forEach(async (el) => {
  const style = getComputedStyle(el);
  const font = `${style.fontWeight} 100px ${style.fontFamily}`;
  const text = el.textContent!.trim();
  const ctx = document.createElement('canvas').getContext('2d')!;
  const spacing = parseFloat(style.letterSpacing) / parseFloat(style.fontSize) || 0;
  const fit = () => {
    ctx.font = font;
    const w = ctx.measureText(text).width + spacing * 100 * text.length;
    if (w) el.style.setProperty('--brand-size', `${Math.min((100 * el.parentElement!.clientWidth) / w, 480)}px`);
  };
  try {
    await document.fonts.load(font, text);
  } catch {}
  fit();
  new ResizeObserver(fit).observe(el.parentElement!);
});

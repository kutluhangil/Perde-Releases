// Sayfa kabuğu: tema, dil, sistem algılayan indirme, sıvı menü (bölüm izleme) ve belirme.
import { LiquidNav } from './liquid-nav';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Sıvı menü: tıklanan bölüme gider, kaydırınca damla bulunulan bölüme akar ---------- */
const navEl = document.querySelector<HTMLElement>('[data-liquid-nav]');
const nav = navEl ? new LiquidNav(navEl, () => (lockUntil = performance.now() + 1200)) : null;
const targets = navEl
  ? [...navEl.querySelectorAll<HTMLAnchorElement>('.nimbus-item')].map((a) => document.querySelector<HTMLElement>(a.getAttribute('href')!))
  : [];
let lockUntil = 0;
let spyQueued = false;

const bar = document.querySelector<HTMLElement>('[data-site-nav]');

function spy() {
  spyQueued = false;
  bar?.toggleAttribute('data-scrolled', scrollY > 24);
  if (!nav || performance.now() < lockUntil) return;
  const line = innerHeight * 0.4;
  let index = 0;
  targets.forEach((el, i) => {
    if (el && el.getBoundingClientRect().top <= line) index = i;
  });
  // sayfanın sonunda son bölüm (SSS kısa olabilir)
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) index = targets.length - 1;
  nav.select(index);
}
addEventListener('scroll', () => {
  if (!spyQueued) {
    spyQueued = true;
    requestAnimationFrame(spy);
  }
}, { passive: true });
addEventListener('scrollend', () => {
  lockUntil = 0;
  spy();
});
spy();

/* ---------- Tema ---------- */
type Theme = 'light' | 'dark';
const themeButton = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');

function applyTone() {
  nav?.setTone(root.dataset.theme === 'dark' ? 'dark' : 'light');
  if (!themeButton) return;
  const dark = root.dataset.theme === 'dark';
  themeButton.setAttribute('aria-label', dark ? themeButton.dataset.labelLight! : themeButton.dataset.labelDark!);
}

function setTheme(next: Theme, origin?: { x: number; y: number }) {
  const apply = () => {
    root.dataset.theme = next;
    applyTone();
    document.dispatchEvent(new CustomEvent('perde:theme', { detail: next }));
  };
  try {
    localStorage.setItem('perde-theme', next);
  } catch {}
  const start = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
  if (!start || reduced.matches) return apply();
  root.style.setProperty('--vt-x', `${origin?.x ?? innerWidth - 80}px`);
  root.style.setProperty('--vt-y', `${origin?.y ?? 40}px`);
  start.call(document, apply);
}

applyTone();
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

/* ---------- Dil: bulunulan bölüm korunur ---------- */
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
// Telefon ve tablette kurulacak dosya yok: düğmeler indirme bölümüne gider.
const phone = /iphone|ipad|ipod|android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
  if (phone) root.dataset.device = 'phone';
  // Windows kurulumu şimdilik yalnız ARM64; x64 bilgisayar indirme bölümüne gider ve "yakında" yazar.
  const file = phone
    ? null
    : os === 'linux'
      ? arm ? 'Perde-Linux-aarch64.AppImage' : 'Perde-Linux-x86_64.AppImage'
      : os === 'windows'
        ? arm ? 'Perde-Windows-arm64-setup.exe' : null
        : 'Perde-macOS-arm64.dmg';
  document.querySelectorAll<HTMLAnchorElement>('[data-download-link]').forEach((a) => {
    a.href = file ? base + file : '#indir';
    const label = a.matches('[data-download-label]') ? a.querySelector('span') : null;
    if (label && labels[os]) label.textContent = phone ? labels.phone : file ? labels[os] : labels.soon;
  });
  document.querySelectorAll<HTMLElement>('[data-platform]').forEach((el) => el.toggleAttribute('data-yours', el.dataset.platform === os));
  document.dispatchEvent(new CustomEvent('perde:os', { detail: os }));
});

/* ---------- Belirme ---------- */
const reveal = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      reveal.unobserve(e.target);
    }),
  { rootMargin: '0px 0px -8% 0px' },
);
document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

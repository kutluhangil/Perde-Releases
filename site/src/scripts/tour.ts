// Canlı turun yönetimi: iframe'i görünürken yükler, bölümleri sırayla oynatır, sistem seçicisini uygular.
// iframe ile köprü: { perdeTour: 1, chapter, auto } / { perdeTour: 1, os } gönderilir; { ready } ve { interact } gelir.
const section = document.querySelector<HTMLElement>('[data-tour]');

if (section) {
  const frame = section.querySelector<HTMLElement>('[data-frame]')!;
  const iframe = frame.querySelector('iframe')!;
  const chapters = [...section.querySelectorAll<HTMLButtonElement>('[data-chapter]')];
  const nameEl = section.querySelector('[data-chapter-name]')!;
  const lineEl = section.querySelector('[data-chapter-line]')!;
  const indexEl = section.querySelector('[data-chapter-index]')!;
  const bar = section.querySelector<HTMLElement>('[data-progress]')!;
  const toggle = section.querySelector<HTMLButtonElement>('[data-toggle]')!;
  const osButtons = [...section.querySelectorAll<HTMLButtonElement>('.os [data-os]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 0;
  let ready = false;
  let playing = !reduced;
  let visible = false;
  let started = 0;
  let elapsed = 0;
  let os = 'macos';

  const send = (msg: Record<string, unknown>) =>
    ready && iframe.contentWindow?.postMessage({ perdeTour: 1, ...msg }, location.origin);

  /* Masaüstünde 1200×750 pencere kabın genişliğine ölçeklenir */
  const fit = () => {
    const k = matchMedia('(max-width: 719px)').matches ? 1 : Math.min(1, frame.clientWidth / 1200);
    frame.style.setProperty('--k', String(k));
  };
  new ResizeObserver(fit).observe(frame);

  function render() {
    const c = chapters[current];
    chapters.forEach((b, i) => (i === current ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    nameEl.textContent = c.dataset.name!;
    lineEl.textContent = c.dataset.line!;
    indexEl.textContent = String(current + 1);
  }

  function go(i: number, auto: boolean) {
    current = (i + chapters.length) % chapters.length;
    elapsed = 0;
    started = performance.now();
    render();
    send({ chapter: chapters[current].dataset.chapter, auto });
  }

  function loop(now: number) {
    requestAnimationFrame(loop);
    if (!playing || !visible || !ready || document.hidden) {
      started = now - elapsed;
      return;
    }
    elapsed = now - started;
    const duration = Number(chapters[current].dataset.duration);
    bar.style.transform = `scaleX(${Math.min(1, elapsed / duration)})`;
    if (elapsed >= duration) go(current + 1, true);
  }

  function setPlaying(next: boolean) {
    playing = next;
    toggle.toggleAttribute('data-paused', !playing);
    toggle.setAttribute('aria-label', playing ? toggle.dataset.labelPause! : toggle.dataset.labelPlay!);
    if (!playing) bar.style.transform = 'scaleX(0)';
  }
  setPlaying(playing);

  function setOS(next: string) {
    os = next;
    frame.dataset.os = os;
    osButtons.forEach((b) => {
      const on = b.dataset.os === os;
      b.setAttribute('aria-checked', String(on));
      b.setAttribute('aria-pressed', String(on));
    });
    send({ os });
  }

  chapters.forEach((b, i) =>
    b.addEventListener('click', () => {
      setPlaying(false);
      go(i, true);
    }),
  );
  section.querySelector('[data-prev]')!.addEventListener('click', () => {
    setPlaying(false);
    go(current - 1, true);
  });
  section.querySelector('[data-next]')!.addEventListener('click', () => {
    setPlaying(false);
    go(current + 1, true);
  });
  toggle.addEventListener('click', () => {
    setPlaying(!playing);
    if (playing) go(current + 1, true);
  });
  osButtons.forEach((b) => b.addEventListener('click', () => setOS(b.dataset.os!)));

  addEventListener('message', (e) => {
    if (e.source !== iframe.contentWindow || e.origin !== location.origin || !e.data?.perdeTour) return;
    if (e.data.ready) {
      ready = true;
      send({ os });
      go(current, true);
    }
    if (e.data.interact && playing) setPlaying(false);
  });

  /* Sistem: adres çubuğundaki #tur-windows önce gelir, yoksa ziyaretçinin sistemi */
  const fromHash = location.hash.match(/^#tur-(macos|windows|linux)$/)?.[1];
  if (fromHash) setOS(fromHash);
  else
    document.addEventListener('perde:os', (e) => {
      if (!fromHash) setOS((e as CustomEvent<string>).detail);
    });
  if (document.documentElement.dataset.os) setOS(document.documentElement.dataset.os);

  /* Yaklaşınca yükle, görünürken oynat */
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !iframe.src) iframe.src = iframe.dataset.src!;
    },
    { rootMargin: '600px 0px' },
  ).observe(frame);
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
    },
    { threshold: 0.35 },
  ).observe(frame);

  requestAnimationFrame(loop);
}

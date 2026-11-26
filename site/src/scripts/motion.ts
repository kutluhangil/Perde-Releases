// Kaydırma hareketleri (GSAP ScrollTrigger). "Hareketi azalt" açıksa hiçbiri kurulmaz; sayfa hareketsiz de tamdır.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  gsap.registerPlugin(ScrollTrigger);

  /* 1 · Perde açılır: PER sola, DE sağa; ortadan tur penceresi büyüyerek gelir */
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (hero) {
    gsap
      .timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } })
      .to(hero.querySelector('.per'), { xPercent: -38, ease: 'none' }, 0)
      .to(hero.querySelector('.de'), { xPercent: 52, ease: 'none' }, 0)
      .to(hero.querySelectorAll('.hero-row, .now'), { y: -60, opacity: 0, ease: 'none' }, 0)
      .to(hero.querySelector('.scenes'), { scale: 1.08, opacity: 0.35, ease: 'none' }, 0);
  }
  const frame = document.querySelector('[data-frame]');
  if (frame) {
    gsap.fromTo(
      frame,
      { scale: 0.86, y: 60, opacity: 0.4 },
      { scale: 1, y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'top 30%', scrub: 0.6 } },
    );
  }

  /* 2 · Bölümler: başlık, metin, parça sırayla yükselir */
  const groups = [
    '.section-head',
    '.steps .step',
    '.rows .row',
    '.plate',
    '.cols',
    '.table tbody',
    '.faq .list',
    '.privacy .grid',
    '.controls, .dock',
  ];
  document.querySelectorAll<HTMLElement>(groups.join(',')).forEach((group) => {
    const items = group.matches('.cols, .table tbody, .faq .list, .privacy .grid')
      ? group.querySelectorAll(':scope > *')
      : group.matches('.section-head, .step, .row')
        ? group.querySelectorAll(':scope > *')
        : [group];
    gsap.from(items, {
      y: 36,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.08,
      scrollTrigger: { trigger: group, start: 'top 92%', once: true },
    });
  });

  /* 3 · Kapanış: PERDE harfleri tek tek iner */
  const word = document.querySelector('.footer .word');
  if (word) {
    gsap.from(word.querySelectorAll('span'), {
      yPercent: -60,
      opacity: 0,
      duration: 1,
      ease: 'power4.out',
      stagger: 0.08,
      scrollTrigger: { trigger: word, start: 'top 95%', once: true },
    });
  }

  /* Görseller, yazı tipleri ve tur penceresi yerleşince konumları yeniden hesapla */
  const refresh = () => ScrollTrigger.refresh();
  addEventListener('load', refresh);
  document.fonts.ready.then(refresh);
}

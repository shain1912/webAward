/* KODE KOREA — site behaviour
   Restrained per the design system: Lenis smooth scroll, one motion
   idiom (slow reveal), a mono KST clock, stat counters, mobile menu.
   No shader, no custom cursor, no glow. */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

gsap.registerPlugin(ScrollTrigger);

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function scrollTo(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.2 });
  else document.querySelector(target)?.scrollIntoView();
}

/* ---------- KST clock (mono, tabular) ---------- */
const clockFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul',
});
function tickClock() {
  const now = clockFmt.format(new Date());
  document.querySelectorAll('[data-clock]').forEach((el) => { el.textContent = `${now} KST`; });
}
tickClock();
setInterval(tickClock, 30_000);

/* ---------- Mobile menu ---------- */
const burger = document.querySelector('.kk-burger');
const menu = document.getElementById('menu');
function setMenu(open) {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  menu.setAttribute('aria-hidden', String(!open));
  gsap.to(menu, {
    clipPath: open ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
    duration: reduceMotion ? 0 : 0.6, ease: 'expo.inOut',
    onStart: () => { if (open) gsap.set(menu, { visibility: 'visible' }); },
    onComplete: () => { if (!open) gsap.set(menu, { visibility: 'hidden' }); },
  });
  if (lenis) open ? lenis.stop() : lenis.start();
}
burger?.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

/* ---------- Anchor links through Lenis ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    scrollTo(id);
  });
});

/* ---------- Slow reveal — the one motion idiom ---------- */
function initReveals() {
  const items = gsap.utils.toArray('[data-reveal]');
  if (reduceMotion) { gsap.set(items, { opacity: 1, y: 0 }); return; }
  items.forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%' },
    });
  });
}

/* ---------- Stat counters ---------- */
function initCounters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = target; return; }
    const state = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(state, {
        v: target, duration: 1.2, ease: 'power2.out',
        onUpdate: () => { el.textContent = Math.round(state.v); },
      }),
    });
  });
}

document.fonts.ready.then(() => {
  initReveals();
  initCounters();
  ScrollTrigger.refresh();
});

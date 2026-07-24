/* Mara Voss — portfolio orchestrator
   Preloader → hero intro → scroll choreography.
   GSAP / ScrollTrigger / SplitText are globals (CDN); WebGL hero is
   dynamically imported so a failed three.js fetch never breaks the page. */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

gsap.registerPlugin(ScrollTrigger, SplitText);

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4 });
  else document.querySelector(target)?.scrollIntoView({ behavior: 'auto' });
}

/* ---------- Clock (KST) ---------- */
const clockFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul',
});
function tickClock() {
  const now = clockFmt.format(new Date());
  document.querySelectorAll('[data-clock]').forEach((el) => { el.textContent = `${now} KST`; });
}
tickClock();
setInterval(tickClock, 30_000);

/* ---------- Custom cursor ---------- */
if (finePointer && !reduceMotion) {
  const cursor = document.querySelector('.cursor');
  const label = cursor.querySelector('.cursor__label');
  const dotX = gsap.quickTo('.cursor__dot', 'x', { duration: 0.12, ease: 'power2.out' });
  const dotY = gsap.quickTo('.cursor__dot', 'y', { duration: 0.12, ease: 'power2.out' });
  const ringX = gsap.quickTo('.cursor__ring', 'x', { duration: 0.45, ease: 'power3.out' });
  const ringY = gsap.quickTo('.cursor__ring', 'y', { duration: 0.45, ease: 'power3.out' });

  window.addEventListener('mousemove', (e) => {
    dotX(e.clientX); dotY(e.clientY);
    ringX(e.clientX); ringY(e.clientY);
  }, { passive: true });

  document.querySelectorAll('[data-cursor]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      label.textContent = el.dataset.cursor;
      cursor.classList.add('is-hover');
    });
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });
}

/* ---------- Magnetic elements ---------- */
if (finePointer && !reduceMotion) {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = 0.35;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * strength);
      yTo((e.clientY - r.top - r.height / 2) * strength);
    });
    el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });
}

/* ---------- Mobile menu ---------- */
const burger = document.querySelector('.nav__burger');
const menu = document.getElementById('menu');
const menuTl = gsap.timeline({ paused: true })
  .set(menu, { visibility: 'visible' })
  .to(menu, { clipPath: 'inset(0% 0 0% 0)', duration: 0.7, ease: 'expo.inOut' })
  .from(menu.querySelectorAll('.menu__links a'), {
    yPercent: 60, opacity: 0, stagger: 0.06, duration: 0.5, ease: 'power3.out',
  }, '-=0.25')
  .from(menu.querySelector('.menu__foot'), { opacity: 0, duration: 0.4 }, '-=0.3');

function closeMenu() {
  burger.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-hidden', 'true');
  burger.setAttribute('aria-label', 'Open menu');
  if (reduceMotion) gsap.set(menu, { clipPath: 'inset(0 0 100% 0)', visibility: 'hidden' });
  else menuTl.reverse();
  lenis?.start();
}
burger.addEventListener('click', () => {
  const open = burger.getAttribute('aria-expanded') === 'true';
  if (open) { closeMenu(); return; }
  burger.setAttribute('aria-expanded', 'true');
  menu.setAttribute('aria-hidden', 'false');
  burger.setAttribute('aria-label', 'Close menu');
  if (reduceMotion) gsap.set(menu, { clipPath: 'inset(0% 0 0% 0)', visibility: 'visible' });
  else menuTl.play();
  lenis?.stop();
});
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

/* ---------- Anchor links through Lenis ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    scrollToTarget(id);
  });
});
document.querySelector('[data-top]')?.addEventListener('click', () => scrollToTarget('#top'));

/* ---------- WebGL hero (graceful) ---------- */
const canvas = document.querySelector('[data-webgl]');
if (canvas) {
  import('./webgl.js?v=2')
    .then((mod) => mod.initHero(canvas, { reduceMotion }))
    .catch(() => { canvas.remove(); }); // CSS veil/gradient remains as fallback
}

/* ---------- Work hover video loops ---------- */
document.querySelectorAll('.work__video').forEach((video) => {
  if (reduceMotion) return;
  const link = video.closest('.work__link');
  if (finePointer) {
    link.addEventListener('mouseenter', () => { video.play().catch(() => {}); });
    link.addEventListener('mouseleave', () => video.pause());
  } else {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        video.play().then(() => video.classList.add('is-on')).catch(() => {});
      } else {
        video.pause();
        video.classList.remove('is-on');
      }
    }, { threshold: 0.45 }).observe(video);
  }
});

/* ---------- Preloader + hero intro ---------- */
const preloader = document.querySelector('.preloader');
const counterEl = document.querySelector('[data-counter]');

function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to('.hero__word', { y: 0, duration: 1.3, stagger: 0.12 })
    .to('[data-hero-fade]', { opacity: 1, duration: 0.9, stagger: 0.1 }, '-=0.7');
  return tl;
}

function dismissPreloader() {
  if (reduceMotion) {
    preloader.remove();
    gsap.set('.hero__word', { y: 0 });
    gsap.set('[data-hero-fade]', { opacity: 1 });
    return;
  }
  const count = { v: 0 };
  gsap.timeline()
    .to(count, {
      v: 100, duration: 1.4, ease: 'power2.inOut',
      onUpdate: () => { counterEl.textContent = Math.round(count.v); },
    })
    .to('.preloader__inner', { opacity: 0, y: -24, duration: 0.45, ease: 'power2.in' })
    .to(preloader, {
      clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut',
      onComplete: () => preloader.remove(),
    }, '-=0.1')
    .add(heroIntro(), '-=0.45');
}

if (document.readyState === 'complete') dismissPreloader();
else window.addEventListener('load', dismissPreloader);
// Never strand the user if `load` stalls on a slow CDN asset
setTimeout(() => { if (document.body.contains(preloader)) dismissPreloader(); }, 5000);

/* ---------- Scroll choreography ---------- */
async function initScrollAnimations() {
  await document.fonts.ready; // split AFTER webfonts to avoid wrong line breaks

  if (reduceMotion) {
    gsap.set('[data-split], [data-split-lines]', { visibility: 'visible' });
    return;
  }

  // Section titles: masked line reveal
  document.querySelectorAll('[data-split]').forEach((el) => {
    const split = new SplitText(el, { type: 'lines', mask: 'lines' });
    gsap.set(el, { visibility: 'visible' });
    gsap.from(split.lines, {
      yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // About quote: line-by-line rise
  document.querySelectorAll('[data-split-lines]').forEach((el) => {
    const split = new SplitText(el, { type: 'lines', mask: 'lines' });
    gsap.set(el, { visibility: 'visible' });
    gsap.from(split.lines, {
      yPercent: 110, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.09,
      scrollTrigger: { trigger: el, start: 'top 82%' },
    });
  });

  // Generic reveals
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  // Work art parallax inside its clipping frame
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    gsap.fromTo(el, { yPercent: -7 }, {
      yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: el.closest('.work__visual'), start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Hero drifts up and fades as you leave it
  gsap.to('.hero__content', {
    yPercent: -18, opacity: 0.25, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Stat counters
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const state = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(state, {
        v: target, duration: 1.6, ease: 'power2.out',
        onUpdate: () => { el.textContent = Math.round(state.v); },
      }),
    });
  });
}
initScrollAnimations();

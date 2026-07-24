# Mara Voss — Portfolio

A single-page portfolio for a fictional principal product designer. Static site, no build step.

## Stack

- **HTML/CSS** — semantic markup, fluid type scale, art-directed layout
- **GSAP 3.13** (ScrollTrigger, SplitText) — preloader, hero intro, masked line reveals, parallax, counters
- **Lenis** — smooth scrolling, integrated with ScrollTrigger
- **Three.js** — hero background: domain-warped fbm shader on a fullscreen triangle, mouse-reactive

## Run

Any static server works:

```sh
npx serve .
# or
python -m http.server 8000
```

Then open the printed URL. (Opening `index.html` via `file://` won't work — ES modules require http.)

## Performance & accessibility notes

- WebGL renders only while the hero is in the viewport and the tab is visible; device pixel ratio is clamped to 1.75.
- `prefers-reduced-motion` disables smooth scroll, all GSAP animation, the grain flicker, and freezes the shader to a static frame.
- Custom cursor only activates on fine-pointer devices.
- If the Three.js CDN fails, the canvas is removed and the CSS gradient fallback stands in.
- Without JavaScript, all content renders visible (animation-prep styles are gated on an `html.js` class).

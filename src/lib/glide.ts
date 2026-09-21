/**
 * Smooth keyboard scrolling. Native `scrollBy({ behavior: "smooth" })` restarts its animation on every
 * call, so a held or repeated key stutters. Here each press moves one shared target and a single
 * frame loop eases the page towards it: presses add up into one continuous glide.
 */

/** Time constant of the ease-out: about 95% of the way in three of these. */
const TAU_MS = 70;

let target = 0;
let pos = 0;
let expected = -1;
let frame = 0;
let last = 0;

const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function stopGlide() {
  cancelAnimationFrame(frame);
  frame = 0;
}

function step(now: number) {
  // Anything else moved the page — a wheel, a touch, Space, a link — so it wins.
  if (Math.abs(window.scrollY - expected) > 2) return stopGlide();
  const dt = Math.min(64, now - last);
  last = now;
  pos += (target - pos) * (1 - Math.exp(-dt / TAU_MS));
  if (Math.abs(target - pos) < 0.5) pos = target;
  window.scrollTo(0, pos);
  expected = window.scrollY;
  if (pos === target) frame = 0;
  else frame = requestAnimationFrame(step);
}

/** Glides the page to `y`. */
export function glideTo(y: number) {
  const to = Math.max(0, Math.min(maxScroll(), y));
  if (reducedMotion()) {
    stopGlide();
    window.scrollTo(0, to);
    return;
  }
  if (!frame) {
    pos = window.scrollY;
    expected = pos;
    last = performance.now();
    frame = requestAnimationFrame(step);
  }
  target = to;
}

/** Glides by `dy` from where the current glide is heading, so quick presses add up. */
export function glideBy(dy: number) {
  glideTo((frame ? target : window.scrollY) + dy);
}

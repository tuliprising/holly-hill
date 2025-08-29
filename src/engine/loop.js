export function createLoop(step) {
  function frame(t) { step(t); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
}

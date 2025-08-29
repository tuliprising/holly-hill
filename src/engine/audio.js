export function armBGM(bgmEl) {
  let armed = false;
  function arm() {
    if (armed) return;
    armed = true;
    if (bgmEl && bgmEl.src) { bgmEl.volume = 0.85; bgmEl.play().catch(()=>{}); }
  }
  window.addEventListener('keydown', arm, { once:true });
  window.addEventListener('pointerdown', arm, { once:true });
}

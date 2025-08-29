export function createInput(dpadEl) {
  const keys = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', a:'left', d:'right', w:'up', s:'down' };
  const state = { left:false, right:false, up:false, down:false };
  const pointer = { dir:null };

  function firstHeld() {
    return state.left ? 'left' : state.right ? 'right' : state.up ? 'up' : state.down ? 'down' : null;
  }

  function setKey(dir, on) { state[dir] = on; }

  // keyboard
  window.addEventListener('keydown', e => {
    const k = keys[e.key]; if (!k) return;
    e.preventDefault(); setKey(k, true);
  });
  window.addEventListener('keyup', e => {
    const k = keys[e.key]; if (!k) return;
    e.preventDefault(); setKey(k, false);
  });

  // dpad unifies mouse and touch
  function press(dir){ if (!dir) return; setKey(dir, true); pointer.dir = dir; }
  function release(){ if (pointer.dir){ setKey(pointer.dir, false); pointer.dir = null; } }

  dpadEl.addEventListener('pointerdown', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    e.preventDefault(); press(btn.dataset.dir);
  });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);
  dpadEl.addEventListener('contextmenu', e => e.preventDefault());

  // public helpers
  return {
    state,
    anyHeld: () => state.left || state.right || state.up || state.down,
    firstHeld,
  };
}

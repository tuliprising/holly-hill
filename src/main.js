import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { setupHiDPI, drawRoom, drawPlayer, drawVignette, drawNote } from './engine/render.js';
import { armBGM } from './engine/audio.js';
import { TILE, BASE_W, BASE_H } from './game/maps.js';
import { createState, setDirection, stepLogic } from './game/state.js';

const canvas = document.getElementById('game');
const roomNameEl = document.getElementById('room-name');
const dpad = document.getElementById('dpad');
const bgm = document.getElementById('bgm');

const input = createInput(dpad);
const state = createState();
const ctx = setupHiDPI(canvas, state.room.w * TILE, state.room.h * TILE);


// If you still have a #hud element and want a boot message, keep this.
// Otherwise you can remove this line safely.
// const hud = document.getElementById('hud'); if (hud) hud.textContent = 'Booting…';

armBGM(bgm);

function updateHUD() {
  roomNameEl.textContent = state.room.name;
}

function maybeStart() {
  if (state.mode === 'title') {
    state.mode = 'play';
    updateHUD();
  }
}

// Input listeners
window.addEventListener('keydown', () => {
  maybeStart();
  setDirection(state, input.firstHeld());
});
window.addEventListener('keyup', () => {
  setDirection(state, input.firstHeld());
});
dpad.addEventListener('pointerdown', () => {
  maybeStart();
  setDirection(state, input.firstHeld());
});
window.addEventListener('pointerup', () => {
  setDirection(state, input.firstHeld());
});
window.addEventListener('pointercancel', () => {
  setDirection(state, input.firstHeld());
});
window.addEventListener('blur', () => {
  setDirection(state, null);
});

// Initial title render
updateHUD();

// Track room changes so the title updates when you go through doors
let lastRoomId = state.roomId;

createLoop((now = performance.now()) => {
  stepLogic(state, now);

  if (state.roomId !== lastRoomId) {
    updateHUD();
    lastRoomId = state.roomId;
  }

  drawRoom(ctx, state.room, TILE, BASE_W, BASE_H);
  drawPlayer(ctx, state.player.x, state.player.y, TILE);
  drawVignette(ctx, BASE_W, BASE_H);
  if (state.showText) drawNote(ctx, BASE_W, BASE_H, state.showText);
});

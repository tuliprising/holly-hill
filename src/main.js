import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { setupHiDPI, drawRoom, drawPlayer, drawVignette, drawNote } from './engine/render.js';
import { armBGM } from './engine/audio.js';
import { TILE, BASE_W, BASE_H } from './game/maps.js';
import { createState, setDirection, stepLogic } from './game/state.js';

const canvas = document.getElementById('game');
const hud = document.getElementById('hud');
const dpad = document.getElementById('dpad');
const bgm = document.getElementById('bgm');

const ctx = setupHiDPI(canvas, BASE_W, BASE_H);
const input = createInput(dpad);
const state = createState();
document.getElementById('hud').textContent = 'Booting…';


armBGM(bgm);

// hook input into state cadence
window.addEventListener('keydown', () => {
  const dir = input.firstHeld();
  setDirection(state, dir);
});
window.addEventListener('keyup', () => {
  const dir = input.firstHeld();
  setDirection(state, dir);
});
dpad.addEventListener('pointerdown', () => {
  const dir = input.firstHeld();
  setDirection(state, dir);
});
window.addEventListener('pointerup', () => {
  const dir = input.firstHeld();
  setDirection(state, dir);
});
window.addEventListener('pointercancel', () => {
  const dir = input.firstHeld();
  setDirection(state, dir);
});
window.addEventListener('blur', () => {
  setDirection(state, null);
});

// HUD update helper
function updateHUD() {
  hud.textContent = state.room.name + ' - arrow keys or on screen arrows to move';
}

updateHUD();

createLoop((now = performance.now()) => {
  stepLogic(state, now);
  drawRoom(ctx, state.room, TILE, BASE_W, BASE_H);
  drawPlayer(ctx, state.player.x, state.player.y, TILE);
  drawVignette(ctx, BASE_W, BASE_H);
  if (state.showText) drawNote(ctx, BASE_W, BASE_H, state.showText);
});

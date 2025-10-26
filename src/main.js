// src/main.js
import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { setupHiDPI, drawRoom, drawPlayer, drawVignette, drawNote } from './engine/render.js';
import { armBGM } from './engine/audio.js';
import { TILE } from './game/maps.js';
import { createState, setDirection, stepLogic } from './game/state.js';

const canvas = document.getElementById('game');
const roomNameEl = document.getElementById('room-name');
const dpad = document.getElementById('dpad');
const bgm = document.getElementById('bgm');

// Create state first, since we size the canvas from the current room
const state = createState();

// Initial canvas size matches the current room tile grid
const ctx = setupHiDPI(canvas, state.room.w * TILE, state.room.h * TILE);

const input = createInput(dpad);
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

// Track room changes exactly once
let lastRoomId = state.roomId;

createLoop((now = performance.now()) => {
  stepLogic(state, now);

  // If we changed rooms, update the title and resize the canvas
  if (state.roomId !== lastRoomId) {
    updateHUD();
    lastRoomId = state.roomId;
    setupHiDPI(canvas, state.room.w * TILE, state.room.h * TILE);
  }

  // Draw using the room's actual pixel size
  const roomW = state.room.w * TILE;
  const roomH = state.room.h * TILE;

  drawRoom(ctx, state.room, TILE, roomW, roomH);
  drawPlayer(ctx, state.player.x, state.player.y, TILE);
  drawVignette(ctx, roomW, roomH);
  if (state.showText) drawNote(ctx, roomW, roomH, state.showText);
});

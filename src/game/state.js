import { buildRoom, getDoorAt, noteText } from './maps.js';

export function createState() {
  const state = {
    mode: 'title',
    room: buildRoom('entry'),
    roomId: 'entry',
    player: { x:3, y:9, facing:'down' },
    showText: null,
    seen: new Set(),
    input: { dir:null, held:false, nextAt:0, firstDelay:180, repeatEvery:110 }
  };
  return state;
}

export function setDirection(state, dir) {
  if (state.mode !== 'play') return; // ignore movement until game starts
  state.input.dir = dir;
  state.input.held = !!dir;
  state.input.nextAt = 0;  // allow immediate step

  if (dir === 'left' || dir === 'right' || dir === 'up' || dir === 'down') {
    state.player.facing = dir;
  }
} // <-- this was missing

export function stepLogic(state, now) {
  // Title screen does not advance game logic
  if (state.mode === 'title') return;
  if (state.showText) {
    if (state.input.held && state.input.nextAt === 0) {
      state.showText = null;
      state.input.nextAt = now + state.input.firstDelay;
    }
    return;
  }

  // Auto-teleport if standing on a door
  if (checkDoorHere(state)) return;

  if (!state.input.dir) return;

  let dx=0, dy=0;
  if (state.input.dir === 'left') dx=-1;
  else if (state.input.dir === 'right') dx=1;
  else if (state.input.dir === 'up') dy=-1;
  else if (state.input.dir === 'down') dy=1;

  if (state.input.nextAt === 0) {
    tryStep(state, dx, dy);
    state.input.nextAt = now + state.input.firstDelay;
    return;
  }
  if (now >= state.input.nextAt && state.input.held) {
    tryStep(state, dx, dy);
    state.input.nextAt = now + state.input.repeatEvery;
  }
}

function tryStep(state, dx, dy) {
  const nx = state.player.x + dx, ny = state.player.y + dy;
  const t = roomTile(state, nx, ny);
  if (t.t === 1) return;

  // Door on next tile
  if (t.t === 2) {
    teleport(state, nx, ny);
    return;
  }

  // Note
  if (t.t === 3) {
    const key = `${state.roomId}:${nx},${ny}`;
    if (!state.seen.has(key)) state.seen.add(key);
    state.showText = noteText(state.roomId, state.room.tiles[ny][nx].idx);
    return;
  }

  state.player.x = nx; state.player.y = ny;
}

function roomTile(state, x, y) {
  const r = state.room;
  if (x<0 || y<0 || x>=r.w || y>=r.h) return { t:1 };
  return r.tiles[y][x];
}

function checkDoorHere(state) {
  const door = getDoorAt(state.room, state.player.x, state.player.y);
  if (!door) return false;
  const next = buildRoom(door.to);
  state.room = next;
  state.roomId = door.to;
  state.player.x = door.tx; state.player.y = door.ty;
  return true;
}

function teleport(state, nx, ny) {
  const door = getDoorAt(state.room, nx, ny);
  if (!door) return;
  const next = buildRoom(door.to);
  state.room = next;
  state.roomId = door.to;
  state.player.x = door.tx; state.player.y = door.ty;
}

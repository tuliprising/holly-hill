export const TILE = 10, VIEW_W = 26, VIEW_H = 18;
export const BASE_W = VIEW_W*TILE, BASE_H = VIEW_H*TILE;

export const ROOM_NOTES = {
  entry: [
    "You were admitted for being too loud in a quiet room.",
    "The clipboard spelled your name correctly, you still did not recognize it.",
    "The hallway repeats, the footsteps do not.",
    "They asked how you were sleeping. You said, with the lights on."
  ],
  wardA: [
    "You traded honesty for approval, a poor exchange rate.",
    "Your reflection kept the secrets you confessed.",
    "The polite version of you signed the forms.",
    "The lock clicks even when the door is open."
  ],
  wardB: [
    "You saved yourself in a story, not in a room.",
    "You rehearsed goodbye for years, you still forgot your lines.",
    "If the truth is heavy, set it down, then pick it up again.",
    "Silence is not safety, it is only quiet."
  ]
};

export const ROOMS = {
  entry: {
    name: 'Admissions',
    grid: [
      "1111111111111111111111111",
      "1..............3.......21",
      "1....1111...........11..1",
      "1....1..1...........1...1",
      "1....1..1.....3.....1...1",
      "1....1..1...........1...1",
      "1....1111...........1...1",
      "1.......................1",
      "1..3....................1",
      "1....................2..1",
      "1.......................1",
      "1111111111111111111111111"
    ],
    doors: [ { x:23, y:1, to:'wardA', tx:2,  ty:1 },
             { x:21, y:9, to:'wardB', tx:2,  ty:1 } ]
  },
  wardA: {
    name: 'Ward A',
    grid: [
      "1111111111111111111111111",
      "12......................1",
      "1....1111111............1",
      "1....1.....1............1",
      "1....1..3..1............1",
      "1....1.....1............1",
      "1....1111111............1",
      "1..................3....1",
      "1.......................1",
      "1.......................1",
      "1.......................1",
      "1111111111111111111111111"
    ],
    doors: [ { x:1,  y:1, to:'entry', tx:22, ty:1 } ]
  },
  wardB: {
    name: 'Ward B',
    grid: [
      "1111111111111111111111111",
      "12....................3.1",
      "1.......................1",
      "1....1111111............1",
      "1....1.....1............1",
      "1....1..3..1............1",
      "1....1.....1111.........1",
      "1....1111..1............1",
      "1......1................1",
      "1......1................1",
      "1.....31................1",
      "1111111111111111111111111"
    ],
    doors: [ { x:1,  y:1, to:'entry', tx:20, ty:9 } ]
  }
};

export function buildRoom(roomId) {
  const r = ROOMS[roomId];
  const h = r.grid.length, w = r.grid[0].length;
  const roomNotes = ROOM_NOTES[roomId] || [];
  let noteIndex = 0;

  const tiles = Array.from({length:h}, (_,y) =>
    Array.from({length:w}, (_,x) => {
      const ch = r.grid[y][x];
      if (ch === '1') return { t:1 };
      if (ch === '2') return { t:2 };
      if (ch === '3') { const idx = noteIndex % roomNotes.length; noteIndex++; return { t:3, idx }; }
      return { t:0 };
    })
  );
  return { id:roomId, name:r.name, w, h, tiles, doors:r.doors };
}

export function getDoorAt(room, x, y) {
  return (room.doors || []).find(d => d.x === x && d.y === y) || null;
}

export function noteText(roomId, idx) {
  const list = ROOM_NOTES[roomId] || [];
  if (!list.length) return '';
  return list[idx % list.length];
}

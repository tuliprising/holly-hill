(function () {
  const TILE = 10, VIEW_W = 26, VIEW_H = 18;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const hud = document.getElementById('hud');
  const bgm = document.getElementById('bgm');
  const dpad = document.getElementById('dpad');

  ctx.imageSmoothingEnabled = false;

  const C = {
    floor: '#12131a',
    wall: '#2b2f3a',
    door: '#6b7280',
    player: '#b2f5ea',
    item: '#eab308',
    textBg: '#0b0c10',
    text: '#e5e7eb',
    vignette: 'rgba(0,0,0,0.25)'
  };

  const notes = [
    "You keep trying the same door, expecting a different hallway.",
    "Silence is not safety. It is only quiet.",
    "Your anger was a map. You threw it away to be polite.",
    "There was no monster under the bed. You crawled under on your own.",
    "The window is not locked. You are."
  ];

  const rooms = {
    entry: {
      name: 'Admission',
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
      doors: { '2': [{ x: 22, y: 1, to: 'wardA', tx: 2, ty: 10 }, { x: 22, y: 9, to: 'wardB', tx: 2, ty: 2 }] }
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
      doors: { '2': [{ x: 1, y: 1, to: 'entry', tx: 21, ty: 9 }] }
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
        "1....1.....1............1",
        "1....1111111............1",
        "1.......................1",
        "1.......................1",
        "1.......................1",
        "1111111111111111111111111"
      ],
      doors: { '2': [{ x: 1, y: 1, to: 'entry', tx: 21, ty: 1 }] }
    }
  };

  function parseRoom(r) {
    const h = r.grid.length, w = r.grid[0].length;
    const tiles = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => {
        const ch = r.grid[y][x];
        if (ch === '1') return { t: 1 };
        if (ch === '2') return { t: 2 };
        if (ch === '3') return { t: 3, idx: -1 };
        return { t: 0 };
      })
    );
    let n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (tiles[y][x].t === 3) { tiles[y][x].idx = n % notes.length; n++; }
    }
    return { w, h, tiles };
  }

  const R = {};
  for (const id in rooms) R[id] = { ...rooms[id], ...parseRoom(rooms[id]) };

  let state = {
    room: 'entry',
    x: 3, y: 9,
    seen: new Set(),
    showText: null,          // note text, if any
    keyHeld: { left: false, right: false, up: false, down: false }
  };

  // ---- Audio unlock on first gesture ----
  let audioArmed = false;
  function armAudio() {
    if (audioArmed) return;
    audioArmed = true;
    if (bgm && bgm.src) {
      bgm.volume = 0.85;
      bgm.play().catch(() => { });
    }
  }
  window.addEventListener('keydown', armAudio, { once: true });
  window.addEventListener('pointerdown', armAudio, { once: true });

  // ---- Input system with gentle repeat ----
  // One press = one step. Holding repeats after a delay at a steady cadence.
  const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };

  const input = {
    dir: null,           // 'left' | 'right' | 'up' | 'down' | null
    held: false,
    nextAt: 0,           // timestamp when next step may occur
    firstDelay: 180,     // ms before first repeat
    repeatEvery: 110     // ms between repeats
  };

  function setDirection(dir) {
    input.dir = dir;
    input.held = !!dir;
    input.nextAt = 0;    // allow immediate step
  }

  window.addEventListener('keydown', e => {
    const k = keys[e.key];
    if (!k) return;
    e.preventDefault();
    state.keyHeld[k] = true;
    setDirection(k);
  });

  window.addEventListener('keyup', e => {
    const k = keys[e.key];
    if (!k) return;
    e.preventDefault();
    state.keyHeld[k] = false;
    if (input.dir === k && !anyHeld()) {
      setDirection(null);
    } else if (input.dir === k) {
      // switch to another held direction, if any
      setDirection(firstHeld());
    }
  });

  // D-pad, unified pointer handlers for desktop and mobile
  (function () {
    let activeDir = null;

    function press(dir) {
      if (!dir) return;
      state.keyHeld[dir] = true;
      activeDir = dir;
      setDirection(dir);
    }
    function release() {
      if (activeDir) {
        state.keyHeld[activeDir] = false;
        activeDir = null;
        if (!anyHeld()) setDirection(null);
        else setDirection(firstHeld());
      }
    }

    dpad.addEventListener('pointerdown', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      e.preventDefault();
      press(btn.dataset.dir);
    });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    dpad.addEventListener('contextmenu', e => e.preventDefault());
  })();

  function anyHeld() {
    const k = state.keyHeld;
    return k.left || k.right || k.up || k.down;
  }
  function firstHeld() {
    const k = state.keyHeld;
    return k.left ? 'left' : k.right ? 'right' : k.up ? 'up' : k.down ? 'down' : null;
  }

  // ---- Map helpers ----
  function roomTile(roomId, x, y) {
    const r = R[roomId];
    if (x < 0 || y < 0 || x >= r.w || y >= r.h) return { t: 1 };
    return r.tiles[y][x];
  }

  // Attempt a single step (one tile)
  function tryStep(dx, dy) {
    const nx = state.x + dx, ny = state.y + dy;
    const t = roomTile(state.room, nx, ny);

    // Wall
    if (t.t === 1) return;

    // Door
    if (t.t === 2) {
      const rd = rooms[state.room].doors['2'] || [];
      const hit = rd.find(d => d.x === nx && d.y === ny);
      if (hit) {
        state.room = hit.to;
        state.x = hit.tx; state.y = hit.ty;
        hud.textContent = R[state.room].name + " — arrow keys or on screen arrows to move";
        return;
      }
    }

    // Note
    if (t.t === 3) {
      const key = `${state.room}:${nx},${ny}`;
      if (!state.seen.has(key)) state.seen.add(key);
      state.showText = notes[t.idx];
      // Do not move onto the tile when a note appears, feels more intentional
      return;
    }

    // Normal move
    state.x = nx; state.y = ny;
  }

  function stepInput(now) {
    // If a note is showing, wait until the next **new** press to clear it, then bail this frame
    if (state.showText) {
      if (input.held && input.nextAt === 0) {
        // We just registered a fresh press, so close the note and consume the press without moving
        state.showText = null;
        input.nextAt = now + input.firstDelay; // start repeat window
      }
      return;
    }

    if (!input.dir) return;

    // Determine dx,dy from direction
    let dx = 0, dy = 0;
    if (input.dir === 'left') dx = -1;
    else if (input.dir === 'right') dx = 1;
    else if (input.dir === 'up') dy = -1;
    else if (input.dir === 'down') dy = 1;

    // Immediate step on first press
    if (input.nextAt === 0) {
      tryStep(dx, dy);
      input.nextAt = now + input.firstDelay;
      return;
    }

    // Repeats while held
    if (now >= input.nextAt && input.held) {
      tryStep(dx, dy);
      input.nextAt = now + input.repeatEvery;
    }
  }

  // ---- Rendering ----
  function drawRoom() {
    const r = R[state.room];
    ctx.fillStyle = C.floor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < r.h; y++) {
      for (let x = 0; x < r.w; x++) {
        const t = r.tiles[y][x], px = x * TILE, py = y * TILE;
        if (t.t === 1) {
          ctx.fillStyle = C.wall; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#3a3f4d'; if ((x + y) % 2 === 0) ctx.fillRect(px, py + TILE - 2, TILE, 2);
        } else if (t.t === 2) {
          ctx.fillStyle = C.door; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#9ca3af'; ctx.fillRect(px + 3, py + 3, 4, 4);
        } else if (t.t === 3) {
          ctx.fillStyle = C.item; ctx.fillRect(px + 3, py + 3, 4, 4);
        }
      }
    }
  }

  function drawPlayer() {
    const px = state.x * TILE, py = state.y * TILE;
    ctx.fillStyle = C.player; ctx.fillRect(px + 2, py + 2, 6, 6);
    ctx.fillStyle = '#0d0d12'; ctx.fillRect(px + 5, py + 4, 1, 1);
  }

  function drawVignette() {
    ctx.fillStyle = C.vignette;
    ctx.fillRect(0, 0, canvas.width, 2);
    ctx.fillRect(0, canvas.height - 2, canvas.width, 2);
    ctx.fillRect(0, 0, 2, canvas.height);
    ctx.fillRect(canvas.width - 2, 0, 2, canvas.height);
  }

  function drawTextOverlay(text) {
    const w = canvas.width - 20, x = 10, y = canvas.height - 60, h = 50;
    ctx.fillStyle = C.textBg; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#22262f'; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = C.text; ctx.font = '8px monospace';
    wrapText(text, x + 8, y + 14, w - 16, 10);
    ctx.font = '7px monospace'; ctx.fillText('Press a move key to close', x + 8, y + h - 6);
  }

  function wrapText(str, x, y, maxWidth, lineHeight) {
    const words = str.split(' '); let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxWidth && i > 0) {
        ctx.fillText(line, x, y); line = words[i] + ' '; y += lineHeight;
      } else { line = test; }
    }
    ctx.fillText(line, x, y);
  }

  // ---- Main loop ----
  function loop(now = performance.now()) {
    stepInput(now);
    drawRoom();
    drawPlayer();
    drawVignette();
    if (state.showText) drawTextOverlay(state.showText);
    requestAnimationFrame(loop);
  }

  function init() {
    canvas.width = VIEW_W * TILE;
    canvas.height = VIEW_H * TILE;
    hud.textContent = R[state.room].name + " — arrows to move";
    loop();
  }

  init();
})();

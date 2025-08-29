(function () {
  const TILE = 10, VIEW_W = 26, VIEW_H = 18;
  const BASE_W = VIEW_W * TILE;   // 260
  const BASE_H = VIEW_H * TILE;   // 180

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const hud = document.getElementById('hud');
  const bgm = document.getElementById('bgm');
  const dpad = document.getElementById('dpad');

  // ---------- HiDPI scaling for crisp pixels and text ----------
  function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth || BASE_W;
    const scale = cssW / BASE_W;
    const cssH = Math.round(BASE_H * scale);
    canvas.style.height = cssH + 'px';
    canvas.width  = Math.round(BASE_W * scale * dpr);
    canvas.height = Math.round(BASE_H * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', resizeCanvas);
  window.matchMedia && matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', resizeCanvas);

  const C = {
    floor: '#12131a',
    wall:  '#2b2f3a',
    door:  '#6b7280',
    player:'#b2f5ea',
    item:  '#eab308',
    textBg:'#0b0c10',
    text:  '#e5e7eb',
    vignette:'rgba(0,0,0,0.25)'
  };

  // ----- Room specific notes -----
  const ROOM_NOTES = {
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

  const rooms = {
    entry: {
      name: 'Admit',
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
      // Doors at exact tile coords found in the grid above:
      // (23,1) top-right leads to Ward A, spawn just inside at (2,1)
      // (21,9) mid-right leads to Ward B, spawn just inside at (2,1)
      doors: { '2': [
        { x:23, y:1, to:'wardA', tx:2,  ty:1 },
        { x:21, y:9, to:'wardB', tx:2,  ty:1 }
      ] }
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
      // Only door at (1,1) back to entry, spawn just inside left of entry door at (22,1)
      doors: { '2': [
        { x:1,  y:1, to:'entry', tx:22, ty:1 }
      ] }
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
      // Only door at (1,1) back to entry, spawn just inside left of entry B-door at (20,9)
      doors: { '2': [
        { x:1,  y:1, to:'entry', tx:20, ty:9 }
      ] }
    }
  };

  function parseRoom(r, roomId) {
    const h = r.grid.length, w = r.grid[0].length;
    const roomNotes = ROOM_NOTES[roomId] || [];
    let noteIndex = 0;

    const tiles = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => {
        const ch = r.grid[y][x];
        if (ch === '1') return { t:1 };
        if (ch === '2') return { t:2 };
        if (ch === '3') {
          const idx = noteIndex % roomNotes.length;
          noteIndex++;
          return { t:3, idx };
        }
        return { t:0 };
      })
    );
    return { w, h, tiles };
  }

  const R = {};
  for (const id in rooms) R[id] = { ...rooms[id], ...parseRoom(rooms[id], id) };

  function getDoorAt(roomId, x, y) {
    const list = rooms[roomId]?.doors?.['2'] || [];
    return list.find(d => d.x === x && d.y === y) || null;
  }

  let state = {
    room: 'entry',
    x: 3, y: 9,
    seen: new Set(),
    showText: null,
    keyHeld: { left:false, right:false, up:false, down:false }
  };

  // Audio unlock
  let audioArmed = false;
  function armAudio() {
    if (audioArmed) return;
    audioArmed = true;
    if (bgm && bgm.src) {
      bgm.volume = 0.85;
      bgm.play().catch(() => {});
    }
  }
  window.addEventListener('keydown', armAudio, { once:true });
  window.addEventListener('pointerdown', armAudio, { once:true });

  // Input with calm repeat
  const keys = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', a:'left', d:'right', w:'up', s:'down' };
  const input = { dir:null, held:false, nextAt:0, firstDelay:180, repeatEvery:110 };

  function setDirection(dir) {
    input.dir = dir;
    input.held = !!dir;
    input.nextAt = 0;        // immediate first step
  }

  window.addEventListener('keydown', e => {
    const k = keys[e.key]; if (!k) return;
    e.preventDefault();
    state.keyHeld[k] = true;
    setDirection(k);
  });
  window.addEventListener('keyup', e => {
    const k = keys[e.key]; if (!k) return;
    e.preventDefault();
    state.keyHeld[k] = false;
    if (input.dir === k && !anyHeld()) setDirection(null);
    else if (input.dir === k) setDirection(firstHeld());
  });

  // D-pad, mouse and touch
  (function () {
    let activeDir = null;
    function press(dir){ if (!dir) return; state.keyHeld[dir] = true; activeDir = dir; setDirection(dir); }
    function release(){ if (activeDir){ state.keyHeld[activeDir] = false; activeDir = null; if (!anyHeld()) setDirection(null); else setDirection(firstHeld()); } }
    dpad.addEventListener('pointerdown', e => { const btn = e.target.closest('button'); if (!btn) return; e.preventDefault(); press(btn.dataset.dir); });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    dpad.addEventListener('contextmenu', e => e.preventDefault());
  })();

  function anyHeld(){ const k = state.keyHeld; return k.left || k.right || k.up || k.down; }
  function firstHeld(){ const k = state.keyHeld; return k.left?'left':k.right?'right':k.up?'up':k.down?'down':null; }

  function roomTile(roomId, x, y) {
    const r = R[roomId];
    if (x < 0 || y < 0 || x >= r.w || y >= r.h) return { t:1 };
    return r.tiles[y][x];
  }

  // Teleport if standing on a door
  function checkDoorHere() {
    const door = getDoorAt(state.room, state.x, state.y);
    if (door) {
      state.room = door.to;
      state.x = door.tx; state.y = door.ty;
      hud.textContent = R[state.room].name + " - arrow keys or on screen arrows to move";
      return true;
    }
    return false;
  }

  // Try one step
  function tryStep(dx, dy) {
    const nx = state.x + dx, ny = state.y + dy;
    const t = roomTile(state.room, nx, ny);

    if (t.t === 1) return; // wall

    // Door on the next tile
    const door = (t.t === 2) ? getDoorAt(state.room, nx, ny) : null;
    if (door) {
      state.room = door.to;
      state.x = door.tx; state.y = door.ty;
      hud.textContent = R[state.room].name + " - arrow keys or on screen arrows to move";
      return;
    }

    // Note on the next tile, show modal and do not step onto it
    if (t.t === 3) {
      const key = `${state.room}:${nx},${ny}`;
      if (!state.seen.has(key)) state.seen.add(key);
      const roomNotes = ROOM_NOTES[state.room] || [];
      state.showText = roomNotes[ R[state.room].tiles[ny][nx].idx % roomNotes.length ];
      return;
    }

    // Normal move
    state.x = nx; state.y = ny;
  }

  function stepInput(now) {
    // While a note is visible, the next fresh press closes it, no move on that frame
    if (state.showText) {
      if (input.held && input.nextAt === 0) {
        state.showText = null;
        input.nextAt = now + input.firstDelay;
      }
      return;
    }

    // If we landed on a door from a previous step, auto-teleport now as well
    if (checkDoorHere()) return;

    if (!input.dir) return;

    let dx = 0, dy = 0;
    if (input.dir === 'left') dx = -1;
    else if (input.dir === 'right') dx = 1;
    else if (input.dir === 'up') dy = -1;
    else if (input.dir === 'down') dy = 1;

    if (input.nextAt === 0) {
      tryStep(dx, dy);
      input.nextAt = now + input.firstDelay;
      return;
    }
    if (now >= input.nextAt && input.held) {
      tryStep(dx, dy);
      input.nextAt = now + input.repeatEvery;
    }
  }

  // ---------- Rendering ----------
  function drawRoom() {
    const r = R[state.room];
    ctx.fillStyle = C.floor;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    for (let y = 0; y < r.h; y++) {
      for (let x = 0; x < r.w; x++) {
        const t = r.tiles[y][x], px = x * TILE, py = y * TILE;
        if (t.t === 1) {
          ctx.fillStyle = C.wall; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#3a3f4d'; if (((x + y) % 2) === 0) ctx.fillRect(px, py + TILE - 2, TILE, 2);
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
    ctx.fillRect(0, 0, BASE_W, 2);
    ctx.fillRect(0, BASE_H - 2, BASE_W, 2);
    ctx.fillRect(0, 0, 2, BASE_H);
    ctx.fillRect(BASE_W - 2, 0, 2, BASE_H);
  }

  function drawTextOverlay(text) {
    const w = BASE_W - 20, x = 10, y = BASE_H - 60, h = 50;
    ctx.fillStyle = C.textBg; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#22262f'; ctx.strokeRect(x, y, w, h);
    ctx.textBaseline = 'top';
    ctx.fillStyle = C.text;
    ctx.font = '10px monospace';
    wrapText(text, x + 8, y + 10, w - 16, 12);
    ctx.font = '8px monospace';
    ctx.fillText('Press a move key to close', x + 8, y + h - 12);
  }

  function wrapText(str, x, y, maxWidth, lineHeight) {
    const words = str.split(' '); let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxWidth && i > 0) {
        ctx.fillText(line, Math.round(x), Math.round(y));
        line = words[i] + ' ';
        y += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, Math.round(x), Math.round(y));
  }

  function loop(now = performance.now()) {
    stepInput(now);
    drawRoom();
    drawPlayer();
    drawVignette();
    if (state.showText) drawTextOverlay(state.showText);
    requestAnimationFrame(loop);
  }

  function init() {
    canvas.width = BASE_W;
    canvas.height = BASE_H;
    resizeCanvas();
    hud.textContent = R[state.room].name + " - arrow keys or on screen arrows to move";
    loop();
  }

  init();
})();

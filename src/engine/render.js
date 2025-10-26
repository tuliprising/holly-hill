// src/engine/render.js
export function setupHiDPI(canvas, baseW, baseH) {
  const ctx = canvas.getContext('2d', { alpha:false });

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const aspect = baseW / baseH;

    const header = document.getElementById('music-header');
    const hud    = document.getElementById('hud');
    const dpad   = document.getElementById('dpad');

    // How much vertical space the non-canvas UI uses
    const chromeH =
      (header?.offsetHeight || 0) +
      (hud?.offsetHeight || 0) +
      (dpad?.offsetHeight || 0) +
      24; // small breathing room

    const availW = document.documentElement.clientWidth;
    const availH = Math.max(120, window.innerHeight - chromeH);

    // Pick the limiting dimension so everything fits without scrolling
    const cssW = Math.min(availW, Math.floor(availH * aspect));
    const cssH = Math.round(cssW / aspect);
    const scale = cssW / baseW;

    // Apply CSS size
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';

    // Set drawing buffer size with DPR
    canvas.width  = Math.round(baseW * scale * dpr);
    canvas.height = Math.round(baseH * scale * dpr);

    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  resize();
  window.addEventListener('resize', resize);
  return ctx;
}


export const C = {
  floor:'#12131a', wall:'#2b2f3a', door:'#6b7280',
  player:'#b2f5ea', item:'#eab308', textBg:'#0b0c10',
  text:'#e5e7eb', vignette:'rgba(0,0,0,0.25)'
};

export function drawRoom(ctx, room, tileSize, baseW, baseH) {
  ctx.fillStyle = C.floor;
  ctx.fillRect(0,0,baseW,baseH);
  for (let y=0;y<room.h;y++){
    for (let x=0;x<room.w;x++){
      const t = room.tiles[y][x], px = x*tileSize, py = y*tileSize;
      if (t.t === 1) {
        ctx.fillStyle = C.wall; ctx.fillRect(px,py,tileSize,tileSize);
        ctx.fillStyle = '#3a3f4d'; if ((x+y)%2===0) ctx.fillRect(px,py+tileSize-2,tileSize,2);
      } else if (t.t === 2) {
        ctx.fillStyle = C.door; ctx.fillRect(px,py,tileSize,tileSize);
        ctx.fillStyle = '#9ca3af'; ctx.fillRect(px+3,py+3,4,4);
      } else if (t.t === 3) {
        ctx.fillStyle = C.item; ctx.fillRect(px+3,py+3,4,4);
      }
    }
  }
}


export function drawPlayer(ctx, x, y, tileSize, facing = 'down') {
  const px = x * tileSize;
  const py = y * tileSize;
  const p  = tileSize / 10; // 10×10 grid inside one tile

  const SKIN = '#caa68e';        // skin tone
  const EYE  = '#0d0d12';        // black eyes
  const GOWN = '#8a8f9b';        // eerie gray hospital gown
  const HAIR = '#1b1f27';        // dark hair

  // Helper to draw one simple body
  function drawBase() {
    // Hair (thin dark line above face)
    ctx.fillStyle = HAIR;
    ctx.fillRect(Math.round(px + 2*p), Math.round(py + 1*p), Math.ceil(6*p), Math.ceil(1*p));

    // Body / gown
    ctx.fillStyle = GOWN;
    ctx.fillRect(Math.round(px + 2*p), Math.round(py + 2*p), Math.ceil(6*p), Math.ceil(6*p));

    // Arms
    ctx.fillStyle = SKIN;
    ctx.fillRect(Math.round(px + 1*p), Math.round(py + 4*p), Math.ceil(1*p), Math.ceil(2*p));
    ctx.fillRect(Math.round(px + 8*p), Math.round(py + 4*p), Math.ceil(1*p), Math.ceil(2*p));

    // Bare feet
    ctx.fillRect(Math.round(px + 3*p), Math.round(py + 8*p), Math.ceil(1*p), Math.ceil(1*p));
    ctx.fillRect(Math.round(px + 6*p), Math.round(py + 8*p), Math.ceil(1*p), Math.ceil(1*p));
  }

  // --- Down-facing ---
  if (facing === 'down') {
    drawBase();
    // Eyes (two black pixels centered on face)
    ctx.fillStyle = EYE;
    ctx.fillRect(Math.round(px + 4*p), Math.round(py + 4*p), Math.ceil(1*p), Math.ceil(1*p));
    ctx.fillRect(Math.round(px + 6*p), Math.round(py + 4*p), Math.ceil(1*p), Math.ceil(1*p));
  }

  // --- Up-facing ---
  else if (facing === 'up') {
    drawBase();
    // No visible eyes (back of head)
    ctx.fillStyle = HAIR;
    ctx.fillRect(Math.round(px + 2*p), Math.round(py + 2*p), Math.ceil(6*p), Math.ceil(1*p));
  }

  // --- Left-facing ---
  else if (facing === 'left') {
    drawBase();
    // Single eye slightly toward left
    ctx.fillStyle = EYE;
    ctx.fillRect(Math.round(px + 3*p), Math.round(py + 4*p), Math.ceil(1*p), Math.ceil(1*p));
  }

  // --- Right-facing ---
  else if (facing === 'right') {
    drawBase();
    // Single eye slightly toward right
    ctx.fillStyle = EYE;
    ctx.fillRect(Math.round(px + 6*p), Math.round(py + 4*p), Math.ceil(1*p), Math.ceil(1*p));
  }
}








export function drawVignette(ctx, baseW, baseH) {
  ctx.fillStyle = C.vignette;
  ctx.fillRect(0,0,baseW,2);
  ctx.fillRect(0,baseH-2,baseW,2);
  ctx.fillRect(0,0,2,baseH);
  ctx.fillRect(baseW-2,0,2,baseH);
}

// Replace your existing drawNote with this
export function drawNote(ctx, baseW, baseH, text) {
  // Visual tuning
  const maxBoxW = Math.min(160, baseW - 16); // narrower, reads like a small scrap
  const padX = 6;
  const padTop = 6;
  const padBottom = 6;
  const bodyFont = '4px monospace';   // much smaller
  const bodyLH = 4;                  // line height for 4px font
  const hintFont = '3px monospace';   // tiny hint
  const hintLH = 4;

  // Prepare body lines to compute exact height
  ctx.font = bodyFont;
  const bodyLines = wrapLines(ctx, text, maxBoxW - padX * 2);

  // Compute box size from content
  const contentH = bodyLines.length * bodyLH;
  const gapBeforeHint = 6;
  const boxW = maxBoxW;
  const boxH = padTop + contentH + gapBeforeHint + hintLH + padBottom;

  // Position near bottom center
  const x = Math.round((baseW - boxW) / 2);
  const y = Math.round(baseH - boxH - 8);

  ctx.save();

  // Slight skew/tilt for eerie, hand-placed vibe
  ctx.translate(x + boxW / 2, y + boxH / 2);
  ctx.rotate(0.010); // ~0.57°
  ctx.translate(-(x + boxW / 2), -(y + boxH / 2));

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 2, y + 2, boxW, boxH);

  // Dark “paper” scrap
  ctx.fillStyle = '#e2d3ee';
  ctx.fillRect(x, y, boxW, boxH);

  // Double border, slightly mismatched
  ctx.strokeStyle = '#22262f';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, boxW, boxH);
  ctx.strokeStyle = 'rgba(70,80,95,0.6)';
  ctx.strokeRect(x + 1, y + 1, boxW - 2, boxH - 2);

  // Body text, smaller and colder
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#050108';
  ctx.font = bodyFont;

  let ty = y + padTop;
  for (const line of bodyLines) {
    ctx.fillText(line, x + padX, ty);
    ty += bodyLH;
  }

  // Close hint, tiny
  ctx.font = hintFont;
  ctx.fillStyle = '#3d3940';
  ctx.fillText('Press any key to close', x + padX, y + boxH - padBottom - hintLH);

  ctx.restore();
}

// New helper: wraps text and returns lines, so we can size the box precisely
function wrapLines(ctx, str, maxWidth) {
  const words = String(str).split(/\s+/);
  const lines = [];
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}



function wrapText(ctx, str, x, y, maxWidth, lineHeight) {
  const words = str.split(' '); let line = '';
  for (let i=0;i<words.length;i++){
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxWidth && i>0) {
      ctx.fillText(line, Math.round(x), Math.round(y));
      line = words[i] + ' '; y += lineHeight;
    } else { line = test; }
  }
  ctx.fillText(line, Math.round(x), Math.round(y));
}

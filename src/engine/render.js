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

export function drawPlayer(ctx, x, y, tileSize) {
  const px = x*tileSize, py = y*tileSize;
  ctx.fillStyle = C.player; ctx.fillRect(px+2,py+2,6,6);
  ctx.fillStyle = '#0d0d12'; ctx.fillRect(px+5,py+4,1,1);
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
  const padX = 4;
  const padTop = 3;
  const padBottom = 3;
  const bodyFont = '4px monospace';   // much smaller
  const bodyLH = 2;                  // line height for 4px font
  const hintFont = '3px monospace';   // tiny hint
  const hintLH = 2;

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
  ctx.fillText('Press a move key to close', x + padX, y + boxH - padBottom - hintLH);

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

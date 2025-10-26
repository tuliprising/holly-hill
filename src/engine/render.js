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

export function drawNote(ctx, baseW, baseH, text) {
  const w = baseW-20, x = 10, y = baseH-60, h = 50;
  ctx.fillStyle = C.textBg; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = '#22262f'; ctx.strokeRect(x,y,w,h);
  ctx.textBaseline = 'top';
  ctx.fillStyle = C.text;
  ctx.font = '10px monospace';
  wrapText(ctx, text, x+8, y+10, w-16, 12);
  ctx.font = '8px monospace';
  ctx.fillText('Press a move key to close', x+8, y+h-12);
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

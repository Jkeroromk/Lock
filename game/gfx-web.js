// Canvas 2D implementation of the engine's gfx interface (browser preview only).
export function makeWebGfx(ctx) {
  const FONT = (o) => `${o.weight || '600'} ${o.size || 12}px -apple-system, "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Apple SD Gothic Neo", system-ui, sans-serif`;
  return {
    image(buf) { const c = document.createElement('canvas'); c.width = buf.w; c.height = buf.h; const x = c.getContext('2d'); const id = x.createImageData(buf.w, buf.h); new Uint32Array(id.data.buffer).set(buf.d); x.putImageData(id, 0, 0); return c; },
    rect(x, y, w, h, c, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; },
    rects(list, c, a = 1) { if (!list.length) return; ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); for (const [x, y, w, h] of list) ctx.rect(x, y, w, h); ctx.fill(); ctx.globalAlpha = 1; },
    img(im, x, y, a = 1) { ctx.globalAlpha = a; ctx.drawImage(im, x, y); ctx.globalAlpha = 1; },
    imgClipped(im, x, y, list) { ctx.save(); ctx.beginPath(); for (const [rx, ry, w, h] of list) ctx.rect(rx, ry, w, h); ctx.clip(); ctx.drawImage(im, x, y); ctx.restore(); },
    poly(p, c, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; },
    text(s, x, y, o) { ctx.font = FONT(o); ctx.textBaseline = 'top'; ctx.textAlign = 'left'; if (o.edge) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, o.size * 0.24); ctx.strokeStyle = o.edge; ctx.strokeText(s, x, y + 1.2); } if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(s, x, y + 1.6); } ctx.fillStyle = o.color; ctx.fillText(s, x, y + 1.2); },
    measure(s, o) { ctx.font = FONT(o); return ctx.measureText(s).width; },
    bigText(s, cx, y, fillC, edge) { ctx.font = FONT({ weight: '900', size: 28 }); ctx.textBaseline = 'top'; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = edge; ctx.strokeText(s, cx, y + 2); ctx.strokeText(s, cx, y); ctx.fillStyle = fillC; ctx.fillText(s, cx, y); ctx.textAlign = 'left'; },
  };
}

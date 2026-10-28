// ---------- film look (picture layer only; type stays sharp) ----------
function filmLook(f, strength) {
  P.save();
  P.globalCompositeOperation = 'multiply'; P.fillStyle = '#efe7d6'; P.fillRect(0, 0, GW, GH);
  P.globalCompositeOperation = 'screen'; P.fillStyle = '#17140f'; P.fillRect(0, 0, GW, GH);
  P.globalCompositeOperation = 'source-over';
  const g = P.createRadialGradient(GW / 2, GH / 2, GH * .42, GW / 2, GH / 2, GH * .95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.62 * strength + .2})`);
  P.fillStyle = g; P.fillRect(0, 0, GW, GH);
  if (strength > 0) {
    for (let k = 0; k < 3; k++) {
      const id = Math.floor((f + k * 5) / 9) * 7 + k;
      if (hash(id * 1.3) > .55) continue;
      const x = hash(id * 2.1) * GW + (f % 9) * (hash(id * 3.7) - .5) * 6;
      P.fillStyle = hash(id) > .5 ? 'rgba(255,250,240,.22)' : 'rgba(0,0,0,.28)';
      const y0 = hash(id * 5.1) * GH * .4, y1 = GH - hash(id * 6.3) * GH * .3;
      P.fillRect(x, y0, 1 + hash(id * 8.2) * 1.6, y1 - y0);
    }
    const n = Math.floor(hash(f * .91) * 5);
    for (let k = 0; k < n; k++) {
      const s = f * 13 + k * 3.1, x = hash(s) * GW, y = hash(s + 1) * GH, r = 1 + hash(s + 2) * 4;
      P.fillStyle = hash(s + 3) > .35 ? 'rgba(10,8,6,.55)' : 'rgba(255,252,245,.45)';
      P.beginPath(); P.ellipse(x, y, r, r * (.4 + hash(s + 4)), hash(s + 5) * 3, 0, TAU); P.fill();
    }
  }
  P.restore();
}

// ---------- type layer ----------
const boxes = [];
const SUB = { zh: '600 40px "Noto Sans SC"', en: '400 29px Oswald' };
// a period "title strip" under the subtitles: a low dark band at the bottom of the gate, on every shot,
// held through short gaps between cues so it never blinks on and off
const SUBSPAN = (() => {
  const iv = TL.lines.map((L, i) => { const nx = TL.lines[i + 1]; let t1 = L.t + Math.max(1.8, (VD[L.id] || 2.6) + .6); if (nx) t1 = Math.min(t1, nx.t - .05); return [L.t, t1]; });
  const out = [];
  for (const [a, b] of iv) { const l = out[out.length - 1]; if (l && a - l[1] < 1.0) l[1] = Math.max(l[1], b); else out.push([a, b]); }
  return out;
})();
function subBand(t) {
  let a = 0;
  for (const [t0, t1] of SUBSPAN) a = Math.max(a, Math.min(seg(t, t0 - .25, t0), 1 - seg(t, t1, t1 + .3)));
  if (a <= 0) return;
  X.save(); X.beginPath(); X.roundRect(GX, 0, GW, GH, 26); X.clip();
  const g = X.createLinearGradient(0, H - 180, 0, H);
  g.addColorStop(0, 'rgba(10,9,8,0)'); g.addColorStop(.25, `rgba(10,9,8,${.93 * a})`); g.addColorStop(1, `rgba(10,9,8,${.96 * a})`);
  X.fillStyle = g; X.fillRect(GX, H - 180, GW, 180);
  X.restore();
}
function subtitle(t) {
  for (let i = 0; i < TL.lines.length; i++) {
    const L = TL.lines[i], nx = TL.lines[i + 1];
    let t1 = L.t + Math.max(1.8, (VD[L.id] || 2.6) + .6); if (nx) t1 = Math.min(t1, nx.t - .05);
    if (t < L.t - .05 || t > t1) continue;
    const a = Math.min(seg(t, L.t - .05, L.t + .06), 1 - seg(t, t1 - .06, t1));
    X.save(); X.globalAlpha = a; X.textAlign = 'center'; X.textBaseline = 'alphabetic'; X.lineJoin = 'round';
    X.font = SUB.zh; X.letterSpacing = '1px'; X.lineWidth = 8; X.strokeStyle = 'rgba(8,7,6,.92)'; X.strokeText(L.zh, W / 2, H - 82);
    X.fillStyle = '#fbf8f1'; X.fillText(L.zh, W / 2, H - 82);
    X.font = SUB.en; X.letterSpacing = '1.5px'; X.lineWidth = 6; X.strokeText(L.en, W / 2, H - 38);
    X.fillStyle = '#ece6da'; X.fillText(L.en, W / 2, H - 38);
    X.restore();
  }
}
window.SUBCHECK = () => {   // every cue fits on one line per language inside the gate
  const out = [];
  for (const L of TL.lines) { X.font = SUB.zh; X.letterSpacing = '1px'; const a = X.measureText(L.zh).width; X.font = SUB.en; X.letterSpacing = '1.5px'; const b = X.measureText(L.en).width;
    out.push({ id: L.id, zh: Math.round(a), en: Math.round(b), ok: a < GW - 120 && b < GW - 120 }); }
  return out;
};
function tagCard(x, y, en, zh, u, o, id) {
  X.save(); X.globalAlpha = o;
  X.font = '600 30px Oswald'; X.letterSpacing = '5px'; const w1 = X.measureText(en).width;
  X.font = '500 26px "Noto Sans SC"'; X.letterSpacing = '3px'; const w2 = X.measureText(zh).width;
  const w = Math.max(w1, w2, 220) + 44;
  X.beginPath(); X.rect(x - 4, y - 8, w * u + 8, 118); X.clip();
  X.fillStyle = 'rgba(12,11,10,.8)'; X.fillRect(x, y, w, 104);
  X.strokeStyle = '#d8d0bf'; X.lineWidth = 2; X.strokeRect(x + 6, y + 6, w - 12, 92);
  X.font = '600 30px Oswald'; X.letterSpacing = '5px'; X.fillStyle = '#f3eee4'; X.textBaseline = 'alphabetic'; X.fillText(en, x + 22, y + 46);
  X.font = '500 26px "Noto Sans SC"'; X.letterSpacing = '3px'; X.fillStyle = '#d6cfc0'; X.fillText(zh, x + 22, y + 84);
  X.restore();
  if (u >= 1 && o >= 1) boxes.push({ id: id + '-en', text: en, x0: x, y0: y, x1: x + w, y1: y + 52 }, { id: id + '-zh', text: zh, x0: x, y0: y + 52, x1: x + w, y1: y + 104 });
}
function tags(t) {
  for (const g of TL.tags) {
    if (t < g.t0 || t > g.t1) continue;
    tagCard(GX + 48, 56, g.en, g.zh, eo(seg(t, g.t0, g.t0 + .22)), 1 - seg(t, g.t1 - .15, g.t1), 'tag-' + g.sec);
  }
}

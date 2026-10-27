// ---------- prop library: paper, type, slips, stamps, clocks, icons (shared by every scene) ----------
// paper texture with grain, foxing and vignette (cached by the caller: build props ONCE at load, never per frame)
function paperTex(w, h, base, seed = 1, dark = 0.06) {
  const c = mk(w, h), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  const id = x.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const p = i / 4, px = p % w, py = (p / w) | 0;
    const n = (hash(p * .013 + seed) - .5) * 22;
    d[i] += n; d[i + 1] += n; d[i + 2] += n * .9;
  }
  x.putImageData(id, 0, 0);
  for (let k = 0; k < 18; k++) { const r = 80 + hash(k * 9.1 + seed) * 260, gx = hash(k * 2.3 + seed) * w, gy = hash(k * 4.9 + seed) * h, gg = x.createRadialGradient(gx, gy, 0, gx, gy, r);
    gg.addColorStop(0, `rgba(90,75,55,${.04 + hash(k + seed * 2) * .05})`); gg.addColorStop(1, 'rgba(90,75,55,0)'); x.fillStyle = gg; x.fillRect(gx - r, gy - r, 2 * r, 2 * r); }
  // fibres + foxing
  for (let k = 0; k < 220; k++) { x.strokeStyle = `rgba(60,50,40,${.03 + hash(k + seed) * .04})`; x.lineWidth = 1;
    const a = hash(k * 3.1 + seed) * w, b = hash(k * 7.3 + seed) * h; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (hash(k) - .5) * 40, b + (hash(k * 2) - .5) * 40); x.stroke(); }
  const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(50,40,30,${dark * 3})`); x.fillStyle = g; x.fillRect(0, 0, w, h);
  return c;
}
function T(c, s, x, y, font, col = '#1a1816', al = 'left', ls = '0px', base = 'alphabetic') {
  c.font = font; c.fillStyle = col; c.textAlign = al; c.letterSpacing = ls; c.textBaseline = base; c.fillText(s, x, y);
}
function wrap(c, s, maxW) {   // char-level wrap (CJK + latin words)
  const tokens = s.match(/[A-Za-z0-9.@_'\-]+|\s|./gu) || [], out = []; let line = '';
  for (const tk of tokens) { const tr = line + tk; if (c.measureText(tr).width > maxW && line) { out.push(line); line = tk.trim() ? tk : ''; } else line = tr; }
  if (line) out.push(line); return out;
}
function para(c, s, x, y, w, lh, font, col) { c.font = font; const L = wrap(c, s, w); L.forEach((l, i) => T(c, l, x, y + i * lh, font, col)); return y + L.length * lh; }
function lay(c, im, cx, cy, s, rot = 0, alpha = 1, shadow = 1) {
  c.save(); c.globalAlpha = alpha; c.translate(cx, cy); c.rotate(rot); c.scale(s, s);
  if (shadow) { c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 36 / s; c.shadowOffsetY = 12 / s; }
  c.drawImage(im, -im.width / 2, -im.height / 2); c.restore();
}
const slamS = (t, T0, from = 1.6) => { const u = seg(t, T0 - .14, T0); return u >= 1 ? 1 : lerp(from, 1, ei(u)); };
const jolt = (t, T0, a = 14) => t > T0 ? Math.exp(-(t - T0) * 14) * Math.sin((t - T0) * 70) * a : 0;
const SERIF = w => `${w} "Noto Serif SC"`, SANS = w => `${w} "Noto Sans SC"`;
const INK = '#1b1916';
// the top-left place card (d_type.js tagCard) covers picture x 30..470, y 50..165 while it is up: keep titles out of it
const TAG_ZONE = { x0: 30, y0: 50, x1: 470, y1: 165 };
const mulb = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
// register a piece of text drawn INSIDE the picture gate for window.TEXTS (readcheck). Coordinates are picture-space.
const pbox = (id, text, x0, y0, x1, y1) => { if (!IN_TR) boxes.push({ id, text, x0: GX + x0, y0, x1: GX + x1, y1 }); };
let IN_TR = false;   // set by composeScene while a transition draws both scenes (no boxes then)

// a printed paper slip with a line of text and a "—— who" attribution. Built once, laid with lay().
function slipCanvas(text, who, w = 520, seed = 5, size = 44) {
  const c = mk(w, 170), x = c.getContext('2d'); x.drawImage(paperTex(w, 170, '#e8e1d2', seed, .02), 0, 0);
  x.strokeStyle = 'rgba(30,27,23,.5)'; x.lineWidth = 1.5; x.strokeRect(8, 8, w - 16, 154);
  let fs = size; x.font = `800 ${fs}px "Noto Sans SC"`; while (x.measureText(text).width > w - 50 && fs > 26) { fs -= 2; x.font = `800 ${fs}px "Noto Sans SC"`; }
  T(x, text, 26, 82, `800 ${fs}px "Noto Sans SC"`, INK); T(x, '—— ' + who, w - 26, 140, '500 28px "Noto Sans SC"', '#4a453e', 'right');
  c.fs = fs; return c;
}
// where a word sits on a slip (for pencil rings): returns slip-local centre x, y and width
function slipWord(sl, text, word) {
  const x = sl.getContext('2d'); x.font = `800 ${sl.fs}px "Noto Sans SC"`; x.letterSpacing = '0px';
  const i = text.indexOf(word); if (i < 0) return null;
  const a = x.measureText(text.slice(0, i)).width, w = x.measureText(word).width;
  return [26 + a + w / 2, 82 - sl.fs * .36, w];
}
// rubber stamp. IMPORTANT: the worn-ink holes use destination-out, so the stamp is drawn on its OWN
// offscreen canvas first (cached) — drawing it straight onto the scene punches holes through the picture.
const STAMPC = {};
function stampCanvas(big, small, ink = '#141210', w = 330, h = 170) {
  const key = [big, small, ink, w, h].join('|'); if (STAMPC[key]) return STAMPC[key];
  const c = mk(w + 40, h + 40), x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2);
  x.strokeStyle = ink; x.lineWidth = 8; x.strokeRect(-w / 2, -h / 2, w, h); x.lineWidth = 3; x.strokeRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28);
  T(x, big, 0, -8, '900 74px "Noto Serif SC"', ink, 'center', '2px', 'middle'); T(x, small, 0, 52, '700 28px "Noto Sans SC"', ink, 'center', '4px', 'middle');
  x.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 70; k++) { x.fillStyle = `rgba(0,0,0,${.4 + hash(k * 1.7) * .6})`; x.beginPath(); x.arc((hash(k * 3.1) - .5) * w, (hash(k * 5.7) - .5) * h, 1 + hash(k) * 5, 0, TAU); x.fill(); }
  return (STAMPC[key] = c);
}
// draw a stamp centred at the current origin. On dark backgrounds pass a light ink ('#ece6da') — dark ink on dark grey is invisible.
function stamp(c, big, small, a = 1, ink) { const s = stampCanvas(big, small, ink); c.save(); c.globalAlpha = a * .9; c.drawImage(s, -s.width / 2, -s.height / 2); c.restore(); }
function clockFace(c, x, y, R, hh, mm) {
  c.save(); c.translate(x, y); c.fillStyle = '#e6dfd0'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 10; c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, R - 16, 0, TAU); c.stroke();
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.lineWidth = i % 3 ? 4 : 9; c.beginPath(); c.moveTo(Math.sin(a) * (R - 30), -Math.cos(a) * (R - 30)); c.lineTo(Math.sin(a) * (R - 52), -Math.cos(a) * (R - 52)); c.stroke(); }
  const ah = (hh % 12 + mm / 60) * TAU / 12, am = mm * TAU / 60; c.lineCap = 'round';
  c.lineWidth = 14; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(ah) * R * .5, -Math.cos(ah) * R * .5); c.stroke();
  c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(am) * R * .78, -Math.cos(am) * R * .78); c.stroke();
  c.fillStyle = INK; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill(); c.restore();
}
// simple engraved weather symbols (sun / cloud / rain / snow / storm), centred, size ~ r
function wxIcon(c, kind, x, y, r, col = INK) {
  c.save(); c.translate(x, y); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(3, r * .09); c.lineCap = 'round';
  const cloud = (ox, oy, s) => { c.beginPath(); c.arc(ox - s * .45, oy, s * .38, Math.PI * .5, Math.PI * 1.5); c.arc(ox - s * .05, oy - s * .3, s * .48, Math.PI, 0); c.arc(ox + s * .5, oy, s * .36, Math.PI * 1.5, Math.PI * .5); c.closePath(); };
  if (kind === 'sun') { c.beginPath(); c.arc(0, 0, r * .42, 0, TAU); c.stroke(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6); c.lineTo(Math.cos(a) * r * .9, Math.sin(a) * r * .9); c.stroke(); } }
  else { cloud(0, -r * .1, r * .9); c.stroke();
    if (kind === 'rain') for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * r * .4, r * .45); c.lineTo(i * r * .4 - r * .12, r * .8); c.stroke(); }
    if (kind === 'snow') for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * r * .4, r * .62, r * .07, 0, TAU); c.fill(); }
    if (kind === 'storm') { c.beginPath(); c.moveTo(r * .05, r * .3); c.lineTo(-r * .15, r * .62); c.lineTo(r * .1, r * .62); c.lineTo(-r * .1, r * .95); c.stroke(); } }
  c.restore();
}
// a dark caption plate (EN line + ZH line) drawn in picture space; registers its text for readcheck
function plate(c, id, cx, y, en, zh, a = 1, align = 'center') {
  c.save(); c.globalAlpha = a; c.textBaseline = 'alphabetic';
  c.font = '600 30px Oswald'; c.letterSpacing = '5px'; const w1 = c.measureText(en).width;
  c.font = '600 26px "Noto Sans SC"'; c.letterSpacing = '3px'; const w2 = c.measureText(zh).width;
  const w = Math.max(w1, w2, 180) + 56, x0 = align === 'center' ? cx - w / 2 : cx;
  c.fillStyle = 'rgba(12,11,10,.86)'; c.fillRect(x0, y, w, 100); c.strokeStyle = '#d8d0bf'; c.lineWidth = 2; c.strokeRect(x0 + 6, y + 6, w - 12, 88);
  c.textAlign = 'center'; c.font = '600 30px Oswald'; c.letterSpacing = '5px'; c.fillStyle = '#f3eee4'; c.fillText(en, x0 + w / 2, y + 44);
  c.font = '600 26px "Noto Sans SC"'; c.letterSpacing = '3px'; c.fillStyle = '#d6cfc0'; c.fillText(zh, x0 + w / 2, y + 82); c.restore();
  if (a >= 1) { pbox(id + '-en', en, x0, y, x0 + w, y + 50); pbox(id + '-zh', zh, x0, y + 50, x0 + w, y + 100); }
}

// ---------- helpers ----------
const frameOf = t => Math.floor(t * FPS + 1e-6);
const clipFrame = (k, t, t0) => { const a = CL[k]; return a[clamp(frameOf(Math.max(0, t - t0)), 0, a.length - 1)]; };
function place(c, im, s, fx, fy, ox = 0, oy = 0, w0 = GW, h0 = GH, clampEdges = true) {
  const w = im.width * s, h = im.height * s;
  let x = w0 / 2 + ox - fx * w, y = h0 / 2 + oy - fy * h;
  if (clampEdges) { x = clamp(x, w0 - w, 0); y = clamp(y, h0 - h, 0); }
  c.drawImage(im, x, y, w, h);
}
const cover = (im, w = GW, h = GH) => Math.max(w / im.width, h / im.height);
function footage(c, k, t, t0, push = [1, 1.05], fx = .5, fy = .5, w = GW, h = GH) {
  const im = clipFrame(k, t, t0), dur = CL[k].length / FPS;
  const s = cover(im, w, h) * lerp(push[0], push[1], seg(t, t0, t0 + dur));
  c.fillStyle = '#000'; c.fillRect(0, 0, w, h); place(c, im, s, fx, fy, 0, 0, w, h);
}
// grease pencil: jittered white stroke along a path, drawn up to progress u (0..1)
function pencil(c, pts, u, wid = 7, alpha = .92) {
  if (u <= 0 || pts.length < 2) return;
  const n = Math.max(2, Math.floor(pts.length * clamp(u)));
  for (const [dx, dy, a, lw] of [[0, 0, alpha, wid], [1.6, -1.2, alpha * .45, wid * .55]]) {
    c.save(); c.strokeStyle = `rgba(250,248,240,${a})`; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i < n; i++) { const [x, y] = pts[i], j = (hash(i * 1.7 + x * .01) - .5) * 1.6; i ? c.lineTo(x + dx + j, y + dy + j) : c.moveTo(x + dx, y + dy); }
    c.stroke(); c.restore();
  }
}
const ring = (cx, cy, rx, ry, rot = 0, turns = 1.12) => [...Array(64).keys()].map(i => {
  const a = -2.2 + i / 63 * TAU * turns, r = 1 + .05 * Math.sin(i * .7);
  return [cx + Math.cos(a + rot) * rx * r, cy + Math.sin(a + rot) * ry * r];
});
const lineP = (x0, y0, x1, y1, n = 24) => [...Array(n).keys()].map(i => { const u = i / (n - 1); return [lerp(x0, x1, u), lerp(y0, y1, u) + Math.sin(u * 9) * 2]; });

// ---------- logo ----------
function globe(c, cx, cy, R, rot, alpha = 1) {
  c.save(); c.globalAlpha = alpha;
  const g = c.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
  g.addColorStop(0, '#f4f1ea'); g.addColorStop(.55, '#a9a49a'); g.addColorStop(1, '#34312c');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
  const tilt = .38, ct = Math.cos(tilt), st = Math.sin(tilt);
  const P3 = (lat, lon) => { const x = Math.cos(lat) * Math.sin(lon + rot), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon + rot);
    return [cx + R * x, cy - R * (y * ct - z * st), y * st + z * ct]; };
  c.strokeStyle = 'rgba(20,18,15,.75)'; c.lineWidth = Math.max(1.2, R * .012);
  const line = pts => { c.beginPath(); let on = false; for (const p of pts) { if (p[2] > 0) { on ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); on = true; } else on = false; } c.stroke(); };
  for (let k = 0; k < 12; k++) { const lon = k * TAU / 12, pts = []; for (let a = -90; a <= 90; a += 4) pts.push(P3(a * Math.PI / 180, lon)); line(pts); }
  for (let la = -60; la <= 60; la += 30) { const pts = []; for (let a = 0; a <= 360; a += 4) pts.push(P3(la * Math.PI / 180, a * Math.PI / 180)); line(pts); }
  c.lineWidth = Math.max(2, R * .025); c.strokeStyle = 'rgba(10,9,8,.9)'; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
  c.restore();
}
function sunburst(c, cx, cy, rot, a) {
  c.save(); c.globalAlpha = a;
  for (let i = 0; i < 36; i++) {
    const a0 = rot + i * TAU / 36, a1 = a0 + TAU / 72;
    c.fillStyle = i % 2 ? '#2a2723' : '#1b1916';
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 1600, a0, a1); c.closePath(); c.fill();
  }
  c.restore();
}
function beams(c, t, on, base) {
  if (on <= 0) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const side of [-1, 1]) {
    const ox = GW / 2 + side * 640, oy = GH + 40;
    const ang = -Math.PI / 2 - side * (.42 + .22 * Math.sin(t * 1.9 + (side > 0 ? 1.1 : 0)) + base);
    const L = 1500, sp = .085;
    const g = c.createLinearGradient(ox, oy, ox + Math.cos(ang) * L, oy + Math.sin(ang) * L);
    g.addColorStop(0, `rgba(255,252,240,${.55 * on})`); g.addColorStop(.7, `rgba(255,250,235,${.16 * on})`); g.addColorStop(1, 'rgba(255,250,235,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(ox, oy);
    c.lineTo(ox + Math.cos(ang - sp) * L, oy + Math.sin(ang - sp) * L); c.lineTo(ox + Math.cos(ang + sp) * L, oy + Math.sin(ang + sp) * L); c.closePath(); c.fill();
  }
  c.restore();
}
function silverText(c, txt, x, y, size, font = 'Limelight', align = 'center', ls = '0px') {
  c.font = `${size}px ${font}`; c.textAlign = align; c.textBaseline = 'middle'; c.letterSpacing = ls;
  c.lineJoin = 'round'; c.lineWidth = size * .12; c.strokeStyle = '#0c0b0a'; c.strokeText(txt, x, y);
  const g = c.createLinearGradient(0, y - size * .5, 0, y + size * .5);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.48, '#d9d4ca'); g.addColorStop(.52, '#9e978a'); g.addColorStop(1, '#efebe2');
  c.fillStyle = g; c.fillText(txt, x, y);
}
function decoTitle(c, t0, t, big, small, y, sizeBig) {
  const u = seg(t, t0, t0 + .5), s = lerp(2.4, 1, back(u, 1.3));
  if (u <= 0) return;
  c.save(); c.translate(GW / 2, y); c.scale(s, s); c.globalAlpha = clamp(u * 3);
  silverText(c, big, 0, 0, sizeBig); c.restore();
  const v = seg(t, t0 + .35, t0 + .65);
  if (v > 0 && small) {
    c.save(); c.globalAlpha = v; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 50px "Noto Serif SC"'; c.letterSpacing = '22px';
    c.lineWidth = 7; c.strokeStyle = '#0c0b0a'; c.strokeText(small, GW / 2 + 11, y + sizeBig * .8);
    c.fillStyle = '#ece7dc'; c.fillText(small, GW / 2 + 11, y + sizeBig * .8);
    c.restore();
  }
}
function bgDesk(c) {
  const g = c.createRadialGradient(GW / 2, GH * .45, 100, GW / 2, GH / 2, 1000);
  g.addColorStop(0, '#5b5751'); g.addColorStop(1, '#151413'); c.fillStyle = g; c.fillRect(0, 0, GW, GH);
}
function arcPts(a, b, bend, n = 60) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx - dy * bend, cy = my + dx * bend;
  return [...Array(n).keys()].map(i => { const u = i / (n - 1); return [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * cx + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * cy + u * u * b[1]]; });
}
function pencilDark(c, pts, u, wid) {   // a soft-lead underline on the printed page
  if (u <= 0) return;
  const n = Math.max(2, Math.floor(pts.length * u));
  c.strokeStyle = 'rgba(20,18,16,.85)'; c.lineWidth = wid; c.lineCap = 'round';
  for (const off of [0, 2.2]) { c.beginPath(); for (let i = 0; i < n; i++) { const [x, y] = pts[i]; i ? c.lineTo(x, y + off + Math.sin(i * 1.3) * .6) : c.moveTo(x, y + off); } c.stroke(); }
}

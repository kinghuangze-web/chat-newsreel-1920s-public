// ======================================================================================
//  SCENES — one function per section id in timeline.json: scene(c, t) draws the picture gate (GW x GH)
//  at absolute film time t. Timing comes ONLY from HIT / SEC (tools/timeline.py), words ONLY from CONTENT.
//  Every prop canvas is built once at load. Each scene = ONE story = ONE prop.
// ======================================================================================
const C_ = CONTENT;

// ---------- logo (ident) ----------
function sceneLogo(c, t) {
  c.fillStyle = '#121110'; c.fillRect(0, 0, GW, GH);
  const on = t < HIT.beams_on ? 0 : clamp(1 - .6 * Math.exp(-(t - HIT.beams_on) * 9));
  const flash = t >= HIT.beams_on ? Math.exp(-(t - HIT.beams_on) * 7) : 0;
  sunburst(c, GW / 2, GH * .44, t * .12, on); beams(c, t, on, 0);
  globe(c, GW / 2, GH * .40, lerp(60, 200, eo(seg(t, .1, .9))), t * 1.4, clamp(on * 1.4));
  decoTitle(c, .3, t, C_.show.en, C_.show.zh, GH * .72, 100);
  const v = seg(t, 1.1, 1.4);
  if (v > 0) { c.save(); c.globalAlpha = v; c.font = '500 26px Oswald'; c.letterSpacing = '9px'; c.textAlign = 'center'; c.fillStyle = '#b9b2a4';
    c.fillText(C_.show.motto, GW / 2 + 4, GH * .935); c.restore(); }
  if (flash > 0) { c.fillStyle = `rgba(255,255,250,${flash * .5})`; c.fillRect(0, 0, GW, GH); }
  if (t > .85 && t < HIT.logo_iris) pbox('logo', C_.show.en, 100, GH * .72 - 70, GW - 100, GH * .72 + 120);
}

// ---------- the newspaper: spins in, slams, pushes in on the quote box, pencil ring ----------
const NP = mk(1400, 1900), NPM = {};
{
  const x = NP.getContext('2d'), p = C_.paper; x.drawImage(paperTex(1400, 1900, '#e4ddcd', 3), 0, 0);
  const W0 = 1400, M = 70;
  T(x, p.masthead, W0 / 2, 205, '900 150px "Noto Serif SC"', INK, 'center', '30px');
  T(x, p.masthead_en, W0 / 2, 290, '50px Limelight', '#2a2622', 'center', '6px');
  x.fillStyle = INK; x.fillRect(M, 318, W0 - 2 * M, 6); x.fillRect(M, 330, W0 - 2 * M, 2);
  T(x, p.no, M + 6, 368, '600 28px "Noto Sans SC"', INK);
  T(x, p.date, W0 / 2, 368, '700 30px "Noto Serif SC"', INK, 'center', '4px');
  T(x, p.count, W0 - M - 6, 368, '600 28px "Noto Sans SC"', INK, 'right');
  x.fillRect(M, 388, W0 - 2 * M, 2);
  x.font = '900 200px "Noto Serif SC"'; x.letterSpacing = '8px'; const hs = Math.min(1, (W0 - 2 * M) / x.measureText(p.headline).width);
  x.save(); x.translate(W0 / 2, 610); x.scale(hs, 1); T(x, p.headline, 0, 0, '900 200px "Noto Serif SC"', INK, 'center', '8px'); x.restore();
  T(x, p.sub, W0 / 2, 715, '900 60px "Noto Serif SC"', '#24211d', 'center', '2px');
  x.fillRect(M, 760, W0 - 2 * M, 3);
  const cw = (W0 - 2 * M - 60) / 3, f = '500 29px "Noto Serif SC"', lh = 44, col = '#2c2824';
  para(x, p.col1, M, 820, cw, lh, f, col);
  const x2 = M + cw + 30, x3 = M + 2 * (cw + 30);
  x.fillStyle = 'rgba(30,26,22,.85)'; x.fillRect(x2 + cw + 14, 790, 2, 1040); x.fillRect(x2 - 16, 790, 2, 1040);
  para(x, p.col3, x3, 820, cw, lh, f, col);
  const bx = x2, by = 800, bw = cw, bh = 560;
  x.strokeStyle = INK; x.lineWidth = 5; x.strokeRect(bx, by, bw, bh); x.lineWidth = 1.5; x.strokeRect(bx + 10, by + 10, bw - 20, bh - 20);
  T(x, p.box_title, bx + bw / 2, by + 70, '900 34px "Noto Serif SC"', INK, 'center', '12px');
  p.quote.forEach((q, i) => {
    x.font = '900 64px "Noto Serif SC"'; x.letterSpacing = '0px'; const qs = Math.min(1, (bw - 52) / x.measureText(q).width);
    x.save(); x.translate(bx + 26, by + 200 + i * 100); x.scale(qs, 1); T(x, q, 0, 0, '900 64px "Noto Serif SC"', INK); x.restore();
    const k = q.indexOf(p.ring);
    if (k >= 0) { x.font = '900 64px "Noto Serif SC"'; const a = x.measureText(q.slice(0, k)).width * qs, w = x.measureText(p.ring).width * qs;
      NPM.quote = [bx + 26 + a + w / 2, by + 178 + i * 100, w]; }
  });
  NPM.quote ??= [bx + bw / 2, by + 250, bw * .6];
  T(x, p.quote_by, bx + bw - 26, by + 400, '600 30px "Noto Sans SC"', '#2a2622', 'right');
  para(x, p.box_note, bx + 26, by + 470, bw - 52, 40, '500 27px "Noto Serif SC"', '#3a3530');
  para(x, p.more, x2, by + bh + 60, cw, lh, f, col);
  x.fillRect(M, 1850, W0 - 2 * M, 2);
}
function scenePaper(c, t) {
  bgDesk(c);
  const sFit = (GH - 40) / NP.height, T0 = HIT.paper_fly, TS = HIT.paper_slam;
  const draw = (s, rot, fx, fy, a, oy = 0, ox = 0) => { c.save(); c.globalAlpha = a; c.translate(GW / 2 + ox, GH / 2 + oy); c.rotate(rot); c.scale(s, s);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 40 / s; c.shadowOffsetY = 14 / s; c.drawImage(NP, -fx * NP.width, -fy * NP.height); c.restore(); };
  if (t < TS) {
    for (let k = 3; k >= 0; k--) { const u = clamp((t - k * .018 - T0) / (TS - T0));
      draw(sFit * (.06 + .94 * Math.pow(u, 2.3)), -Math.pow(1 - u, 1.25) * 2.5 * TAU, .5, .5, k ? .22 : 1); }
    return;
  }
  const j = jolt(t, TS, 16), push = ss(seg(t, TS + .15, HIT.paper_punch)), pu = eo(seg(t, HIT.paper_punch, HIT.paper_punch + .14));
  const tx = NPM.quote[0] / NP.width, ty = (NPM.quote[1] - 40) / NP.height;
  const s = lerp(lerp(sFit, sFit * 1.55, push), sFit * 3.1, pu) * (1 + .03 * seg(t, HIT.paper_punch + .14, SEC.paper.t1));
  const fx = lerp(.5, tx, pu), fy = lerp(lerp(.5, .3, push), ty, pu);
  const k2 = Math.exp(-(t - TS) * 18) * .03 + (t > HIT.paper_punch ? Math.exp(-(t - HIT.paper_punch) * 20) * .03 : 0);
  const ox = 90 * (1 - pu);   // keep the masthead clear of the top-left place card (TAG_ZONE)
  draw(s * (1 + k2), 0, fx, fy, 1, j, ox);
  if (t > HIT.quote_ring) {
    const sc = s * (1 + k2), [qx, qy, qw] = NPM.quote;
    const gx = GW / 2 + ox + (qx - fx * NP.width) * sc, gy = GH / 2 + j + (qy - fy * NP.height) * sc;
    pencil(c, ring(gx, gy, qw * sc * .62, 54 * sc * .5 + 30, .1), seg(t, HIT.quote_ring, HIT.quote_ring + .3), 8);
  }
}

// ---------- the map: land only (NO borders), arcs fly into the focus city, a counter rolls ----------
function sceneMap(c, t) {
  const M_ = C_.map, Cc = MAP.cities, focus = Cc[M_.focus];
  c.fillStyle = '#1d1b18'; c.fillRect(0, 0, GW, GH);
  c.strokeStyle = 'rgba(200,192,176,.10)'; c.lineWidth = 1.5;
  for (let y = 4; y < GH; y += 9) { c.beginPath(); c.moveTo(0, y); c.lineTo(GW, y); c.stroke(); }
  const z = lerp(1, 1.04, seg(t, SEC.map.t0, HIT.map_push)) * lerp(1, 2.2, ei(seg(t, HIT.map_push, SEC.map.t1 + .1)));
  const pz = ss(seg(t, HIT.map_push, SEC.map.t1)), fx = lerp(GW / 2, focus[0], pz), fy = lerp(GH / 2, focus[1], pz);
  c.save(); c.translate(GW / 2, GH / 2); c.scale(z, z); c.translate(-fx, -fy);
  const path = p => { c.beginPath(); p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
  c.save(); c.translate(6, 9); c.fillStyle = 'rgba(0,0,0,.55)'; for (const s of MAP.polys) { path(s.p); c.fill(); } c.restore();
  c.fillStyle = '#2b2722'; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1.5, -1.5], [1.5, 1.5], [-1.5, 1.5], [1.5, -1.5]]) { c.save(); c.translate(dx / z, dy / z); for (const s of MAP.polys) { path(s.p); c.fill(); } c.restore(); }
  const g = c.createLinearGradient(0, 0, 0, GH); g.addColorStop(0, '#d9d3c6'); g.addColorStop(1, '#a8a196');
  c.fillStyle = g; for (const s of MAP.polys) { path(s.p); c.fill(); }
  c.strokeStyle = 'rgba(30,27,23,.35)'; c.lineWidth = 2 / z; c.strokeRect(60, 60, GW - 120, GH - 120);
  for (const [k, h, bend] of M_.arcs) {
    const pts = arcPts(Cc[k], focus, bend), u = eio(seg(t, HIT[h] - .6, HIT[h])); if (u <= 0) continue;
    const n = Math.floor(pts.length * u);
    c.save(); c.setLineDash([10 / z, 9 / z]); c.lineWidth = 5 / z; c.strokeStyle = '#141210'; c.beginPath();
    for (let i = 0; i < n; i++) i ? c.lineTo(...pts[i]) : c.moveTo(...pts[i]); c.stroke(); c.restore();
    if (u < 1 && n > 1) { const [hx, hy] = pts[n - 1]; c.fillStyle = '#141210'; c.beginPath(); c.arc(hx, hy, 9 / z, 0, TAU); c.fill(); }
  }
  for (const L of M_.places) {
    const big = L.key === M_.focus, t0 = big ? HIT[L.hit] : HIT[L.hit] - .6; if (t < t0 - .05) continue;
    const [x, y] = Cc[L.key], u = eo(seg(t, t0 - .05, t0 + .2));
    if (big) for (const [, h] of M_.arcs) { const p = t - HIT[h]; if (p > 0 && p < 1.0) { c.strokeStyle = `rgba(20,18,15,${.8 * (1 - p)})`; c.lineWidth = 4 / z; c.beginPath(); c.arc(x, y, (18 + p * 80) / z, 0, TAU); c.stroke(); } }
    c.save(); c.translate(x, y); const sc = u / z * (big ? 1.5 : 1); c.scale(sc, sc); c.rotate(t * .4);
    c.fillStyle = '#0f0e0c'; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 9 : 22; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.strokeStyle = '#efe9dc'; c.lineWidth = 2.5; c.stroke(); c.restore();
  }
  c.restore();
  for (const L of M_.places) {   // labels in screen space so they stay readable while the map zooms
    const t0 = HIT[L.hit]; if (t < t0) continue;
    const a = clamp((t - t0) / .15) * (1 - seg(t, HIT.map_push + .35, HIT.map_push + .55)); if (a <= 0) continue;
    const [x0, y0] = Cc[L.key], sx = GW / 2 + (x0 - fx) * z + L.dx, sy = GH / 2 + (y0 - fy) * z + L.dy;
    c.save(); c.globalAlpha = a; c.textAlign = L.al; c.textBaseline = 'alphabetic';
    c.font = '600 30px Oswald'; c.letterSpacing = '4px'; const w1 = c.measureText(L.en).width;
    c.font = '600 26px "Noto Sans SC"'; c.letterSpacing = '2px'; const w2 = c.measureText(L.zh).width;
    const w = Math.max(w1, w2) + 28, bx = L.al === 'right' ? sx - w + 14 : sx - 14;
    c.fillStyle = 'rgba(14,13,11,.86)'; c.fillRect(bx, sy - 34, w, 78);
    c.font = '600 30px Oswald'; c.letterSpacing = '4px'; c.fillStyle = '#f3eee4'; c.fillText(L.en, sx, sy);
    c.font = '600 26px "Noto Sans SC"'; c.letterSpacing = '2px'; c.fillStyle = '#d6cfc0'; c.fillText(L.zh, sx, sy + 34);
    c.restore();
    if (a >= 1) { pbox('map-en-' + L.key, L.en, bx, sy - 34, bx + w, sy + 4); pbox('map-zh-' + L.key, L.zh, bx, sy + 4, bx + w, sy + 44); }
  }
  const ya = 1 - seg(t, HIT.map_push + .35, HIT.map_push + .55), N = M_.counter.to;
  if (ya > 0) {   // odometer 00 -> N
    const cnt = N * eio(seg(t, HIT.count0, HIT.count1));
    c.save(); c.globalAlpha = ya; const bx = GW - 330, by = 70;
    c.fillStyle = 'rgba(12,11,10,.9)'; c.fillRect(bx, by, 260, 160); c.strokeStyle = '#d8d0bf'; c.lineWidth = 2; c.strokeRect(bx + 7, by + 7, 246, 146);
    c.font = '600 24px "Noto Sans SC"'; c.letterSpacing = '6px'; c.textAlign = 'center'; c.fillStyle = '#d6cfc0'; c.fillText(M_.counter.label, bx + 130, by + 44);
    c.beginPath(); c.rect(bx + 10, by + 54, 240, 96); c.clip();
    const v = Math.floor(cnt), frac = cnt - v, ds = String(v).padStart(2, '0'), dn = String(Math.min(N, v + 1)).padStart(2, '0');
    c.font = '84px Limelight'; c.textBaseline = 'middle'; c.letterSpacing = '0px';
    for (let i = 0; i < 2; i++) { const roll = ds[i] !== dn[i] && frac > 0, x = bx + 100 + i * 60, y = by + 104 - (roll ? frac * 96 : 0);
      c.fillStyle = '#f1ece1'; c.fillText(ds[i], x, y); if (roll) c.fillText(dn[i], x, y + 96); }
    c.restore();
  }
}

// ---------- the item title card (Art Deco frame, silver Limelight + Chinese line) ----------
function sceneCard(c, t) {
  const t0 = SEC.card.t0;
  c.fillStyle = '#0f0e0d'; c.fillRect(0, 0, GW, GH);
  const z = 1 + .07 * ss(seg(t, t0, SEC.card.t1));
  c.save(); c.translate(GW / 2, GH / 2); c.scale(z, z); c.translate(-GW / 2, -GH / 2);
  const u = eo(seg(t, t0 + .05, t0 + .4)), bx = 150, by = 150, bw = GW - 300, bh = GH - 300;
  c.strokeStyle = '#d9d2c3'; c.lineWidth = 4; const per = 2 * (bw + bh);
  c.setLineDash([per * u, per]); c.strokeRect(bx, by, bw, bh); c.lineWidth = 1.5; c.strokeRect(bx + 16, by + 16, bw - 32, bh - 32); c.setLineDash([]);
  for (const [cx, cy, a0] of [[bx, by, 0], [bx + bw, by, Math.PI / 2], [bx + bw, by + bh, Math.PI], [bx, by + bh, -Math.PI / 2]])
    for (let k = 0; k < 5; k++) { c.strokeStyle = `rgba(217,210,195,${.9 * u})`; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 30 + k * 16, a0, a0 + Math.PI / 2); c.stroke(); }
  const v = seg(t, t0 + .1, t0 + .45);
  if (v > 0) {
    c.save(); c.globalAlpha = clamp(v * 2); c.translate(GW / 2, GH / 2 - 40); const s = lerp(1.6, 1, back(v, 1.2)); c.scale(s, s);
    silverText(c, C_.card.en, 0, 0, 96); c.restore();
    c.save(); c.globalAlpha = clamp(v * 2); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 64px "Noto Serif SC"'; c.letterSpacing = '26px'; c.fillStyle = '#ece7dc'; c.fillText(C_.card.zh, GW / 2 + 13, GH / 2 + 90); c.restore();
  }
  c.fillStyle = `rgba(217,210,195,${u})`; c.fillRect(GW / 2 - 240 * u, GH / 2 + 30, 480 * u, 3);
  c.restore();
  if (t > t0 + .5) { pbox('card-en', C_.card.en, 160, 400, GW - 160, 520); pbox('card-zh', C_.card.zh, 300, 560, GW - 300, 640); }
}

// ---------- the telegram: strips typed in on the beat, stamps on the EMPTY right side ----------
const TG = mk(1180, 760);
{
  const x = TG.getContext('2d'); x.drawImage(paperTex(1180, 760, '#e3dccb', 11, .04), 0, 0);
  x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(24, 24, 1132, 712); x.lineWidth = 1.5; x.strokeRect(36, 36, 1108, 688);
  T(x, 'TELEGRAM', 70, 120, '78px Limelight', INK, 'left', '4px'); T(x, '电  报', 1110, 112, '900 64px "Noto Serif SC"', INK, 'right', '10px');
  x.fillRect(60, 150, 1060, 3);
  T(x, C_.tele.head, 70, 200, '500 30px Oswald', '#3a352f', 'left', '3px');
  x.fillRect(60, 222, 1060, 1.5);
}
function sceneTele(c, t) {
  bgDesk(c); const T0 = SEC.tele.t0;
  const z = lerp(1, 1.07, ss(seg(t, T0, SEC.tele.t1))), j = jolt(t, HIT.stamp1, 10) + jolt(t, HIT.stamp2, 10);
  c.save(); c.translate(GW / 2, GH / 2 + j); c.scale(z, z); c.translate(-GW / 2, -GH / 2);
  const tx = GW / 2 - 80, ty = GH / 2 - 20, s = 1.0; lay(c, TG, tx, ty, s, -.01);
  c.save(); c.translate(tx, ty); c.rotate(-.01); c.scale(s, s); c.translate(-TG.width / 2, -TG.height / 2);
  C_.tele.strips.forEach((s_, i) => {
    const h = 'strip' + (i + 1), u = seg(t, HIT[h], HIT[h] + .5); if (u <= 0) return;
    const y = 270 + i * 120; c.font = '800 52px "Noto Sans SC"'; c.letterSpacing = '3px'; const w = c.measureText(s_).width + 50;
    c.save(); c.beginPath(); c.rect(70, y - 10, w * u, 100); c.clip();
    c.fillStyle = '#f2ecdf'; c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 4; c.fillRect(70, y, w, 78); c.shadowColor = 'transparent';
    T(c, s_, 95, y + 58, '800 52px "Noto Sans SC"', INK, 'left', '3px'); c.restore();
  });
  c.restore();
  const POS = [[1000, 470, -.12], [1030, 700, .1]];   // on the telegram's EMPTY right half, below the header, clear of the strips
  C_.tele.stamps.forEach(([big, small], i) => {
    const h = 'stamp' + (i + 1); if (t < HIT[h] - .14) return; const sc = slamS(t, HIT[h], 2.2) * .85, [x, y, rot] = POS[i];
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc); stamp(c, big, small, clamp((t - HIT[h] + .14) / .1)); c.restore();
  });
  c.restore();
}

// ---------- reaction slips dealt one per beat around a title plate ----------
const SLC = C_.grid.slips.map(([a, b], i) => slipCanvas(a, b, 520, 20 + i));
const SLP = [[-470, -300, -.05], [0, -320, .03], [470, -300, .04], [-470, 260, .03], [0, 280, -.03], [470, 260, .05]];
function sceneGrid(c, t) {
  c.fillStyle = '#2a2724'; c.fillRect(0, 0, GW, GH);
  c.fillStyle = 'rgba(255,250,240,.04)'; for (let y = 0; y < GH; y += 4) if (hash(y * .37) > .5) c.fillRect(0, y, GW, 2);
  const T0 = SEC.grid.t0, z = lerp(1.0, 1.05, seg(t, T0, SEC.grid.t1));
  c.save(); c.translate(GW / 2, GH / 2); c.scale(z, z);
  const u0 = eo(seg(t, T0, T0 + .2));
  c.save(); c.globalAlpha = u0; c.scale(lerp(1.3, 1, u0), lerp(1.3, 1, u0));
  c.fillStyle = 'rgba(12,11,10,.9)'; c.fillRect(-400, -95, 800, 190); c.strokeStyle = '#d9d2c3'; c.lineWidth = 3; c.strokeRect(-388, -83, 776, 166);
  silverText(c, C_.grid.title_en, 0, -22, 66); T(c, C_.grid.title_zh, 0, 50, '600 30px "Noto Sans SC"', '#d6cfc0', 'center', '3px');
  c.restore();
  SLC.forEach((im, i) => { const T1 = HIT.deal0 + i * BEAT, u = eo(seg(t, T1, T1 + .16)); if (u <= 0) return;
    const [x, y, r] = SLP[i]; lay(c, im, x, y + (1 - u) * -60, lerp(1.05, .8, u), r * (1 + (1 - u) * 3), clamp(u * 2)); });
  c.restore();
  if (t > T0 + .3) pbox('grid-title', C_.grid.title_en + ' ' + C_.grid.title_zh, GW / 2 - 400, GH / 2 - 95, GW / 2 + 400, GH / 2 + 95);
}

// ---------- one quote slammed full frame + pencil ring ----------
const QS = slipCanvas(C_.quote.text, C_.quote.who, 980, 41, 76);
function sceneQuote(c, t) {
  bgDesk(c); const T0 = HIT.slam_quote, j = jolt(t, T0, 14);
  const s = slamS(t, T0, 1.7) * lerp(1.05, 1.18, ss(seg(t, T0 + .1, SEC.quote.t1)));
  lay(c, QS, GW / 2, GH / 2 - 40 + j, s, -.015, clamp((t - T0 + .14) / .1));
  const wq = slipWord(QS, C_.quote.text, C_.quote.ring);
  if (wq && t > HIT.quote_ring2) { const gx = GW / 2 + (wq[0] - QS.width / 2) * s, gy = GH / 2 - 40 + j + (wq[1] - QS.height / 2) * s;
    pencil(c, ring(gx, gy, wq[2] * s * .7, 46 * s, .1), seg(t, HIT.quote_ring2, HIT.quote_ring2 + .3), 8); }
}

// ---------- everybody repeats one line: slips one per beat, then a LIGHT-ink stamp (dark background) ----------
const REPC = C_.repeat.who.map(([w, tm], i) => slipCanvas(C_.repeat.text, `${w} · ${tm}`, 560, 60 + i, 40));
function sceneRepeat(c, t) {
  c.fillStyle = '#2a2724'; c.fillRect(0, 0, GW, GH);
  c.fillStyle = 'rgba(255,250,240,.04)'; for (let y = 0; y < GH; y += 4) if (hash(y * .41) > .5) c.fillRect(0, y, GW, 2);
  const T0 = SEC.repeat.t0, n = REPC.length, done = HIT.rep0 + n * BEAT, j = jolt(t, done, 8);
  const z = lerp(1.0, 1.06, seg(t, T0, SEC.repeat.t1));
  c.save(); c.translate(GW / 2, GH / 2 + j); c.scale(z, z);
  const top = Math.ceil(n / 2), bot = n - top;
  REPC.forEach((im, i) => { const T1 = HIT.rep0 + i * BEAT, u = eo(seg(t, T1, T1 + .14)); if (u <= 0) return;
    const row = i < top ? 0 : 1, col = row ? i - top : i, m = row ? bot : top;
    const x = (col - (m - 1) / 2) * 360, y = -320 + row * 210 + (col % 2) * 30;
    lay(c, im, x, y + (1 - u) * -60, lerp(1.3, .62, u), (hash(i * 4.4) - .5) * .12, clamp(u * 2)); });
  if (t > done) { const u = eo(seg(t, done, done + .15)); c.save(); c.translate(0, 230); c.rotate(-.06); c.scale(lerp(2, 1.1, u), lerp(2, 1.1, u));
    stamp(c, C_.repeat.stamp[0], C_.repeat.stamp[1], u, '#ece6da'); c.restore(); }
  c.restore();
}

// ---------- weather board (real forecast, issue time on screen) ----------
const WB = mk(1240, 860);
{
  const x = WB.getContext('2d'), w = C_.weather; x.drawImage(paperTex(1240, 860, '#e6dfcf', 33, .04), 0, 0);
  x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(22, 22, 1196, 816); x.lineWidth = 1.5; x.strokeRect(34, 34, 1172, 792);
  T(x, w.en, 70, 128, '84px Limelight', INK, 'left', '6px'); T(x, w.zh, 1170, 120, '900 64px "Noto Serif SC"', INK, 'right', '12px');
  x.fillStyle = INK; x.fillRect(60, 160, 1120, 3);
  T(x, w.issued, 70, 210, '500 28px "Noto Sans SC"', '#3a352f', 'left', '2px');
  x.fillRect(60, 236, 1120, 1.5);
}
function sceneWeather(c, t) {
  bgDesk(c); const T0 = SEC.weather.t0, z = lerp(1, 1.05, ss(seg(t, T0, SEC.weather.t1)));
  c.save(); c.translate(GW / 2, GH / 2); c.scale(z, z); c.translate(-GW / 2, -GH / 2);
  const bx = GW / 2, by = GH / 2 + 40, ws = .86; lay(c, WB, bx, by, ws, .005);   // top edge below the place card (TAG_ZONE)
  c.save(); c.translate(bx, by); c.scale(ws, ws); c.translate(-WB.width / 2, -WB.height / 2);
  C_.weather.rows.forEach(([city, ic, wx, temp], i) => {
    const h = HIT['wx' + (i + 1)] ?? (HIT.wx1 + i * BEAT), u = seg(t, h, h + .25); if (u <= 0) return;
    const y = 320 + i * 130;
    c.save(); c.globalAlpha = clamp(u * 2); c.beginPath(); c.rect(50, y - 70, 1140 * eo(u), 130); c.clip();
    T(c, city, 90, y + 18, '900 58px "Noto Serif SC"', INK, 'left', '8px');
    wxIcon(c, ic, 480, y, 50); T(c, wx, 580, y + 18, '800 50px "Noto Sans SC"', INK, 'left', '4px');
    T(c, temp, 1150, y + 18, '64px Limelight', INK, 'right', '2px');
    c.fillStyle = 'rgba(30,27,23,.35)'; c.fillRect(70, y + 52, 1100, 1.5); c.restore();
  });
  c.restore(); c.restore();
}

// ---------- the last word of the day: a clock + slip, the band stops, only the clock ticks ----------
const LAST = slipCanvas(C_.clock.text, C_.clock.who, 760, 99, 76);
function sceneClock(c, t) {
  bgDesk(c); const T0 = SEC.clock.t0, d = t - HIT.clock_ring, j = d > 0 ? Math.exp(-d * 12) * Math.sin(d * 60) * 14 : 0;
  const z = lerp(1, 1.08, ss(seg(t, T0, SEC.clock.t1)));
  c.save(); c.translate(GW / 2, GH / 2 + j); c.scale(z, z); c.translate(-GW / 2, -GH / 2);
  const sec = Math.floor(Math.max(0, t - T0) * 2) / 2;
  clockFace(c, 330, GH / 2 - 40, 230, C_.clock.hh, C_.clock.mm + sec / 60);
  const s = .78; lay(c, LAST, 1010, GH / 2 - 40, s, .02);
  const wq = slipWord(LAST, C_.clock.text, C_.clock.ring);
  if (wq && t > HIT.clock_ring) pencil(c, ring(1010 + (wq[0] - LAST.width / 2) * s, GH / 2 - 40 + (wq[1] - LAST.height / 2) * s, wq[2] * s * .72, 48, .1), seg(t, HIT.clock_ring + .05, HIT.clock_ring + .35), 8);
  c.restore();
}

// ---------- end ident + end card ----------
function sceneEndLogo(c, t) {
  c.fillStyle = '#121110'; c.fillRect(0, 0, GW, GH); sunburst(c, GW / 2, GH * .46, -t * .1, 1); beams(c, t, 1, -.08);
  globe(c, GW / 2, GH * .26, 92, t * 1.4); decoTitle(c, HIT.end_hit2 - .15, t, C_.show.end_en, C_.show.end_zh, GH * .56, 118);
  if (t > HIT.end_hit2 + .4 && t < SEC.endcard.t0 - .3) { pbox('end-en', C_.show.end_en, 120, GH * .56 - 70, GW - 120, GH * .56 + 70); pbox('end-zh', C_.show.end_zh, 500, GH * .56 + 70, GW - 500, GH * .56 + 140); }
}
function sceneEndCard(c, t) {
  const t0 = SEC.endcard.t0, S = C_.show; c.fillStyle = '#100f0e'; c.fillRect(0, 0, GW, GH);
  const a = eo(seg(t, t0, t0 + .5)); c.save(); c.globalAlpha = a;
  c.strokeStyle = 'rgba(217,210,195,.55)'; c.lineWidth = 2; c.strokeRect(120, 150, GW - 240, GH - 300); c.lineWidth = 1; c.strokeRect(134, 164, GW - 268, GH - 328);
  c.font = '900 72px "Noto Serif SC"'; c.letterSpacing = '10px'; const w1 = c.measureText(S.title_zh).width;
  c.font = '60px Limelight'; c.letterSpacing = '0px'; const w2 = c.measureText(S.title_en).width;
  const gap = 44, x0 = GW / 2 - (w1 + gap + w2) / 2;
  T(c, S.title_zh, x0, 372, '900 72px "Noto Serif SC"', '#efe9dd', 'left', '10px'); silverText(c, S.title_en, x0 + w1 + gap, 348, 60, 'Limelight', 'left', '0px');
  c.fillStyle = '#b8b0a0'; const lw = 560 * eo(seg(t, t0 + .2, t0 + .6)); c.fillRect(GW / 2 - lw / 2, 430, lw, 2);
  T(c, `${S.ep} · 1920s 新闻影片 · ${S.date}`, GW / 2, 510, '500 34px "Noto Sans SC"', '#e4ddd0', 'center', '4px');
  C_.credits.forEach((s, i) => T(c, s, GW / 2, 640 + i * 46, '400 26px "Noto Sans SC"', '#a9a192', 'center', '1px'));
  c.restore();
}

// ---------- registry: section id -> scene, which sections get the projector weave, the transitions ----------
const SCN = { logo: sceneLogo, paper: scenePaper, map: sceneMap, card: sceneCard, tele: sceneTele, grid: sceneGrid, quote: sceneQuote,
  repeat: sceneRepeat, weather: sceneWeather, clock: sceneClock, endlogo: sceneEndLogo, endcard: sceneEndCard };
const FOOTAGE = new Set(['paper', 'map', 'tele', 'grid', 'quote', 'repeat', 'weather', 'clock']);
// [time, type, before, after, from, to]  — every transition type at most ONCE per film; all others are hard cuts on the beat
const TR = [
  [HIT.wipe_map, 'wipe', .16, .16, 'paper', 'map'],
  [HIT.blinds_card, 'blinds', .02, .3, 'map', 'card'],
  [HIT.iris_tele, 'irisopen', .02, .28, 'card', 'tele'],
  [HIT.flip_weather, 'flip', .14, .14, 'repeat', 'weather'],
  [HIT.clock_wipe, 'clock', .17, .17, 'weather', 'clock'],
  [SEC.endcard.t0, 'fade', .3, .3, 'endlogo', 'endcard'],
];
// iris in/out on whole sections: close = iris closes to black ending at the section end; open = opens from black at the start
const IRIS = [{ id: 'logo', close: HIT.logo_iris }, { id: 'clock', close: SEC.clock.t1 - .3, cy: .5 }, { id: 'endlogo', open: true }];
function secAt(t) { let id = TL.secs[0].id; for (const s of TL.secs) if (t >= s.t0) id = s.id; return id; }

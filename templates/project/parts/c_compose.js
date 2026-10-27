function composeScene(t) {
  const id = secAt(t);
  for (const c of [P, F1, T2]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = '#000'; c.fillRect(0, 0, GW, GH); }
  for (const [T, type, a, b, from, to] of TR) {
    if (t >= T - a && t < T + b) {
      const u = (t - (T - a)) / (a + b);
      IN_TR = true; F1.save(); SCN[from](F1, Math.min(t, T - 1e-3)); F1.restore();
      T2.save(); SCN[to](T2, Math.max(t, T)); T2.restore();
      IN_TR = false; P.drawImage(FROM, 0, 0);
      if (type === 'wipe') {           // hard diagonal wipe with a thin bright edge
        const e = eio(u) * (GW + 500) - 250;
        P.save(); P.beginPath(); P.moveTo(-10, -10); P.lineTo(e + 250, -10); P.lineTo(e - 250, GH + 10); P.lineTo(-10, GH + 10); P.closePath(); P.clip(); P.drawImage(TMP, 0, 0); P.restore();
        P.strokeStyle = 'rgba(255,250,235,.85)'; P.lineWidth = 6; P.beginPath(); P.moveTo(e + 250, -10); P.lineTo(e - 250, GH + 10); P.stroke();
      } else if (type === 'flip') {    // card flip on the vertical axis
        P.fillStyle = '#000'; P.fillRect(0, 0, GW, GH);
        const src = u < .5 ? FROM : TMP, k = Math.abs(Math.cos(u * Math.PI));
        P.save(); P.translate(GW / 2, GH / 2); P.scale(Math.max(.002, k), 1 - .06 * (1 - k)); P.drawImage(src, -GW / 2, -GH / 2);
        P.fillStyle = `rgba(0,0,0,${.55 * (1 - k)})`; P.fillRect(-GW / 2, -GH / 2, GW, GH); P.restore();
      } else if (type === 'blinds') {  // venetian blinds: twelve slats turn over to the card
        const n = 12, sh = GH / n;
        for (let i = 0; i < n; i++) {
          const v = clamp(eio(seg(u, i * .03, .64 + i * .03)));
          const k = Math.abs(Math.cos(v * Math.PI)), src = v < .5 ? FROM : TMP;
          P.fillStyle = '#000'; P.fillRect(0, i * sh, GW, sh);
          P.save(); P.translate(0, i * sh + sh / 2); P.scale(1, Math.max(.01, k)); P.drawImage(src, 0, i * sh, GW, sh, 0, -sh / 2, GW, sh); P.restore();
        }
      } else if (type === 'clock') {   // radial clock wipe from 12 o'clock
        const ang = -Math.PI / 2 + eio(u) * TAU;
        P.save(); P.beginPath(); P.moveTo(GW / 2, GH / 2); P.arc(GW / 2, GH / 2, 1600, -Math.PI / 2, ang); P.closePath(); P.clip(); P.drawImage(TMP, 0, 0); P.restore();
        P.strokeStyle = 'rgba(255,250,235,.8)'; P.lineWidth = 5; P.beginPath(); P.moveTo(GW / 2, GH / 2); P.lineTo(GW / 2 + Math.cos(ang) * 1600, GH / 2 + Math.sin(ang) * 1600); P.stroke();
      } else if (type === 'irisopen') {
        const r = eo(u) * 1000;
        P.save(); P.beginPath(); P.arc(GW / 2, GH / 2, r, 0, TAU); P.clip(); P.drawImage(TMP, 0, 0); P.restore();
        P.strokeStyle = 'rgba(0,0,0,.9)'; P.lineWidth = 14; P.beginPath(); P.arc(GW / 2, GH / 2, r, 0, TAU); P.stroke();
      } else if (type === 'fade') {    // through black
        P.fillStyle = '#000'; P.fillRect(0, 0, GW, GH);
        P.globalAlpha = Math.abs(1 - 2 * u); P.drawImage(u < .5 ? FROM : TMP, 0, 0); P.globalAlpha = 1;
      }
      return { id: to, footage: FOOTAGE.has(to) || FOOTAGE.has(from) };
    }
  }
  P.save(); SCN[id](P, t); P.restore();
  const iris = (r, cy = GH * .4) => { P.save(); P.globalCompositeOperation = 'destination-in'; P.beginPath(); P.arc(GW / 2, cy, Math.max(0, r), 0, TAU); P.fill(); P.globalCompositeOperation = 'destination-over'; P.fillStyle = '#000'; P.fillRect(0, 0, GW, GH); P.restore(); };
  for (const I of IRIS) {
    if (I.id !== id) continue; const cy = GH * (I.cy ?? .4);
    if (I.open) iris(lerp(0, 1100, eo(seg(t, SEC[id].t0, SEC[id].t0 + .32))), cy);
    else if (t > I.close) iris(lerp(1000, 0, ei(seg(t, I.close, SEC[id].t1 - .02))), cy);
  }
  return { id, footage: FOOTAGE.has(id) };
}

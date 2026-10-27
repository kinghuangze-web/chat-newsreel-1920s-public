
window.render = (t) => {
  boxes.length = 0;
  const f = frameOf(t);
  X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = '#000'; X.fillRect(0, 0, W, H);
  const sc = composeScene(t);
  filmLook(f, sc.footage ? 1 : 0);
  // projector flicker + gate weave on "footage" sections only (idents and cards stay steady)
  const flick = sc.footage ? 1 + (hash(f * .37) - .5) * .07 + (vnoise(t * 3) - .5) * .05 : 1 + (hash(f * .37) - .5) * .025;
  const wx = sc.footage ? (vnoise(f * .21) - .5) * 3.2 : 0, wy = sc.footage ? (vnoise(f * .17 + 9) - .5) * 4.4 : 0;
  X.save(); X.beginPath(); X.roundRect(GX, 0, GW, GH, 26); X.clip();
  X.filter = `grayscale(1) brightness(${flick.toFixed(3)})`; X.drawImage(PIC, GX + wx, wy); X.filter = 'none';
  X.restore();
  tags(t); if (!NOSUB) { subBand(t); subtitle(t); }
};
// readcheck contract: every text block on screen (picture texts registered by the scenes with pbox + tag cards)
window.TEXTS = (t) => { window.render(t); return boxes.filter(b => b.x0 >= 0); };
window.EV = [...Object.entries(HIT).map(([k, v]) => ({ t: v, type: k })), ...TL.lines.map(L => ({ t: L.t, type: 'voice', id: L.id }))];
window.render(0);
window.READY = true;
</script></body></html>

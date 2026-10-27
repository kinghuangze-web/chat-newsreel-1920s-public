#!/usr/bin/env python3
"""Measure a record before you cut picture to it (RECORD mode).

    $LIB/.venv/bin/python tools/measure_bgm.py audio/bgm_src.wav [--bpm-range 70 200] [--beats-per-bar 4]

Prints: tempo (BEAT seconds), offset of the first downbeat, the loop/repeat length in bars (if the piece repeats),
and the best SPLICE candidates: pairs of bar lines whose following 2 s sound alike (chroma similarity), so the record
can jump from one to the other without a audible seam. EP.03 numbers for reference: 128 beats in 67.42 s
(BEAT 0.5267 s, ~113.9 BPM), first downbeat 0.16 s, loop 32 bars, phrases 8 bars, splice loop1-bar32 -> loop4-bar16.
Always LISTEN to the chosen splice (render a 10 s excerpt) - numbers only shortlist.
"""
import argparse, numpy as np, soundfile as sf
ap = argparse.ArgumentParser(); ap.add_argument("wav"); ap.add_argument("--bpm-range", nargs=2, type=float, default=[70, 200])
ap.add_argument("--beats-per-bar", type=int, default=4); ap.add_argument("--top", type=int, default=8)
a = ap.parse_args()
x, sr = sf.read(a.wav, dtype="float32"); x = x.mean(1) if x.ndim > 1 else x
hop, nfft = 512, 2048; fps = sr / hop
frames = np.lib.stride_tricks.sliding_window_view(x, nfft)[::hop] * np.hanning(nfft)
S = np.abs(np.fft.rfft(frames, axis=1)); f = np.fft.rfftfreq(nfft, 1 / sr)
L = np.log1p(S); flux = np.maximum(np.diff(L, axis=0), 0).sum(1); flux = (flux - flux.mean()) / (flux.std() + 1e-9)
# tempo: autocorrelation of the onset envelope
ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
lo, hi = int(fps * 60 / a.bpm_range[1]), int(fps * 60 / a.bpm_range[0])
lag = lo + np.argmax(ac[lo:hi]);
# refine with the 8th multiple (more precise)
k8 = 8 * lag; w = max(2, lag // 4); lag8 = k8 - w + np.argmax(ac[k8 - w:k8 + w]); BEAT = lag8 / 8 / fps
BAR = BEAT * a.beats_per_bar
t = np.arange(len(flux)) / fps
ph = (t % BAR) / BAR; h, _ = np.histogram(ph, bins=64, weights=np.maximum(flux, 0)); off = np.argmax(h) / 64 * BAR
print(f"BEAT {BEAT:.4f} s  = {60 / BEAT:.2f} BPM   BAR {BAR:.4f} s   first downbeat ~{off:.3f} s  (duration {len(x) / sr:.2f} s)")
# chroma per bar
ok = (f > 60) & (f < 2000); pc = (np.round(12 * np.log2(f[ok] / 440)) % 12).astype(int)
def chroma(t0, d=2.0):
    s = x[int(t0 * sr):int((t0 + d) * sr)]
    if len(s) < nfft: return None
    Z = np.abs(np.fft.rfft(s * np.hanning(len(s)))); ff = np.fft.rfftfreq(len(s), 1 / sr); m = (ff > 60) & (ff < 2000)
    ch = np.zeros(12); np.add.at(ch, (np.round(12 * np.log2(ff[m] / 440)) % 12).astype(int), Z[m]); return ch / (np.linalg.norm(ch) + 1e-9)
nb = int((len(x) / sr - off) / BAR)
bars = [off + i * BAR for i in range(nb)]
# loop length: the bar shift at which the onset envelope repeats best
best = None
for nl in (8, 16, 24, 32, 48, 64):
    sh = int(nl * BAR * fps)
    if sh >= len(flux) - fps * 10: continue
    c = np.corrcoef(flux[:-sh], flux[sh:])[0, 1]; print(f"  repeat after {nl:>2} bars: r = {c:.3f}")
    if best is None or c > best[1] + .02: best = (nl, c)
if best: print(f"loop ~{best[0]} bars = {best[0] * BAR:.2f} s (r {best[1]:.2f})")
CH = [chroma(b) for b in bars]
pairs = []
for i in range(nb):
    for j in range(i + 8, nb):
        if CH[i] is None or CH[j] is None or (j - i) % 4: continue
        pairs.append((float(CH[i] @ CH[j]), i, j))
pairs.sort(reverse=True)
print("splice candidates (jump FROM the bar line before bar i TO bar j; same position in the 4-bar phrase):")
for s, i, j in pairs[:a.top]: print(f"  bar {i:>3} ({bars[i]:7.2f} s) -> bar {j:>3} ({bars[j]:7.2f} s)   similarity {s:.3f}")

#!/usr/bin/env python3
"""RECORD mode: a real piece of music (e.g. a viewer's request) played as a 78 rpm record on a gramophone
+ foley + announcer -> out/mix.wav.  Used in EP.03 (the CCTV weather-forecast music, requested by a group member).

    put the source at audio/bgm_src.wav (any rate/channels; NEVER commit it - copyrighted)
    measure it first:  $LIB/.venv/bin/python tools/measure_bgm.py audio/bgm_src.wav   -> BEAT, first downbeat, loop length, splice candidates
    set MODE="record", BEAT, M0, G0 in tools/timeline.py and add a "music_end" hit (and "splice" if you cut the record)
    $LIB/.venv/bin/python audio/mix_record.py

SEGMENTS = which parts of the record play, in film order: (src_start, src_end) in seconds of the SOURCE.
The first segment starts at film time M0 (needle drop). Each later segment starts exactly where the previous one ends
in film time, joined with a 60 ms crossfade. Splice ONLY at bar lines, between phrases that sound alike
(measure_bgm.py ranks candidates by chroma similarity); never cut mid-phrase. The last segment should run to the
record's real final chord: the final chord ENDS the music - the end card comes after it, not over a fade-out.
"""
import json, os, sys
from pathlib import Path
import numpy as np, soundfile as sf, soxr
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = Path(__file__).resolve().parent.parent
LIB = Path(os.environ.get("LIB") or next(p for p in [HERE.parents[1], HERE.parents[2], Path.home() / "lemo-opuscar", Path("/data/lemo-opuscar")] if (p / "core" / "audio").exists()))
sys.path.insert(0, str(LIB)); sys.path.insert(0, str(HERE / "audio"))
from core.audio.sfx import SR, add, bp, lp, hp, noise, norm, t_, whoosh, thump, click, limit
from foley import auto_foley, period_voice, projector_bed

SRC = HERE / "audio" / "bgm_src.wav"
SEGMENTS = [(0.0, 67.58), (236.13, 277.34)]       # EP.03: loop 1 up to bar 32, then loop 4 from bar 16 to the final chord
XF = .06

TL = json.loads((HERE / "timeline.json").read_text())
HIT, DUR, SEC = TL["hits"], TL["dur"], {s["id"]: s for s in TL["secs"]}
N = int((DUR + .3) * SR); tt = t_(N / SR); M0 = TL["m0"]

# ------------------------------------------------------------------ the record
src, sr0 = sf.read(SRC, dtype="float32")
if sr0 != SR: src = soxr.resample(src, sr0, SR)
mono = src.mean(1) if src.ndim > 1 else src
rec = np.zeros(N, np.float32); xf = int(XF * SR); t_film = M0
for i, (a, z) in enumerate(SEGMENTS):
    seg = mono[max(0, int(a * SR) - (xf if i else 0)):int(z * SR) + xf].copy()
    ramp_in = np.linspace(0, 1, 2 * xf) if i else np.ones(0)
    ramp_out = np.linspace(1, 0, 2 * xf) if i < len(SEGMENTS) - 1 else np.ones(0)
    env = np.r_[ramp_in, np.ones(max(0, len(seg) - len(ramp_in) - len(ramp_out))), ramp_out][:len(seg)]
    i0 = int(t_film * SR) - (xf if i else 0); seg = (seg * env)[:max(0, N - i0)]
    rec[i0:i0 + len(seg)] += seg
    t_film += z - a
MUSIC_END = HIT.get("music_end", t_film)
print("record plays", round(M0, 2), "->", round(t_film, 2), "s (film); music_end hit", round(MUSIC_END, 2))
if "splice" in HIT and len(SEGMENTS) > 1 and abs(HIT["splice"] - (M0 + SEGMENTS[0][1] - SEGMENTS[0][0])) > .03:
    print("!! timeline splice hit does not match SEGMENTS - the picture will drift off the music")
# a 78 through a horn: band-limited, a little saturated, eccentric-record wow at 78 rpm (1.3 Hz)
k = np.arange(N, dtype=np.float64); dev = .0012 * np.sin(2 * np.pi * 1.3 * k / SR)
rec = np.interp(np.clip(k + np.cumsum(dev), 0, N - 1), k, rec).astype(np.float32)
rec = bp(rec, 110, 6500, 2); rec = rec + .3 * bp(rec, 900, 2600, 2); rec = np.tanh(norm(rec) * 1.5) / np.tanh(1.5)
# surface noise, crackle and rumble ONLY while the needle is down
down = (tt >= M0 - .12) & (tt <= MUSIC_END + .15)
r = np.random.default_rng(7); crack = np.zeros(N, np.float32)
for i in r.choice(N, int(DUR * 9), replace=False):
    if not down[i]: continue
    c_ = click(1.6 + r.random() * 1.5, .3 + r.random() * .7); crack[i:i + len(c_)] += c_[:N - i] * (.25 + r.random() * .75)
hiss = bp(noise(N / SR), 1200, 6000) * .5 + lp(noise(N / SR), 90) * 2.0 * (.6 + .4 * np.sin(2 * np.pi * 1.3 * tt))
surf = (norm(bp(crack, 600, 7000)) * .10 + norm(hiss) * .035) * down
music = norm(rec) * .9
# OPTIONAL "please stand by" gag (EP.03): the feed drops to a muffled monitor with a 1 kHz tone over it
if "standby" in SEC:
    s0, s1 = SEC["standby"]["t0"], SEC["standby"]["t1"]
    g = uniform_filter1d(np.where((tt >= s0) & (tt < s1), .18, 1.0), int(.04 * SR))
    music = music * g + lp(music, 450, 2) * (1 - g) * .9
    music = music + np.sin(2 * np.pi * 1000 * tt) * ((tt >= s0 + .02) & (tt < s1 - .3)) * .16

# ------------------------------------------------------------------ foley: tonearm, needle, lift-off + conventions
fx = np.zeros((N, 2), np.float32)
add(fx, click(.9, .7), max(0, M0 - .7), .25, .3)                       # tonearm swings over
add(fx, thump(.5, 110), M0, .35); add(fx, click(1.8, 1), M0, .5)        # needle drop
add(fx, click(1.2, .8), MUSIC_END + .12, .45); add(fx, whoosh(.2, .5), MUSIC_END + .14, .15)   # needle lifts
auto_foley(fx, TL, {"rep0": 5, "deal0": 6})
bed = projector_bed(N); fx[:, 0] += bed; fx[:, 1] += bed * .95

# ------------------------------------------------------------------ announcer, ducking, master
vo = np.zeros((N, 2), np.float32)
for L in TL["lines"]:
    x, sr = sf.read(HERE / "voice" / "out" / f"{L['id']}.wav", dtype="float32")
    if x.ndim > 1: x = x.mean(1)
    add(vo, period_voice(soxr.resample(x, sr, SR)), L['t'], 1.0)
env = (np.abs(vo[:, 0]) > .02).astype(np.float32)
env = uniform_filter1d(maximum_filter1d(env, int(.2 * SR)), int(.15 * SR))
mus = (music * (1 - .5 * env))[:, None] * np.ones((1, 2), np.float32)
mus[:, 0] += surf; mus[:, 1] += surf
for c in range(2): fx[:, c] = hp(fx[:, c], 55, 2)
mix = mus * .62 + fx * .85 + vo * 1.05
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
(HERE / "out").mkdir(exist_ok=True)
sf.write(HERE / "out" / "mix.wav", mix[:int(DUR * SR)], SR)
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print("mix rms", round(rms_db(mix), 1), "| music", round(rms_db(mus * .62), 1), "| voice", round(rms_db(vo * 1.05), 1))

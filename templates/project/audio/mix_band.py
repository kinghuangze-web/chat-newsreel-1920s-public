#!/usr/bin/env python3
"""BAND mode: an original 1920s Charleston band score (core.audio sampler) + foley + announcer -> out/mix.wav
Needs the library's music samples:  sh setup.sh deps music  (in $LIB).  Run from anywhere:
    $LIB/.venv/bin/python audio/mix_band.py            (LIB found automatically, or set LIB=...)
Structure (all from timeline.json): fanfare on the ident -> band from the first story on, 8-bar tune ->
dead STOP + timpani under the item card -> band again -> one last stab at stop_btn, then only the clock ticks ->
"da - DA!" on end_hit1/end_hit2 (the final chord ENDS the music) -> soft clarinet tag under the end card.
"""
import json, os, sys
from pathlib import Path
import numpy as np, soundfile as sf, soxr
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = Path(__file__).resolve().parent.parent
LIB = Path(os.environ.get("LIB") or next(p for p in [HERE.parents[1], HERE.parents[2], Path.home() / "lemo-opuscar", Path("/data/lemo-opuscar")] if (p / "core" / "audio").exists()))
sys.path.insert(0, str(LIB)); sys.path.insert(0, str(HERE / "audio"))
from core.audio import sampler as S, pluck as PL
from core.audio.sfx import SR, add, bp, lp, hp, noise, norm, t_, limit
from foley import auto_foley, period_voice, projector_bed

TL = json.loads((HERE / "timeline.json").read_text())
HIT, DUR, SEC = TL["hits"], TL["dur"], {s["id"]: s for s in TL["secs"]}
B = TL["beat"]; BAR = TL["bar"]; G0 = TL.get("g0", 0)
S.seed(11)
N = int((DUR + .3) * SR)
M = S.midi
def bt(bar, beat=0.0): return G0 + bar * BAR + beat * B
bar_of = lambda t: int(round((t - G0) / BAR))
ev = []          # (t, inst, pitch, dur, vel, pan, gain)
def n(t, inst, p, d, v, pan=0, g=1.0): ev.append((t, inst, p, d, v, pan, g))
plucks = []      # (t, preset, pitches, dur, vel, gain, pan)

# ------------------------------------------------------------------ 1. fanfare on the ident (bars 0-2)
for k in range(8):
    n(k * .02, 'timpani', 'F2', .05, .25 + k * .06, 0, .8)
T0 = HIT['beams_on']
fan = [(0, 'C5', .14), (.5, 'F5', .14), (1, 'A5', 1.4), (3, 'G5', .14), (3.5, 'A5', .14), (4, 'C6', 2.6)]
for b_, p, d in fan:
    t = T0 + b_ * B
    n(t, 'trumpet', p, d * B + .02, .85, -.25, .9)
    n(t, 'trumpet', M(p) - 4 if p != 'C6' else 'A5', d * B + .02, .7, .25, .55)
    n(t, 'trombone_stac' if d < .5 else 'trombone', M(p) - 17, d * B + .02, .75, .1, .7)
n(T0, 'tuba_stac', 'F2', .3, .9); n(T0 + 4 * B, 'tuba_stac', 'F2', .4, .9)
n(T0, 'crash', None, None, .8, 0, .7)
n(T0 + 4 * B, 'timpani', 'F2', .6, .8); n(T0 + 4 * B, 'timpani', 'C3', .6, .6)
for p in ['D5', 'F5', 'Bb5']: n(bt(2), 'trumpet', p, .2, .7, 0, .45)
for p in ['F3', 'Bb3', 'D4']: n(bt(2), 'trombone_stac', p, .2, .7, 0, .5)
n(bt(2), 'tuba_stac', 'Bb1', .2, .8)
for p in ['C5', 'F5', 'A5']: n(bt(2, 1.5), 'trumpet', p, .6, .8, 0, .45)
for p in ['F3', 'A3', 'C4']: n(bt(2, 1.5), 'trombone', p, .6, .75, 0, .5)
n(bt(2, 1.5), 'tuba_stac', 'F2', .5, .9); n(bt(2, 1.5), 'timpani', 'F2', .9, .85)
n(bt(2, 2.5), 'sus_cymbal', 'cresc', None, .5, 0, .45)

CH = {'F': ['F', 'A', 'C'], 'C7': ['C', 'E', 'G', 'Bb'], 'D7': ['D', 'F#', 'A', 'C'], 'G7': ['G', 'B', 'D', 'F'], 'Bb': ['Bb', 'D', 'F']}
ROOT = {'F': 'F2', 'C7': 'C2', 'D7': 'D2', 'G7': 'G1', 'Bb': 'Bb1'}
FIFTH = {'F': 'C2', 'C7': 'G1', 'D7': 'A1', 'G7': 'D2', 'Bb': 'F2'}
voicing = lambda ch, o: [f"{x}{o}" for x in CH[ch]]
def band_bar(t0, ch, soft=1.0, pan=0.0, full=True, gain=1.0):
    """one bar of the Charleston band starting at t0 (seconds)"""
    T = lambda k: t0 + k * B
    n(T(0), 'tuba_stac', ROOT[ch], .3, .85 * soft, pan - .05, .7 * gain)
    n(T(2), 'tuba_stac', FIFTH[ch], .3, .78 * soft, pan - .05, .7 * gain)
    for k in range(4):
        plucks.append((T(k), 'banjo', voicing(ch, 4)[:3], .28, (.75 if k % 2 else .55) * soft, .32 * gain, pan - .35))
    if full:
        for k in (1, 3): n(T(k), 'snare', 'on', None, .32, pan + .15, .55 * gain)
        for k in (0, 1.5):                                   # the Charleston figure
            for p in voicing(ch, 3)[:3]: n(T(k), 'trombone_stac', p, .2, .7, pan + .2, .42 * gain)
        for k in (1, 3):
            for p in voicing(ch, 4)[:2]: n(T(k), 'upright', p, .18, .5, pan + .3, .35 * gain)
MEL = {   # original tune: muted trumpet under the map, open trumpet + clarinet from the lesson on
    7:  [(0, 'A4', .75), (1.5, 'C5', .75), (2.5, 'D5', .4), (3, 'C5', .4), (3.5, 'A4', .4)],
    8:  [(0, 'F4', .75), (1.5, 'G4', .75), (2.5, 'A4', .4), (3, 'G4', .4), (3.5, 'F4', .4)],
    9:  [(0, 'F#4', .75), (1.5, 'A4', .75), (2.5, 'C5', .4), (3, 'D5', .4), (3.5, 'C5', .4)],
    10: [(0, 'A4', .75), (1.5, 'D5', 1.5), (3.5, 'C5', .4)],
    11: [(0, 'B4', .75), (1.5, 'D5', .75), (2.5, 'F5', .4), (3, 'D5', .4), (3.5, 'B4', .4)],
    12: [(0, 'G4', .75), (1.5, 'Bb4', .75), (2.5, 'C5', .4), (3, 'E5', .4), (3.5, 'G5', .4)],
    13: [(0, 'A5', .75), (1.5, 'F5', .75), (2.5, 'C5', .4), (3, 'D5', .4), (3.5, 'F5', .4)],
    14: [(0, 'F#5', .75), (1.5, 'D5', .75), (2.5, 'A4', .4), (3, 'C5', .4), (3.5, 'D5', .4)],
}

# ------------------------------------------------------------------ 2. the band, with its stops
P8 = ['F', 'F', 'D7', 'D7', 'G7', 'C7', 'F', 'D7']
first = bar_of(SEC[TL["secs"][1]["id"]]["t0"])                       # first story
last = bar_of(HIT.get("end_hit1", DUR - 4))
STOPS = []                                                         # (t0, t1) windows where the band is silent
if "stop_card" in HIT and "card" in SEC: STOPS.append((HIT["stop_card"], SEC["card"]["t1"]))
if "stop_btn" in HIT: STOPS.append((HIT["stop_btn"], HIT.get("end_hit1", DUR)))
silent = lambda t: any(a - .01 <= t < b - .01 for a, b in STOPS)
mel0 = first + 4
for bar in range(first, last):
    t0 = bt(bar)
    if silent(t0): continue
    k = (bar - first) % 8; ch = P8[k] if bar < last - 1 else 'C7'
    restart = bar == first or any(abs(t0 - b) < .02 for _, b in STOPS)
    band_bar(t0, ch, soft=.55 if restart else 1.0, full=not restart)
    if bar % 4 == 3:
        for kk in (2.5, 3, 3.5): n(bt(bar, kk), 'woodblock', None, None, .5, -.3, .45)
    if bar >= mel0:
        m = 7 + (bar - mel0) % 8; open_tp = ((bar - mel0) // 8) % 2 == 1
        for b_, p, d in MEL[m]:
            if silent(bt(bar, b_)): continue
            n(bt(bar, b_), 'trumpet' if open_tp else 'trumpet_mute', p, d * B, .8 if open_tp else .75, -.15, .75 if open_tp else .9)
            if open_tp: n(bt(bar, b_), 'clarinet', M(p) - 9, d * B, .6, .35, .5)
# glockenspiel pings on the map arcs, woodblocks under the repeat slips
for i, k in enumerate(k for k in HIT if k.startswith("arc_") or k == "sz"):
    n(HIT[k] + (0 if k == "sz" else .45), 'glockenspiel', ['A5', 'C6', 'E6', 'G6'][i % 4], .6, .7, .2, .55)
if "rep0" in HIT:
    for i in range(5): n(HIT['rep0'] + i * B, 'woodblock', None, None, .55 + .05 * (i % 2), .25, .5)
    n(HIT['rep0'] + 5 * B, 'bass_drum', None, None, .8, 0, .7)

# ------------------------------------------------------------------ 3. dead stop + timpani under the item card
if "stop_card" in HIT:
    TC = HIT["stop_card"]; NX = SEC["card"]["t1"]
    n(TC, 'tuba_stac', 'D2', .3, .9)
    for p in ['F#4', 'A4', 'D5']: n(TC, 'trumpet', p, .2, .85, 0, .5)
    for p in ['D3', 'F#3', 'C4']: n(TC, 'trombone_stac', p, .2, .8, 0, .5)
    n(TC, 'crash', None, None, .55, 0, .5)
    for k in range(10): n(TC + .9 + k * .05, 'timpani', 'A1', .06, .3 + k * .05, 0, .6)
    n(TC + 1.4, 'timpani', 'D2', 1.0, .85)
    n(NX - B, 'trumpet', 'C5', .45 * B, .75, -.15, .7); n(NX - .5 * B, 'trumpet', 'E5', .45 * B, .75, -.15, .7)
# the last story: one stab, then only the clock
if "stop_btn" in HIT:
    TB = HIT["stop_btn"]
    for p in ['E4', 'Bb4', 'C5']: n(TB, 'trumpet', p, .18, .85, 0, .5)
    n(TB, 'tuba_stac', 'C2', .25, .9); n(TB, 'snare', 'on', None, .6, 0, .5)
h1, h2 = HIT['end_hit1'], HIT['end_hit2']
for p in ['E4', 'Bb4', 'G5']: n(h1, 'trumpet', p, .16, .8, 0, .5)
for p in ['C3', 'Bb3', 'E4']: n(h1, 'trombone_stac', p, .2, .8, 0, .5)
n(h1, 'tuba_stac', 'C2', .2, .85); n(h1, 'snare', 'on', None, .6, 0, .5)
for p in ['A5', 'C6', 'F5']: n(h2, 'trumpet', p, 2.4, .9, 0, .5)
n(h2, 'clarinet', 'F5', 2.4, .7, .3, .5)
for p in ['F3', 'A3', 'C4', 'F4']: n(h2, 'trombone', p, 2.4, .8, 0, .45)
n(h2, 'tuba_stac', 'F2', .6, .9); n(h2, 'timpani', 'F2', 2.2, .9); n(h2, 'crash', None, None, .85, 0, .8)
for p in ['F4', 'A4', 'C5']: n(h2, 'upright', p, 1.5, .7, .3, .4)
EC = SEC['endcard']['t0']
for b_, p, d in [(0, 'C5', .5), (.5, 'A4', .5), (1, 'F4', .5), (1.5, 'A4', .5), (2, 'C5', 1.5), (4, 'F5', 4)]:
    n(EC + .2 + b_ * B, 'clarinet', p, d * B, .55, .2, .45)
for p in ['F3', 'A3', 'C4', 'E4']: n(EC + .2 + 4 * B, 'trombone', p, 4 * B, .45, 0, .3)
plucks.append((EC + .2 + 4 * B, 'banjo', ['F4', 'A4', 'C5', 'F5'], 1.2, .6, .22, -.35))

music = S.render(ev, dur=N / SR)
for t, pre, ps, d, v, g, pan in plucks:
    x = PL.strum(pre, ps, d, vel=v, spread=.012) if len(ps) > 1 else PL.pluck(pre, ps[0], d, v)
    add(music, x, t, g, pan)
music = S.room(music, size=.28, mix=.12)
if "stop_btn" in HIT:     # hard silence between the last stab and the end hits
    cut = int((HIT["stop_btn"] + .45) * SR); rel = int(.05 * SR)
    music[cut:cut + rel] *= np.linspace(1, 0, rel)[:, None]; music[cut + rel:int((h1 - .02) * SR)] = 0

# ------------------------------------------------------------------ foley + projector
fx = np.zeros((N, 2), np.float32)
auto_foley(fx, TL, {"rep0": 5, "deal0": 6})
bed = projector_bed(N); fx[:, 0] += bed; fx[:, 1] += bed * .95

# ------------------------------------------------------------------ announcer, ducking, master
vo = np.zeros((N, 2), np.float32)
for L in TL["lines"]:
    x, sr = sf.read(HERE / "voice" / "out" / f"{L['id']}.wav", dtype="float32")
    if x.ndim > 1: x = x.mean(1)
    add(vo, period_voice(soxr.resample(x, sr, SR)), L['t'], 1.0)
env = (np.abs(vo[:, 0]) > .02).astype(np.float32)
env = uniform_filter1d(maximum_filter1d(env, int(.18 * SR)), int(.12 * SR))
mus = music * (1 - .45 * env)[:, None]                       # duck the band under the voice
for c in range(2):
    y = bp(mus[:, c], 95, 7500, 2); y = y - .65 * lp(y, 150, 2)   # period band-limit
    mus[:, c] = np.tanh(y * 1.6) / 1.6
    fx[:, c] = hp(fx[:, c], 55, 2)
mix = mus * 1.2 + fx * .85 + vo * 1.05
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
(HERE / "out").mkdir(exist_ok=True)
sf.write(HERE / "out" / "mix.wav", mix[:int(DUR * SR)], SR)
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
vm = np.abs(vo[:, 0]) > .02
print("voice", round(rms_db(vo[vm, 0] * 1.05), 1), "dB | music under voice", round(rms_db(mus[vm, 0] * 1.2), 1), "| band alone", round(rms_db(mus[~vm, 0] * 1.2), 1))
print("voice should sit ~8-12 dB above the music under it; mux.sh normalises the whole film to -14 LUFS")

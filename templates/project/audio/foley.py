"""Shared foley + announcer treatment for both mix modes (band / record).

Foley is placed by HIT NAME CONVENTION (auto_foley), so a new scene gets sound just by naming its hits well:
  beams_on            carbon-arc strike            *_slam / slam_*   thump + paper slap
  stamp*              thump + paper slap           strip* / arc_*    telegraph ticker
  *ring*              grease-pencil squeak         deal0 / rep0      a shutter click per beat (count = slips)
  wipe_* push_* cut_* iris_* clock_wipe -> whoosh  flip_*            card flap
  blinds_*            12 quick flicks              count0..count1    flip-book flicks (odometer)
  stop_btn            clock ticks alone until iris_end
Anything special (wind, pouring, a 1 kHz test tone ...) is added by hand in the mix script after auto_foley().
"""
import numpy as np
from core.audio.sfx import SR, add, bp, lp, hp, noise, norm, env_exp, t_, whoosh, thump, click, compress, limit

def arc(v=1.0):
    d = .5; x = hp(noise(d), 2000) * env_exp(d, .006) + bp(noise(d), 3000, 9000) * env_exp(d, .12) * .25
    return norm(x) * v
def long_whoosh(d, v=1.0):
    tq = t_(d); out = np.zeros(len(tq)); nz = noise(d)
    for i in range(0, len(tq), 480):
        f = 400 + 2600 * (i / len(tq)) ** 1.6; hi = min(len(tq), i + 480)
        out[i:hi] = bp(nz[max(0, i - 2000):hi], f * .7, f * 1.4)[-(hi - i):]
    flutter = .55 + .45 * np.abs(np.sin(2 * np.pi * np.cumsum(3 + 9 * tq / d) / SR))
    return norm(out * flutter * (tq / d) ** 1.4) * v
def paper_slap(v=1.0):
    d = .25; return norm(bp(noise(d), 500, 6000) * env_exp(d, .03)) * v
def flap(v=1.0):
    d = .3; tq = t_(d); return norm(bp(noise(d), 800, 5000) * (np.abs(np.sin(2 * np.pi * 14 * tq)) ** 2) * env_exp(d, .1)) * v
def flick(v=1.0):   # one page of a flip-book
    d = .07; return norm(bp(noise(d), 1500, 7000) * env_exp(d, .015)) * v
def shutter(v=1.0):
    a = click(1.4, 1); out = np.zeros(int(.09 * SR)); out[:len(a)] += a[:len(out)]; b_ = click(1.1, .7)
    j = int(.045 * SR); out[j:j + len(b_)] += b_[:len(out) - j]; return norm(out) * v
def pencil_sq(d, v=1.0):   # grease pencil on celluloid: a scratchy squeak
    tq = t_(d); f = 1800 + 500 * np.sin(2 * np.pi * 7 * tq)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (.4 + .6 * (np.sin(2 * np.pi * 23 * tq) > 0))
    x = bp(noise(d), 1500, 6000) * .6 + tone * .25
    return norm(x * np.minimum(1, np.minimum(tq / .02, (d - tq) / .03))) * v
def lead(d, v=1.0):        # soft lead on paper
    x = bp(noise(d), 2500, 9000) * (.6 + .4 * np.abs(np.sin(2 * np.pi * 31 * t_(d))))
    return norm(x * np.minimum(1, np.minimum(t_(d) / .02, (d - t_(d)) / .02))) * v
def ticker(d, v=1.0):      # telegraph sounder clicking along the route
    out = np.zeros(int(d * SR)); r = np.random.default_rng(3); t = 0
    while t < d - .03:
        c = click(1.8 + r.random() * .3, 1); i = int(t * SR); out[i:i + len(c)] += c[:len(out) - i]; t += r.choice([.045, .045, .09, .135])
    return norm(bp(out, 900, 6000)) * v


def period_voice(x):
    """1920s announcer: horn loudspeaker band (260-3700 Hz) + presence peak, carbon-mic grit, wow & flutter, small studio."""
    x = hp(x, 260, 2); x = lp(x, 3700, 3)
    x = x + .55 * bp(x, 1500, 2300, 2)                 # horn-loudspeaker presence peak (~+4 dB)
    x = np.tanh(norm(x) * 2.0) / np.tanh(2.0)          # carbon-mic / amplifier grit
    x = compress(x, thr=.3, ratio=4)
    # wow & flutter: a slowly wandering read head
    k = np.arange(len(x), dtype=np.float64)
    dev = .0022 * np.sin(2 * np.pi * .55 * k / SR) + .0007 * np.sin(2 * np.pi * 6.3 * k / SR)
    pos = np.clip(k + np.cumsum(dev) * 1.0, 0, len(x) - 1)
    x = np.interp(pos, k, x).astype(np.float32)
    # a small hard-walled studio: two early reflections
    y = x.copy(); d1, d2 = int(.031 * SR), int(.067 * SR)
    y[d1:] += x[:-d1] * .16; y[d2:] += lp(x, 2500)[:-d2] * .09
    return norm(y) * .9


def auto_foley(fx, TL, n_slips=None):
    HIT, SEC, B = TL["hits"], {s["id"]: s for s in TL["secs"]}, TL["beat"]
    n_slips = n_slips or {}
    for k, v in HIT.items():
        if k == "beams_on": add(fx, arc(.6), v, .9)
        elif k.endswith("_slam") or k.startswith("slam_"): add(fx, thump(1, 80), v, .7); add(fx, paper_slap(.7), v, .6)
        elif k.startswith("stamp"): add(fx, thump(.9, 70), v, .7); add(fx, paper_slap(.7), v, .6, .3)
        elif k.startswith("strip") or k.startswith("arc_"): add(fx, ticker(.45, .7), v, .3, -.1)
        elif "ring" in k: add(fx, pencil_sq(.3, .7), v, .32, .1)
        elif k in ("deal0", "rep0"):
            for i in range(n_slips.get(k, 6)): add(fx, shutter(.7), v + i * B, .38, (i % 3 - 1) * .3)
        elif k.startswith(("wipe_", "push_", "cut_", "iris_")) or k == "clock_wipe": add(fx, whoosh(.32, .7), v - .16, .5, -.2)
        elif k.startswith("flip_"): add(fx, flap(.8), v - .14, .6, .2)
        elif k.startswith("blinds_"):
            for i in range(12): add(fx, flick(.6), v + .02 + i * .02, .22, -.2 + i * .03)
        elif k == "paper_fly" and "paper_slam" in HIT: add(fx, long_whoosh(HIT["paper_slam"] - v, .8), v, .7)
    if "count0" in HIT and "count1" in HIT:
        for i in range(20): add(fx, flick(.6), HIT["count0"] + (HIT["count1"] - HIT["count0"]) * (i / 20) ** .7, .25, .2)
    if "stop_btn" in HIT:          # after the last stop only the clock ticks
        end = HIT.get("iris_end", HIT["stop_btn"] + 3)
        for i in range(int((end - HIT["stop_btn"] - .3) / .5)): add(fx, click(1.6 if i % 2 else 1.3, .8), HIT["stop_btn"] + .5 + i * .5, .35, .1)
    if "endcard" in SEC: add(fx, whoosh(.3, .5), SEC["endcard"]["t0"] - .25, .35)


def projector_bed(N):
    """the projector: shutter claw at 24 fps + motor rumble + hiss, always on, quiet"""
    tt = t_(N / SR); claw = (np.abs(np.sin(np.pi * 24 * tt)) ** 18)
    bed = bp(noise(N / SR), 1500, 5000) * claw * .5 + hp(lp(noise(N / SR), 260), 110) * .12 + hp(noise(N / SR), 5000) * .08
    return norm(bed) * .05 * np.minimum(1, tt / .3)

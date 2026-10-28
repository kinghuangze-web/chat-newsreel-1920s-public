"""Sample-free instrument voices for the band score.

The library's score expects real instrument samples (VSCO 2 CE / VCSL, ~670 MB from GitHub releases).
On this machine github.com and objects.githubusercontent.com are unreachable (only raw.githubusercontent.com
answers), so the packs cannot be fetched. This module synthesises every voice with numpy instead and is
patched over `core.audio.sampler.render`, which lets `audio/mix_band.py` run unchanged.

The master chain in mix_band.py band-limits to 95-7500 Hz and saturates, so what comes out still reads as a
1920s 78 rpm band rather than a synthesiser. Nothing here is sampled; nothing here is downloaded.
"""
import numpy as np
from core.audio.sfx import SR, add, bp, lp, hp, noise, crash, thump, clack, ding
from core.audio import pluck as PL

# the sampled instruments are level-calibrated per library; these synth voices are not, so the whole
# synth bus is trimmed to sit ~9 dB under the announcer (mix_band.py expects that headroom)
TRIM = .34

# instrument -> (family, lowpass cutoff Hz, level)
FAM = {
    'trumpet': ('brass', 1500, 1.00), 'trumpet_stac': ('brass', 1500, 1.00),
    'trumpet_mute': ('brass', 900, .85),
    'trombone': ('brass', 900, 1.00), 'trombone_stac': ('brass', 900, 1.00),
    'tuba': ('brass', 560, 1.10), 'tuba_stac': ('brass', 560, 1.10),
    'clarinet': ('reed', 1300, .80), 'clarinet_stac': ('reed', 1300, .80),
    'upright': ('piano', 0, 1.00),
    'glockenspiel': ('bell', 0, .85),
    'timpani': ('timpani', 0, 1.10), 'snare': ('snare', 0, .70),
    'bass_drum': ('kick', 0, 1.00), 'crash': ('crash', 0, .55),
    'sus_cymbal': ('cymbal', 0, .50), 'woodblock': ('wood', 0, .60),
}


def _brass(f0, d, vel, cut):
    n = max(1, int(d * SR)); t = np.arange(n) / SR
    vib = 1 + .0035 * np.sin(2 * np.pi * 5.4 * t) * np.clip((t - .18) / .25, 0, 1)
    sco = 1 + .010 * np.exp(-t / .045)                      # the little scoop into the note
    ph = 2 * np.pi * np.cumsum(f0 * vib * sco) / SR
    x = 2 * (ph / (2 * np.pi) % 1.0) - 1                    # saw
    x = lp(x, cut * (.55 + .45 * vel), 2)
    env = np.clip(t / .030, 0, 1) * np.clip((d - t) / .090, 0, 1)
    x = np.tanh(x * env * (2.4 + 1.8 * vel))
    return x * .42


def _reed(f0, d, vel, cut):
    n = max(1, int(d * SR)); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f0 * (1 + .004 * np.sin(2 * np.pi * 5.0 * t))) / SR
    x = np.zeros(n)
    for h in (1, 3, 5, 7, 9, 11, 13):
        if h * f0 > 6000: break
        x += np.sin(ph * h) / h
    x = lp(x, cut * (.50 + .50 * vel), 2)
    env = np.clip(t / .050, 0, 1) * np.clip((d - t) / .100, 0, 1)
    return x * env * .55


def _timpani(f0, d, vel):
    n = max(1, int(d * SR)); t = np.arange(n) / SR
    f = f0 * (1 + .05 * np.exp(-t / .06))                    # the head drops a little as it settles
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.0)
    x += .40 * lp(noise(d), 380) * np.exp(-t / .05)          # the mallet
    return x * .55 * (0.5 + vel)


def _snare(d, vel):
    n = max(1, int(d * SR)); t = np.arange(n) / SR
    x = bp(noise(d), 1200, 6500) * np.exp(-t / .10)
    x += .30 * np.sin(2 * np.pi * 185 * t) * np.exp(-t / .05)
    return x * .55 * (0.4 + vel)


def _cymbal(d, vel):
    n = max(1, int(d * SR)); t = np.arange(n) / SR
    return hp(noise(d), 3000) * np.exp(-t / (d * .45)) * .35 * (0.4 + vel)


def _wood(d, vel):
    n = max(1, int(d * SR)); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 1180 * t) * np.exp(-t / .030)
    x += .50 * bp(noise(d), 1800, 5200) * np.exp(-t / .012)
    return x * .45 * (0.5 + vel)


def voice(inst, midi, dur, vel):
    fam, cut, g = FAM.get(inst, ('brass', 1200, 1.0))
    f0 = 440.0 * 2 ** ((midi - 69) / 12) if midi is not None else 0.0
    d = float(dur) if dur else (2.4 if fam in ('crash', 'cymbal', 'timpani') else .5)
    vel = float(vel if vel is not None else .7)
    if fam == 'brass':      x = _brass(f0, d, vel, cut)
    elif fam == 'reed':     x = _reed(f0, d, vel, cut)
    elif fam == 'piano':    x = PL.pluck('acoustic_guitar', midi, d, vel)
    elif fam == 'bell':     x = PL.pluck('music_box', midi, d, vel)
    elif fam == 'timpani':  x = _timpani(f0, d, vel)
    elif fam == 'snare':    x = _snare(d, vel)
    elif fam == 'kick':     x = thump(vel, 62)
    elif fam == 'crash':    x = crash(vel)
    elif fam == 'cymbal':   x = _cymbal(d, vel)
    elif fam == 'wood':     x = _wood(d, vel)
    else:                   x = _brass(f0, d, vel, cut)
    return np.asarray(x, dtype=np.float32) * g


def render(events, dur=None, master=True):
    """Drop-in replacement for sampler.render: same event tuples, synthesised voices."""
    n = max(1, int(round(float(dur) * SR)))
    out = np.zeros((n, 2), np.float32)
    import core.audio.sampler as S
    pitched = ('brass', 'reed', 'piano', 'bell', 'timpani')
    for e in events:
        t, inst, p, d, v, pan, g = e
        # for unpitched instruments the third field is a variant name ('roll', 'cresc', ...), not a pitch
        if FAM.get(inst, ('brass',))[0] in pitched and isinstance(p, str):
            try:
                midi = S.midi(p)
            except ValueError:
                midi = None
        elif isinstance(p, (int, float)):
            midi = p
        else:
            midi = None
        x = voice(inst, midi, d, v)
        if len(x):
            add(out, x, float(t), float(g) * TRIM, float(pan))
    return out

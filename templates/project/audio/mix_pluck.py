#!/usr/bin/env python3
"""BAND mode without the sample libraries: same score as audio/mix_band.py, synthesised voices.

`audio/mix_band.py` needs VSCO 2 CE + VCSL (~670 MB) from GitHub releases, which this machine cannot reach.
This entry point patches core.audio.sampler.render with audio/synth.py (numpy only, no downloads) and then
runs the original score unchanged, so the arrangement, the ducking, the foley and the mastering all stay
exactly as authored.
    $LIB/.venv/bin/python audio/mix_pluck.py        (set LIB=... or let it find the library)
"""
import os, runpy, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
LIB = Path(os.environ.get("LIB") or next(
    p for p in [HERE.parents[1], HERE.parents[2], Path.home() / "lemo-opuscar", Path("/data/lemo-opuscar")]
    if (p / "core" / "audio").exists()))
sys.path.insert(0, str(LIB))
sys.path.insert(0, str(HERE / "audio"))

from core.audio import sampler as S
import synth
S.render = synth.render

# the banjo/strum parts are added by the score itself, so trim them with the same factor
from core.audio import pluck as PL
_strum, _pluck = PL.strum, PL.pluck
PL.strum = lambda *a, **k: _strum(*a, **k) * synth.TRIM
PL.pluck = lambda *a, **k: _pluck(*a, **k) * synth.TRIM

runpy.run_path(str(HERE / "audio" / "mix_band.py"), run_name="__main__")

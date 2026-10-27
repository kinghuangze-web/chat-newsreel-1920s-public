#!/usr/bin/env python3
"""The film's clock -> timeline.json. Run AFTER the voice is generated (needs voice/out/dur.json).

Everything that moves is placed on the music grid here, and only here:
  SECS  : section order (id = scene name) and start bar      -> secs[] (t0, t1)
  HITS  : named moments (cuts, slams, stamps, rings, stops) -> hits{}
  LINES : announcer lines (id from voice/lines.json) + start -> lines[]
  TAGS  : top-left place/time cards                           -> tags[]
Then it prints a report: line overlaps, lines spilling past their section, over-long subtitles, short tag holds.
FIX EVERY WARNING before rendering. Re-run after ANY change to voice/lines.json (durations change).

Two clocks:
  MODE = "band"   : our own generated score at BPM (audio/mix_band.py). Bar 0 starts at t = 0.
  MODE = "record" : a real record (audio/mix_record.py). BEAT = measured loop length / beats (tools/measure_bgm.py),
                    M0 = film time the needle drops, G0 = M0 + offset of the first downbeat inside the recording.
"""
import json, re
from pathlib import Path
HERE = Path(__file__).resolve().parent.parent

MODE = "band"
if MODE == "band":
    BPM = 200; BEAT = 60 / BPM; G0 = 0.0; M0 = 0.0
else:                                   # example values from EP.03 (CCTV weather-forecast record): 128 beats in 67.42 s
    BEAT = 67.42 / 128; M0 = 1.0; G0 = M0 + 0.16
BAR = 4 * BEAT
b = lambda bars: round(G0 + bars * BAR, 4)          # film time of a bar position (quarter bars = beats)

SECS = [("logo", 0), ("paper", 3), ("map", 8), ("card", 14), ("tele", 16.5), ("grid", 21.5), ("quote", 24.5),
        ("repeat", 26.5), ("weather", 30), ("clock", 34), ("endlogo", 37), ("endcard", 40)]
END_BAR = 44
HITS = {"beams_on": .15, "logo_iris": b(2.5),
  "paper_fly": b(3), "paper_slam": b(4), "paper_punch": b(6), "quote_ring": b(6) + .35,
  "wipe_map": b(8), "sz": b(8) + .3, "count0": b(8.5), "count1": b(10.5), "arc_1": b(11), "arc_2": b(11.5), "arc_3": b(12), "map_push": b(13),
  "blinds_card": b(14), "stop_card": b(14),
  "iris_tele": b(16.5), "strip1": b(16.75), "strip2": b(17.5), "strip3": b(18.25), "stamp1": b(19.25), "stamp2": b(20.25),
  "cut_grid": b(21.5), "deal0": b(21.75),
  "slam_quote": b(24.5), "quote_ring2": b(25.25),
  "cut_repeat": b(26.5), "rep0": b(26.75),
  "flip_weather": b(30), "wx1": b(30.5), "wx2": b(31), "wx3": b(31.5), "wx4": b(32),
  "clock_wipe": b(34), "stop_btn": b(34), "clock_ring": b(35),
  "iris_end": b(37), "end_hit1": b(37), "end_hit2": b(37) + 1.5 * BEAT, "endcard": b(40)}
LINES = [("L1", b(3.4)), ("L2", b(8.35)), ("L3", b(11.1)), ("L4", b(16.7)), ("L5", b(19.0)), ("L6", b(21.75)),
         ("L7", b(24.6)), ("L8", b(26.8)), ("L9", b(30.25)), ("L10", b(34.4))]
TAGS = [("paper", b(4) + .2, b(7.6), "GITHUB · JAN. 15, 08:00", "开源新作"),
        ("map", b(8) + .3, b(10.8), "SHENZHEN · JAN. 17", "周末线下"),
        ("tele", b(16.5) + .4, b(19.2), "SERVER · 23:40", "深夜机房"),
        ("repeat", b(26.5) + .3, b(29.2), "DEMO GROUP · 23:55", "全群复读"),
        ("weather", b(30) + .3, b(33.4), "NMC · JAN. 15, 18:00", "中央气象台")]

DUR = b(END_BAR)
secs = [{"id": k, "t0": b(a), "t1": b(SECS[i + 1][1]) if i + 1 < len(SECS) else DUR, "bar0": a} for i, (k, a) in enumerate(SECS)]
meta = {L["id"]: L for L in json.loads((HERE / "voice" / "lines.json").read_text())}
tl = {"mode": MODE, "bpm": round(60 / BEAT, 3), "beat": BEAT, "bar": BAR, "g0": G0, "m0": M0, "dur": DUR, "secs": secs,
      "hits": {k: round(v, 4) for k, v in HITS.items()},
      "lines": [{"id": i, "t": round(t, 3), "zh": meta[i]["zh"], "en": meta[i]["en"]} for i, t in LINES],
      "tags": [{"sec": s, "t0": round(a, 3), "t1": round(z, 3), "en": en, "zh": zh} for s, a, z, en, zh in TAGS]}
(HERE / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1))

# ------------------------------------------------------------------ report
warn = 0
def W(*a):
    global warn; warn += 1; print("  !!", *a)
dpath = HERE / "voice" / "out" / "dur.json"
dur = json.loads(dpath.read_text()) if dpath.exists() else {}
if not dur: W("voice/out/dur.json missing: generate the voice first (python3 voice/make.py && tts)")
cjk = lambda s: len(re.findall(r"[\u3400-\u9fff\uff00-\uffef\u3000-\u303f]", s))
lat = lambda s: len(re.findall(r"[A-Za-z0-9]", s))
print(f"mode {MODE}  bpm {60 / BEAT:.2f}  bar {BAR:.3f}s  dur {DUR:.2f}s")
for k, (i, t) in enumerate(LINES):
    d = dur.get(i, 0); end = t + d; nx = LINES[k + 1][1] if k + 1 < len(LINES) else DUR
    sec = [s for s in secs if s["t0"] <= t + 1e-6][-1]
    flag = []
    if end > nx - .15: flag.append(f"OVERLAP next line by {end - nx + .15:.2f}s")
    if end > sec["t1"] + .4: flag.append(f"SPILLS {end - sec['t1']:.2f}s past '{sec['id']}'")
    z = meta[i]["zh"]
    if cjk(z) + lat(z) / 2 > 28: flag.append(f"zh subtitle too long ({cjk(z)} CJK) - one line only")
    if len(meta[i]["en"]) > 64: flag.append(f"en subtitle too long ({len(meta[i]['en'])} chars)")
    print(f"{i:>4} {t:7.2f} -> {end:6.2f}  [{sec['id']}]  {z}")
    for f in flag: W(i, f)
for s, a, z, en, zh in TAGS:
    need = max(cjk(zh) / 4.5 + lat(zh) / 15, lat(en) / 15) + 1.5 + .25
    if z - a < need: W(f"tag '{s}' holds {z - a:.2f}s < {need:.2f}s reading time")
    sec = next(x for x in secs if x["id"] == s)
    if a < sec["t0"] or z > sec["t1"]: W(f"tag '{s}' runs outside its section")
for s in secs:
    hs = [k for k, v in HITS.items() if s["t0"] <= v < s["t1"]]
    if not hs and s["id"] not in ("endcard",): W(f"section '{s['id']}' has no hits - nothing lands on the beat")
print("OK" if not warn else f"{warn} warning(s)")

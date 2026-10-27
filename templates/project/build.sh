#!/bin/sh
# One episode, end to end.   LIB=~/lemo-opuscar sh build.sh [step]
#   steps: voice | timeline | page | stills | video | mix | mux | small | all (default)
# Order matters: voice -> timeline (needs voice durations) -> page -> STILLS (look at them!) -> video -> mix -> mux -> small.
# Heavy steps (video ~5 min, mux ~15 min on a CPU box) must not run at the same time.
set -e
P=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to your lemo-opuscar clone (git clone https://github.com/lemomo-ai/lemo-opuscar)"; exit 1; }
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
MIX=${MIX:-band}                 # band = our own score (audio/mix_band.py) | record = audio/bgm_src.wav (audio/mix_record.py)
NAME=${NAME:-$(basename "$P")}
STEP=${1:-all}
[ -n "$PLAYWRIGHT_CHROME" ] || { C=$(command -v chromium || command -v chromium-browser || true); [ -n "$C" ] && export PLAYWRIGHT_CHROME=$(readlink -f "$C"); }
run() { [ "$STEP" = all ] || [ "$STEP" = "$1" ]; }

[ -s "$P/fonts/NotoSansSC.ttf" ] || sh "$P/tools/fetch_fonts.sh"
if run voice; then
  python3 "$P/voice/make.py"
  (cd "$LIB" && "$PY" core/tts/tts_zh.py "$P/voice/tts_lines.json" "$P/voice/out")
fi
if run timeline || run voice; then python3 "$P/tools/timeline.py"; fi
if run page || run stills || [ "$STEP" = all ]; then
  cat "$P"/parts/0_head.html "$P"/parts/a_content.js "$P"/parts/a_helpers.js "$P"/parts/b_lib.js "$P"/parts/b_scenes.js \
      "$P"/parts/c_compose.js "$P"/parts/d_type.js "$P"/parts/e_tail.js > "$P/index.html"
fi
if run stills; then
  # 2-3 stills per section: just after each cut, on every slam/stamp/ring, and mid-line. Then LOOK at the sheet.
  T=$(python3 -c "
import json; tl=json.load(open('$P/timeline.json')); ts=set()
for s in tl['secs']: ts |= {round(s['t0']+.35,2), round((s['t0']+s['t1'])/2,2), round(s['t1']-.25,2)}
for k,v in tl['hits'].items():
    if any(w in k for w in ('slam','stamp','ring','deal','rep','wx')): ts.add(round(v+.45,2))
print(' '.join(str(t) for t in sorted(ts) if t < tl['dur']))")
  rm -rf "$P/stills"; mkdir -p "$P/stills"
  (cd "$LIB" && node core/render/still.mjs "$P" $T --out "$P/stills" --prefix s_ >/dev/null)
  "$PY" "$LIB/core/render/sheet.py" "$P/stills/_sheet.jpg" $(ls "$P"/stills/s_*.jpg | sort -t_ -k2 -n) --cols 5 --w 384
  echo "contact sheet: $P/stills/_sheet.jpg  <- check every frame against references/qc-checklist.md before rendering"
fi
if run video; then (cd "$LIB" && node core/render/video.mjs "$P" --fps 24 --workers 4 --out "$P/out/video.mp4"); fi
if run mix; then "$PY" "$P/audio/mix_$MIX.py"; fi
if run mux; then (cd "$LIB" && sh core/render/mux.sh "$P/out/video.mp4" "$P/out/mix.wav" "$P/out/$NAME-full.mp4" 24 7); fi
if run small; then
  ffmpeg -y -loglevel error -i "$P/out/$NAME-full.mp4" -vf scale=1280:-2 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 160k -movflags +faststart "$P/out/$NAME.mp4"
  ls -la "$P/out/$NAME.mp4"
fi

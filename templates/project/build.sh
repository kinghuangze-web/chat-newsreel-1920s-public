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
# Windows: node/ffmpeg are native binaries and cannot read MSYS paths like /d/work/x
WP="$P"; command -v cygpath >/dev/null 2>&1 && WP=$(cygpath -w "$P")
MIX=${MIX:-band}                 # band = our own score (audio/mix_band.py) | record = audio/bgm_src.wav (audio/mix_record.py)
SYNTH=${SYNTH:-auto}             # auto = real samples when core/audio/instruments/index.json exists,
                                 # otherwise synthesised voices (audio/mix_pluck.py, no downloads).
                                 # 0 = force real samples, 1 = force synth.
NAME=${NAME:-$(basename "$P")}
STEP=${1:-all}
[ -n "$PLAYWRIGHT_CHROME" ] || { C=$(command -v chromium || command -v chromium-browser || true); [ -n "$C" ] && export PLAYWRIGHT_CHROME=$(readlink -f "$C"); }
run() { [ "$STEP" = all ] || [ "$STEP" = "$1" ]; }

[ -s "$P/fonts/NotoSansSC.ttf" ] || sh "$P/tools/fetch_fonts.sh"
if run voice; then
  "$PY" "$P/voice/make.py"
  (cd "$LIB" && "$PY" core/tts/tts_zh.py "$P/voice/tts_lines.json" "$P/voice/out")
fi
if run timeline || run voice; then "$PY" "$P/tools/timeline.py"; fi
if run page || run stills || [ "$STEP" = all ]; then
  cat "$P"/parts/0_head.html "$P"/parts/a_content.js "$P"/parts/a_helpers.js "$P"/parts/b_lib.js "$P"/parts/b_scenes.js \
      "$P"/parts/c_compose.js "$P"/parts/d_type.js "$P"/parts/e_tail.js > "$P/index.html"
fi
if run stills; then
  # 2-3 stills per section: just after each cut, on every slam/stamp/ring, and mid-line. Then LOOK at the sheet.
  T=$("$PY" -c "
import json; tl=json.load(open(r'$WP/timeline.json')); ts=set()
for s in tl['secs']: ts |= {round(s['t0']+.35,2), round((s['t0']+s['t1'])/2,2), round(s['t1']-.25,2)}
for k,v in tl['hits'].items():
    if any(w in k for w in ('slam','stamp','ring','deal','rep','wx')): ts.add(round(v+.45,2))
print(' '.join(str(t) for t in sorted(ts) if t < tl['dur']))")
  rm -rf "$P/stills"; mkdir -p "$P/stills"
  (cd "$LIB" && node core/render/still.mjs "$WP" $T --out "$WP/stills" --prefix s_ >/dev/null)
  "$PY" "$LIB/core/render/sheet.py" "$WP/stills/_sheet.jpg" $(ls "$P"/stills/s_*.jpg | sort -t_ -k2 -n) --cols 5 --w 384
  echo "contact sheet: $P/stills/_sheet.jpg  <- check every frame against references/qc-checklist.md before rendering"
fi
if run video; then (cd "$LIB" && node core/render/video.mjs "$WP" --fps 24 --workers 4 --out "$WP/out/video.mp4"); fi
if run mix; then
  ls "$P"/voice/out/L*.wav >/dev/null 2>&1 || {
    echo "voice/out has no L*.wav: the mix needs the narration. run 'LIB=... sh build.sh voice' first."; exit 1; }
  M="$P/audio/mix_$MIX.py"
  if [ "$MIX" = band ] && [ -f "$P/audio/mix_pluck.py" ]; then
    case "$SYNTH" in
      0) : ;;                                                              # force real samples
      1) M="$P/audio/mix_pluck.py" ;;                                      # force synth
      *) [ -f "$LIB/core/audio/instruments/index.json" ] || M="$P/audio/mix_pluck.py" ;;
    esac
  fi
  "$PY" "$M"
fi
if run mux; then (cd "$LIB" && sh core/render/mux.sh "$WP/out/video.mp4" "$WP/out/mix.wav" "$WP/out/$NAME-full.mp4" 24 7); fi
if run small; then
  ffmpeg -y -loglevel error -i "$WP/out/$NAME-full.mp4" -vf scale=1280:-2 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 160k -movflags +faststart "$WP/out/$NAME.mp4"
  ls -la "$P/out/$NAME.mp4"
fi

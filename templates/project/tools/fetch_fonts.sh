#!/bin/sh
# Download the four OFL fonts the newsreel uses into fonts/ (skips files already there). Needs internet.
#   Limelight (ident / titles), Oswald (EN captions), Noto Sans SC + Noto Serif SC (Chinese)  — all SIL OFL 1.1
set -e
D=$(cd "$(dirname "$0")/.." && pwd)/fonts; mkdir -p "$D"
GF=https://raw.githubusercontent.com/google/fonts/main/ofl
get() { [ -s "$D/$1" ] || { echo "fetch $1"; curl -fsSL -o "$D/$1.part" "$GF/$2" && mv "$D/$1.part" "$D/$1"; }; }
get Limelight.ttf limelight/Limelight-Regular.ttf
get Oswald.ttf 'oswald/Oswald%5Bwght%5D.ttf'
get NotoSansSC.ttf 'notosanssc/NotoSansSC%5Bwght%5D.ttf'
get NotoSerifSC.ttf 'notoserifsc/NotoSerifSC%5Bwght%5D.ttf'
ls -la "$D"

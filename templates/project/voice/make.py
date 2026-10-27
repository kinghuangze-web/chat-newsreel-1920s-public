#!/usr/bin/env python3
"""voice/lines.json -> voice/tts_lines.json for core/tts/tts_zh.py (edge-tts, needs internet).
Announcer: zh-CN-YunjianNeural, rate +22%, pitch +6Hz (fast, bright 1920s newsreel delivery).
Optional "say" in lines.json = what is actually spoken (numbers/English written as read, e.g. "示例成员丙" -> "示例成员丙",
"DemoUser" -> "德莫"); the subtitle always shows "zh". Then:
  cd $LIB && .venv/bin/python core/tts/tts_zh.py <project>/voice/tts_lines.json <project>/voice/out
"""
import json
from pathlib import Path
H = Path(__file__).parent
L = json.load(open(H / "lines.json"))
out = [{"id": x["id"], "text": x["zh"], "say": x.get("say", x["zh"]), "voice": "zh-CN-YunjianNeural", "rate": "+22%", "pitch": "+6Hz"} for x in L]
json.dump(out, open(H / "tts_lines.json", "w"), ensure_ascii=False, indent=1)
print(len(out), "lines ->", H / "tts_lines.json")

#!/usr/bin/env python3
"""Verify that every quote and name on screen really is in the chat log.   python3 tools/check_quotes.py work/chat.txt

Checks parts/a_content.js (via node) + voice/lines.json:
  - every slip / quote / strip / repeat text appears VERBATIM in some message (spaces, case and ，。！？ ignored)
  - every attributed name ("who") is a real sender
  - the repeat count on the stamp = distinct people who actually sent that line
  - prints narration lines for a manual read (narration may paraphrase, but numbers/names in it must match the log)
Exit 1 if anything is not found. A paraphrase on a slip is a bug: slips and quote boxes are the group's own words.
"""
import json, re, subprocess, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent.parent
lines = open(sys.argv[1], encoding="utf-8").read().splitlines()
RX = re.compile(r"^\[(.*?)\] (.*?): (.*)$")
msgs = [m.groups() for l in lines if (m := RX.match(l))]
senders = {w for _, w, _ in msgs}
norm = lambda s: re.sub(r"[\s，。！？!?,.、~～「」“”\"'…]+", "", s).lower()
corpus = [(w, norm(x)) for _, w, x in msgs]
js = (HERE / "parts" / "a_content.js").read_text()
C = json.loads(subprocess.check_output(["node", "-e", js + "\nprocess.stdout.write(JSON.stringify(CONTENT))"]))
bad = 0
def quote(txt, where):
    global bad
    k = norm(re.sub(r"\s*STOP\s*$", "", txt))
    who = sorted({w for w, x in corpus if k and k in x})
    print(("  ok " if who else "  !! NOT IN LOG ") + f"[{where}] {txt}" + (f"   <- {', '.join(who[:4])}" if who else ""))
    bad += not who
    return who
def name(n, where):
    global bad
    n = n.split(" · ")[0].strip()
    ok = n in senders or any(n in s for s in senders)
    if not ok: print(f"  !! name not a sender [{where}] {n}"); bad += 1
print("quotes:")
for s, w in C.get("grid", {}).get("slips", []): quote(s, "grid"); name(w, "grid")
if "quote" in C: quote(C["quote"]["text"], "quote"); name(C["quote"]["who"], "quote")
if "clock" in C: quote(C["clock"]["text"], "clock"); name(C["clock"]["who"], "clock")
for s in C.get("tele", {}).get("strips", []): quote(s, "tele")
if "paper" in C: quote("".join(C["paper"]["quote"]), "paper"); name(C["paper"]["quote_by"].replace("——", "").strip(), "paper")
if "repeat" in C:
    who = quote(C["repeat"]["text"], "repeat")
    for n, _ in C["repeat"]["who"]: name(n, "repeat")
    m = re.search(r"(\d+)", C["repeat"]["stamp"][0])
    if m and int(m.group(1)) != len(who): print(f"  !! repeat stamp says {m.group(1)}, log has {len(who)} people"); bad += 1
print("narration (read against the log; numbers and names must match):")
for L in json.loads((HERE / "voice" / "lines.json").read_text()): print(f"  {L['id']}: {L['zh']}")
print("ALL FOUND" if not bad else f"{bad} problem(s)"); sys.exit(1 if bad else 0)

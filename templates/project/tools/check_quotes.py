#!/usr/bin/env python3
"""Verify that every quote and name on screen really is in the chat log.
    python3 tools/check_quotes.py work/chat.txt

Reads parts/a_content.js (through node) and voice/lines.json.

Two modes, picked automatically:

1. **Registry mode** — if `CONTENT.quotes` is a non-empty array, every entry is
   checked and nothing else is scanned. Use it when you want exact control:

       quotes: [
         { text: '这台机器又冒烟了', who: '阿甲', where: 'paper.quote' },
         { text: '明天再说吧',       who: '小乙', where: 'gift.slips' },
       ]

2. **Sweep mode** — no registry. Every string wrapped in 「」 anywhere in
   CONTENT is checked. This is the safety net: add a new prop, forget to
   register it, and the sweep still catches a paraphrased quote.

Either way: a paraphrase is a bug. Slips, quote boxes and stamp text are the
group's own words, copied character for character — typos, homophones and
emoji included. Normalisation ignores only spaces, case and ，。！？!?,.、~～「」""''…

Exit 1 if anything is not found. A silent pass is the failure mode to avoid:
if neither mode finds any quote at all, that is reported as a problem too.
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
seen = set()


def quote(txt, where):
    global bad
    k = norm(re.sub(r"\s*STOP\s*$", "", txt))
    if not k or (k, where) in seen:
        return set()
    seen.add((k, where))
    who = sorted({w for w, x in corpus if k in x})
    print(("  ok " if who else "  !! NOT IN LOG ") + f"[{where}] {txt}" + (f"   <- {', '.join(who[:4])}" if who else ""))
    bad += not who
    return set(who)


def name(n, where):
    global bad
    n = (n or "").split(" · ")[0].split("——")[-1].strip()
    if not n:
        return
    ok = n in senders or any(n in s for s in senders)
    print(("  ok " if ok else "  !! name not a sender ") + f"[{where}] {n}")
    bad += not ok


# 「」 around metadata is not a quote from the group: skip these subtrees in sweep mode
SKIP = ("credits", "show", "weather", "quotes")
# a slip is often printed without 「」 (the paper itself is the quote), so sweep also trusts key names
QKEY = re.compile(r"(slips?|quote[a-z_]*|note|text)$", re.I)
WKEY = re.compile(r"(who|by)$", re.I)
WHOISH = re.compile(r"^.{0,24}·\s*\d{1,2}:\d{2}$")
TIMEISH = re.compile(r"^\d{1,2}:\d{2}$")
CJK = re.compile(r"[\u4e00-\u9fff]")


def walk(o, path=""):
    """Every string in CONTENT, with its dotted path. Lists of strings are joined first
    so that a quote split across lines — quote: ['「一晚上', '三百颗星」'] — stays whole."""
    if isinstance(o, dict):
        for k, v in o.items():
            yield from walk(v, f"{path}.{k}" if path else k)
    elif isinstance(o, list):
        # join only when a 「…」 is split across elements; a [text, who] pair must stay separate
        if o and all(isinstance(x, str) for x in o) and any("「" in x for x in o):
            yield path, "".join(o)
        else:
            for i, v in enumerate(o):
                yield from walk(v, f"{path}[{i}]")
    elif isinstance(o, str):
        yield path, o


def quoted(o):
    """Sweep helper: skip metadata subtrees, keep everything that could be a slip or quote box."""
    for path, s in walk(o):
        if path.split("[")[0].split(".")[0] in SKIP:
            continue
        yield path, s


registry = C.get("quotes") if isinstance(C.get("quotes"), list) else []

if registry:
    print("quotes (registry):")
    for e in registry:
        quote(e.get("text", ""), e.get("where", "quotes"))
        name(e.get("who", ""), e.get("where", "quotes"))
else:
    print("quotes (sweep: every 「…」 plus every slip/quote/label field — register them in CONTENT.quotes for exact control):")
    for path, s in quoted(C):
        key = re.sub(r"\[\d+\]", "", path).split(".")[-1]
        if TIMEISH.match(s):
            continue
        if WHOISH.match(s):
            # "name · 17:05" is an attribution, but "group name · 21:31" is a stamp label — only
            # flag it when the part before · really looks like a sender
            n = s.split("·")[0].strip()
            if n in senders or any(n in x for x in senders):
                name(s, path)
            continue
        if WKEY.search(key):
            name(s, path)
            continue
        inside = re.findall(r"「([^」]{2,})」", s)
        if inside:
            for frag in inside:
                quote(frag, path)
        elif QKEY.search(key) and len(s) >= 4 and len(CJK.findall(s)) >= 3:
            quote(s, path)

# names written as attributions, wherever they appear
for path, s in quoted(C):
    if WKEY.search(re.sub(r"\[\d+\]", "", path).split(".")[-1]):
        continue
    for frag in re.findall(r"——\s*([^\s·「」]{1,20})", s):
        name(frag, path + " (attribution)")

# repeat stamps: the count has to match how many distinct people sent that line
stamps = [(p, m) for p, s in walk(C) for m in re.findall(r"×\s*(\d+)", s)]
for p, n in stamps:
    print(f"  ?? [repeat] {p} says ×{n} — check by hand that {n} distinct senders really sent that line")

if not seen:
    print("  !! no quote found in CONTENT at all — nothing was verified")
    bad += 1

print("narration (read against the log; numbers and names must match):")
for L in json.loads((HERE / "voice" / "lines.json").read_text()):
    print(f"  {L['id']}: {L['zh']}")

print("ALL FOUND" if not bad else f"{bad} problem(s)")
sys.exit(1 if bad else 0)

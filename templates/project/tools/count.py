#!/usr/bin/env python3
"""Count, never estimate:  python3 tools/count.py work/chat.txt "恭喜" ["生日快乐" ...] [--list]
Prints, per pattern (regex): messages containing it, distinct senders, first/last time. --list shows every hit.
EP.03 lesson: the script said "70 people congratulated" - the log said 72 messages from 67 people. Put the real number on screen."""
import re, sys
args = [x for x in sys.argv[1:] if x != "--list"]; LIST = "--list" in sys.argv
lines = open(args[0], encoding="utf-8").read().splitlines()
RX = re.compile(r"^\[(.*?)\] (.*?): (.*)$")
for pat in args[1:]:
    hits = [m.groups() for l in lines if (m := RX.match(l)) and re.search(pat, m.group(3))]
    people = sorted({w for _, w, _ in hits})
    print(f"{pat!r}: {len(hits)} messages, {len(people)} people" + (f", {hits[0][0]} -> {hits[-1][0]}" if hits else ""))
    if LIST:
        for t, w, x in hits: print(f"   [{t}] {w}: {x[:80]}")

#!/usr/bin/env python3
"""Chat export -> clean text + stats, the first step of every episode.

    python3 tools/clean_chat.py chat.json [--start "2026-10-23 19:00"] [--end "2026-10-24 18:54"] [--out work/]

Input: a wechat-cli style export ({"chat":..., "messages": ["[YYYY-MM-DD HH:MM] name: text", ...]}) or a plain
list of such strings, or a .txt with one message per line. Media XML is reduced to a tag ([视频] / [图片] / [链接] ...).
Output (in --out, default work/): chat.txt (one message per line, cleaned), stats.md (counts per person / per hour,
lines repeated by 3+ people, busiest 15-minute windows), and prints a short summary.
The window matters: each episode covers exactly the time since the previous release (use the authorized start/end timestamps).
State the window and the message count on the end card - and count them with this tool, never estimate.
"""
import argparse, collections, json, re
from pathlib import Path
ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("--start"); ap.add_argument("--end"); ap.add_argument("--out", default="work")
a = ap.parse_args()
src = Path(a.src)
if src.suffix == ".json":
    d = json.loads(src.read_text()); raw = d["messages"] if isinstance(d, dict) else d
else:
    raw = src.read_text().splitlines()
RX = re.compile(r"^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})(?::\d{2})?\]\s*(.*?):\s(.*)$", re.S)
def clean(s):
    s = s.strip()
    m = re.match(r"^(\[[^\]]{1,8}\])\s*<\?xml", s) or re.match(r"^(\[[^\]]{1,8}\])\s*<msg", s)
    if m: return m.group(1)
    if s.startswith("<?xml") or s.startswith("<msg"):
        t = re.search(r"<title>(.*?)</title>", s, re.S); return "[链接] " + (t.group(1).strip() if t else "")
    s = re.sub(r"https?://\S+", "[URL]", s)
    return re.sub(r"\s+", " ", s)
msgs = []
for r in raw:
    if not isinstance(r, str): r = f"[{r.get('time','')}] {r.get('sender', r.get('name',''))}: {r.get('content', r.get('text',''))}"
    m = RX.match(r)
    if not m: continue
    ts, who, txt = m.groups()
    if a.start and ts < a.start: continue
    if a.end and ts > a.end: continue
    msgs.append((ts, who.strip(), clean(txt)))
out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
(out / "chat.txt").write_text("\n".join(f"[{t}] {w}: {x}" for t, w, x in msgs) + "\n")
by = collections.Counter(w for _, w, _ in msgs)
hours = collections.Counter(t[11:13] for t, _, _ in msgs)
same = collections.defaultdict(set)
for t, w, x in msgs:
    k = re.sub(r"[\s，。！？!?,.~～]+", "", x)
    if len(k) >= 2 and not k.startswith("["): same[k].add(w)
rep = sorted(((len(v), k) for k, v in same.items() if len(v) >= 3), reverse=True)
win = collections.Counter(t[:15] + ("0" if int(t[15]) < 5 else "5") for t, _, _ in msgs) if msgs else {}
media = collections.Counter(x.split("]")[0] + "]" for _, _, x in msgs if x.startswith("["))
md = [f"# {src.name}", f"window: {msgs[0][0] if msgs else '-'} -> {msgs[-1][0] if msgs else '-'}   messages: {len(msgs)}   people: {len(by)}", "",
      "## per person", *[f"- {w}: {n}" for w, n in by.most_common(40)], "", "## per hour", *[f"- {h}: {hours[h]}" for h in sorted(hours)], "",
      "## said by 3+ people (repeats / 复读 / 接龙 candidates - count is distinct senders)", *[f"- {n} × {k}" for n, k in rep[:30]], "",
      "## busiest 10-minute windows", *[f"- {w}x: {n}" for w, n in collections.Counter(win).most_common(12)], "",
      "## media", *[f"- {k} {n}" for k, n in media.most_common()]]
(out / "stats.md").write_text("\n".join(md) + "\n")
print(f"{len(msgs)} messages, {len(by)} people -> {out/'chat.txt'}, {out/'stats.md'}")
print("top:", ", ".join(f"{w} {n}" for w, n in by.most_common(8)))

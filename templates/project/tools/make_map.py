#!/usr/bin/env python3
"""Build assets/map.json for the map scene: LAND ONLY (no country borders), Mercator, fitted to the 1480x1080 picture gate.

    python3 tools/make_map.py --lon 106 136 --lat 18.5 37.5 \
        --city shenzhen 114.06 22.54 --city hangzhou 120.16 30.27 --city beijing 116.40 39.90

Why land only: Natural Earth *country* polygons carry borders that do not match the official map of China
(and of other countries). A chat newsreel never needs borders - draw coastlines only, and never put a
political boundary on screen. Data: Natural Earth 1:50m land (public domain), downloaded on first run.
Output: {"polys": [{"p": [[x, y], ...]}, ...], "cities": {"name": [x, y]}, "bbox": [...]} in picture pixels.
"""
import argparse, json, math, urllib.request
from pathlib import Path
HERE = Path(__file__).resolve().parent.parent
URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson"
ap = argparse.ArgumentParser()
ap.add_argument("--lon", nargs=2, type=float, default=[106, 136])
ap.add_argument("--lat", nargs=2, type=float, default=[18.5, 37.5])
ap.add_argument("--city", nargs=3, action="append", default=[], metavar=("NAME", "LON", "LAT"))
ap.add_argument("--src", default=str(HERE / "assets" / "ne_50m_land.geojson"))
ap.add_argument("--out", default=str(HERE / "assets" / "map.json"))
ap.add_argument("--w", type=int, default=1480); ap.add_argument("--h", type=int, default=1080)
a = ap.parse_args()
src = Path(a.src)
if not src.exists():
    print("downloading", URL); src.parent.mkdir(parents=True, exist_ok=True); urllib.request.urlretrieve(URL, src)
merc = lambda lon, lat: (math.radians(lon), math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))
x0, y0 = merc(a.lon[0], a.lat[0]); x1, y1 = merc(a.lon[1], a.lat[1])
s = min(a.w / (x1 - x0), a.h / (y1 - y0)); ox = (a.w - s * (x1 - x0)) / 2; oy = (a.h - s * (y1 - y0)) / 2
def P(lon, lat):
    X, Y = merc(lon, max(-85, min(85, lat))); return [round(ox + (X - x0) * s, 1), round(a.h - (oy + (Y - y0) * s), 1)]
polys = []
for f in json.load(open(src))["features"]:
    g = f["geometry"]; rings = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    for poly in rings:
        ring = poly[0]
        lons = [p[0] for p in ring]; lats = [p[1] for p in ring]
        if max(lons) < a.lon[0] - 3 or min(lons) > a.lon[1] + 3 or max(lats) < a.lat[0] - 3 or min(lats) > a.lat[1] + 3: continue
        pts = [P(*p) for p in ring]
        simp = [pts[0]]
        for q in pts[1:]:
            if abs(q[0] - simp[-1][0]) + abs(q[1] - simp[-1][1]) > 1.2: simp.append(q)
        if len(simp) > 3: polys.append({"p": simp})
cities = {n: P(float(lo), float(la)) for n, lo, la in a.city}
Path(a.out).write_text(json.dumps({"polys": polys, "cities": cities, "bbox": [a.lon, a.lat]}, separators=(",", ":")))
print(a.out, len(polys), "polys", cities)

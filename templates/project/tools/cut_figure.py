#!/usr/bin/env python3
"""Cut a character (e.g. the user's Q版 host drawings) out of a light, flat background -> RGBA PNG.

    $LIB/.venv/bin/python tools/cut_figure.py in.png assets/q_main.png [--tol 38] [--legs 0.62]

Method: flood-fill the background from the image border (only pixels connected to the border are removed, so white
shirts/eyes INSIDE the outline survive), then remove enclosed background gaps (between legs, under an arm) but ONLY
in the lower part of the figure (below --legs x height). EP.03 lesson: removing every enclosed light region ate the
white shirt near the hem; limiting it to the leg region fixed it. Always check the result on a dark AND a mid-grey
background (writes <out>_check.jpg) before using it in a scene. Use only images the user supplied or approved.
"""
import argparse, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--tol", type=float, default=38); ap.add_argument("--legs", type=float, default=.62); ap.add_argument("--min-gap", type=int, default=150)
a = ap.parse_args()
im = Image.open(a.src).convert("RGB"); x = np.asarray(im).astype(np.float32); H, W = x.shape[:2]
border = np.concatenate([x[0], x[-1], x[:, 0], x[:, -1]]); bg = np.median(border, 0)
near = np.linalg.norm(x - bg, axis=2) < a.tol
lab, n = ndi.label(near)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bgmask = np.isin(lab, list(edge))
fig = ~bgmask; ys = np.where(fig.any(1))[0]; y0, y1 = (ys[0], ys[-1]) if len(ys) else (0, H)
cut = int(y0 + (y1 - y0) * a.legs)
lab2, n2 = ndi.label(near & ~bgmask)
for i in range(1, n2 + 1):
    m = lab2 == i; yy = np.where(m.any(1))[0]
    if yy[0] >= cut and m.sum() >= a.min_gap: bgmask |= m
alpha = (~bgmask).astype(np.float32)
alpha = ndi.gaussian_filter(ndi.binary_erosion(alpha > .5, iterations=1).astype(np.float32), .8)
rgba = np.dstack([x, alpha[..., None] * 255]).astype(np.uint8)
ys, xs = np.where(alpha > .05); box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
out = Image.fromarray(rgba, "RGBA").crop(box); out.save(a.out)
chk = Image.new("RGB", (out.width * 2, out.height), (30, 28, 26)); chk.paste((128, 124, 118), (out.width, 0, out.width * 2, out.height))
chk.paste(out, (0, 0), out); chk.paste(out, (out.width, 0), out); chk.save(a.out.rsplit(".", 1)[0] + "_check.jpg", quality=88)
print(a.out, out.size, "check:", a.out.rsplit(".", 1)[0] + "_check.jpg")

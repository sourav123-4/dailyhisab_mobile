"""Wellth brand assets: a mint-to-cyan "W" whose last stroke rises into a growth arrow, on navy.

Run: python3 tools/make-brand.py assets
"""
import math
import os
import sys

from PIL import Image, ImageDraw

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
SS = 4
S = 1024
NAVY_A, NAVY_B = (15, 23, 42), (30, 41, 59)
MINT, CYAN = (52, 211, 153, 255), (34, 211, 238, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def background(size):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = min(max(((x / size - 0.5) * 0.7 + (y / size - 0.5) * 0.7) + 0.5, 0), 1)
            px[x, y] = lerp(NAVY_B, NAVY_A, t)
    return img


def mark(size, scale=1.0, mono=False):
    """The W + arrow, drawn in a box of `scale` x size centred in the canvas."""
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    k = big * scale
    off = (big - k) / 2

    def p(x, y):
        return (off + x * k, off + y * k)

    left, right = (MINT, CYAN) if not mono else ((255, 255, 255, 255),) * 2
    w = int(k * 0.085)
    pts = [p(0.20, 0.32), p(0.35, 0.70), p(0.50, 0.44), p(0.65, 0.70), p(0.80, 0.26)]
    d.line(pts[:3], fill=left, width=w, joint='curve')
    d.line(pts[2:], fill=right, width=w, joint='curve')
    for i, q in enumerate(pts):
        c = left if i < 2 else right
        d.ellipse([q[0] - w / 2, q[1] - w / 2, q[0] + w / 2, q[1] + w / 2], fill=c)
    tip = pts[-1]
    d.polygon([(tip[0] + k * 0.02, tip[1] - k * 0.07), (tip[0] + k * 0.075, tip[1] + k * 0.06), (tip[0] - k * 0.07, tip[1])], fill=right)
    return img.resize((size, size), Image.LANCZOS)


def rounded(img, radius_ratio=0.23):
    size = img.size[0]
    mask = Image.new('L', (size * SS, size * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * SS - 1, size * SS - 1], radius=int(size * SS * radius_ratio), fill=255)
    out = img.convert('RGBA')
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    return out


bg = background(S)
icon = bg.convert('RGBA')
icon.alpha_composite(mark(S))
icon.convert('RGB').save(f'{OUT}/icon.png')

# Android adaptive icon: keep the art inside the central safe zone.
mark(S, scale=0.62).save(f'{OUT}/android-icon-foreground.png')
bg.save(f'{OUT}/android-icon-background.png')
mark(S, scale=0.62, mono=True).save(f'{OUT}/android-icon-monochrome.png')

tile = rounded(icon.copy())
tile.save(f'{OUT}/app_logo.png')
splash = Image.new('RGBA', (S, S), (0, 0, 0, 0))
splash.alpha_composite(tile.resize((int(S * 0.8), int(S * 0.8)), Image.LANCZOS), (int(S * 0.1), int(S * 0.1)))
splash.save(f'{OUT}/splash-icon.png')
icon.convert('RGB').resize((196, 196), Image.LANCZOS).save(f'{OUT}/favicon.png')

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Azarakhsh Shop — placeholder image generator.

Draws stand-in brick imagery so the homepage looks complete before the real
studio photography arrives.  Every file it writes is meant to be OVERWRITTEN
by a real photograph of the same name (see README.md for the full map).

Usage:  python3 tools/generate-placeholder-images.py
Requires: Pillow  ->  pip install pillow
"""

import os
import random
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
random.seed(7)


def hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def shift(c, d):
    return tuple(max(0, min(255, v + d)) for v in c)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def grain(img, sigma=10, opacity=0.32):
    """Overlay fine photographic grain."""
    n = Image.effect_noise(img.size, sigma).convert("RGB")
    return Image.blend(img, Image.blend(img, n, 0.5), opacity)


def cloud(size, scale=14, sigma=42):
    """Low frequency luminance variation, used to break up flat colour."""
    w, h = size
    small = Image.effect_noise((max(2, w // scale), max(2, h // scale)), sigma)
    return small.resize(size, Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))


def light(img, cx=0.32, cy=0.14, strength=46, falloff=1.15):
    """Soft directional key light."""
    w, h = img.size
    m = Image.new("L", (w // 6, h // 6), 0)
    d = ImageDraw.Draw(m)
    px, py = int(cx * w / 6), int(cy * h / 6)
    r = int(max(w, h) / 6 * falloff)
    steps = 46
    for i in range(steps):
        t = i / steps
        rr = int(r * (1 - t))
        d.ellipse([px - rr, py - rr, px + rr, py + rr], fill=int(255 * (t ** 1.6)))
    m = m.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(40))
    glow = Image.new("RGB", (w, h), (255, 246, 232))
    img = Image.composite(Image.blend(img, glow, strength / 255.0), img, m.point(lambda v: 255 - v))
    return img


def brick_wall(size, colour, mortar="#161314", bw=248, bh=64, gap=11, offset=0.5,
               variance=13, speckle=0.0):
    """Running-bond brick face, drawn brick by brick."""
    w, h = size
    base = hx(colour)
    img = Image.new("RGB", (w, h), hx(mortar))
    d = ImageDraw.Draw(img)

    row = 0
    y = -gap
    while y < h + bh:
        dx = -int(bw * offset) if row % 2 else 0
        x = dx - bw
        while x < w + bw:
            v = random.randint(-variance, variance)
            c = shift(base, v)
            x0, y0, x1, y1 = x, y, x + bw - gap, y + bh - gap
            d.rectangle([x0, y0, x1, y1], fill=c)
            # chamfered top / bottom edges
            d.line([x0, y0, x1, y0], fill=shift(c, 16))
            d.line([x0, y0 + 1, x1, y0 + 1], fill=shift(c, 8))
            d.line([x0, y1, x1, y1], fill=shift(c, -20))
            d.line([x0, y0, x0, y1], fill=shift(c, 6))
            d.line([x1, y0, x1, y1], fill=shift(c, -10))
            if speckle:
                for _ in range(int((bw * bh) * speckle / 900)):
                    sx = random.randint(x0 + 2, max(x0 + 3, x1 - 2))
                    sy = random.randint(y0 + 2, max(y0 + 3, y1 - 2))
                    d.point((sx, sy), fill=shift(c, random.choice([-52, -38, 40])))
            x += bw
        y += bh
        row += 1

    # organic tonal drift across the wall
    img = Image.composite(img, Image.blend(img, Image.new("RGB", (w, h), shift(base, -26)), 0.5),
                          cloud((w, h)).point(lambda v: min(255, int(v * 1.6))))
    img = grain(img, 9, 0.22)
    img = img.filter(ImageFilter.GaussianBlur(0.35))
    return img


def studio_brick(size, colour, glazed=False):
    """A single brick on a warm studio backdrop."""
    w, h = size
    base = hx(colour)
    img = Image.new("RGB", (w, h), (26, 22, 20))
    d = ImageDraw.Draw(img)
    for i in range(h):  # پس‌زمینهٔ استودیوی تیره — آجر مثل یک شیء در ویترین
        t = i / h
        d.line([0, i, w, i], fill=mix((44, 37, 33), (14, 12, 11), t ** 1.15))

    bw, bh, dep = int(w * 0.72), int(h * 0.20), int(h * 0.062)
    x0, y0 = (w - bw) // 2, int(h * 0.44)

    sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([x0 - 30, y0 + bh - 12, x0 + bw + 46, y0 + bh + 54],
                               fill=(0, 0, 0, 170))
    img = Image.alpha_composite(img.convert("RGBA"), sh.filter(ImageFilter.GaussianBlur(26))).convert("RGB")
    d = ImageDraw.Draw(img)

    d.polygon([(x0, y0), (x0 + dep, y0 - dep), (x0 + bw + dep, y0 - dep), (x0 + bw, y0)],
              fill=shift(base, 30))                                    # top face
    d.polygon([(x0 + bw, y0), (x0 + bw + dep, y0 - dep),
               (x0 + bw + dep, y0 + bh - dep), (x0 + bw, y0 + bh)],
              fill=shift(base, -34))                                   # side face
    d.rectangle([x0, y0, x0 + bw, y0 + bh], fill=base)                 # front face
    d.line([x0, y0, x0 + bw, y0], fill=shift(base, 22))
    d.line([x0, y0 + bh, x0 + bw, y0 + bh], fill=shift(base, -30))

    face = img.crop((x0, y0 - dep, x0 + bw + dep, y0 + bh))
    face = grain(face, 11, 0.30 if not glazed else 0.14)
    img.paste(face, (x0, y0 - dep))

    if glazed:  # specular sheen for the glazed range
        gl = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(gl).polygon(
            [(x0 + 26, y0 + 12), (x0 + bw * 0.55, y0 + 8),
             (x0 + bw * 0.48, y0 + bh * 0.42), (x0 + 20, y0 + bh * 0.5)],
            fill=(255, 255, 255, 70))
        img = Image.alpha_composite(img.convert("RGBA"),
                                    gl.filter(ImageFilter.GaussianBlur(9))).convert("RGB")

    return light(img, 0.3, 0.1, 30)


def facade(size, colour, openings, mortar="#171415", bw=180, bh=48):
    """Brick facade with window reveals — stands in for a project photograph."""
    w, h = size
    img = brick_wall((w, h), colour, mortar=mortar, bw=bw, bh=bh, gap=8, variance=11)
    d = ImageDraw.Draw(img)
    for (ox, oy, ow, oh) in openings:
        X0, Y0 = int(ox * w), int(oy * h)
        X1, Y1 = int((ox + ow) * w), int((oy + oh) * h)
        pw, ph = max(2, X1 - X0), max(2, Y1 - Y0)

        # طاق و کف پنجره از خود آجر، با سایهٔ فرورفتگی
        d.rectangle([X0 - 10, Y0 - 10, X1 + 10, Y1 + 10], fill=shift(hx(colour), -34))
        d.rectangle([X0 - 4, Y0 - 4, X1 + 4, Y1 + 4], fill=(26, 23, 22))

        pane = Image.new("RGB", (pw, ph), (20, 24, 29))
        pd = ImageDraw.Draw(pane)
        for i in range(ph):                       # بازتاب آسمان از بالا به پایین
            t = (i / ph) ** 0.85
            pd.line([0, i, pw, i], fill=mix((78, 92, 106), (13, 15, 19), t))
        refl = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
        ImageDraw.Draw(refl).polygon(
            [(0, int(ph * 0.62)), (int(pw * 0.72), 0), (pw, 0), (0, int(ph * 0.95))],
            fill=(196, 214, 232, 40))
        pane = Image.alpha_composite(pane.convert("RGBA"),
                                     refl.filter(ImageFilter.GaussianBlur(pw * 0.05))).convert("RGB")

        pd = ImageDraw.Draw(pane)                 # قاب و تقسیمات
        mull = (38, 36, 34)
        pd.rectangle([0, 0, pw - 1, ph - 1], outline=mull, width=max(2, pw // 60))
        rows = max(1, int(ph / (pw * 0.85)))
        for r in range(1, rows):
            yy = int(ph * r / rows)
            pd.line([0, yy, pw, yy], fill=mull, width=max(2, pw // 80))
        if pw > ph * 0.9:
            pd.line([pw // 2, 0, pw // 2, ph], fill=mull, width=max(2, pw // 80))

        img.paste(pane, (X0, Y0))
        d.line([X0 - 10, Y1 + 10, X1 + 10, Y1 + 10], fill=shift(hx(colour), 26), width=3)
    img = light(img, 0.24, 0.06, 52, 1.35)
    return grain(img, 7, 0.16)


def save(img, *path, quality=86):
    p = os.path.join(ASSETS, *path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    img.convert("RGB").save(p, "JPEG", quality=quality, optimize=True, progressive=True)
    print("  ·", os.path.relpath(p, ROOT))



def cinematic(img, lift=(16, 13, 11), gain=1.06, vignette=0.55, warm=(1.03, 0.99, 0.93)):
    """گرید تیره و سینمایی: کنتراست بالا، سایهٔ گرم، وینیت."""
    w, h = img.size
    px = img.load()
    lut = []
    for v in range(256):
        t = v / 255.0
        t = t ** 1.28                       # سایه‌ها عمیق‌تر
        t = (t - 0.5) * gain + 0.5          # کنتراست
        lut.append(max(0, min(255, int(t * 255))))
    r_lut = [max(0, min(255, int(lut[v] * warm[0] + lift[0] * (1 - lut[v] / 255)))) for v in range(256)]
    g_lut = [max(0, min(255, int(lut[v] * warm[1] + lift[1] * (1 - lut[v] / 255)))) for v in range(256)]
    b_lut = [max(0, min(255, int(lut[v] * warm[2] + lift[2] * (1 - lut[v] / 255)))) for v in range(256)]
    img = img.point(r_lut + g_lut + b_lut)

    # وینیت نرم
    mask = Image.new("L", (w // 8, h // 8), 0)
    md = ImageDraw.Draw(mask)
    steps = 60
    for i in range(steps):
        t = i / steps
        inset = int(min(w, h) / 8 * 0.5 * t)
        md.ellipse([-w // 24 + inset, -h // 24 + inset,
                    w // 8 + w // 24 - inset, h // 8 + h // 24 - inset],
                   fill=int(255 * (1 - t) ** 0.7))
    mask = mask.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(60))
    dark = Image.new("RGB", (w, h), (6, 5, 4))
    img = Image.composite(img, Image.blend(img, dark, vignette), mask)
    return img


# ---------------------------------------------------------------- صفحه‌های داخلی
BLOG = [
    ("post-01", "#8d4a30", dict(bw=210, bh=56)),
    ("post-02", "#a6a099", dict(bw=250, bh=62, speckle=0.9)),
    ("post-03", "#c9a05c", dict(bw=196, bh=52)),
    ("post-04", "#e6e1d8", dict(bw=230, bh=58, speckle=1.2, mortar="#191617")),
    ("post-05", "#573323", dict(bw=214, bh=78, gap=15, variance=26)),
    ("post-06", "#2f2c2a", dict(bw=240, bh=60, mortar="#0d0c0c")),
    ("post-07", "#a96b41", dict(bw=200, bh=64)),
]

PLANT = [
    ("clay",  "#8f5236", dict(bw=280, bh=90, gap=16, variance=30)),
    ("kiln",  "#5e3a20", dict(bw=190, bh=48)),
    ("line",  "#a6a099", dict(bw=240, bh=58)),
    ("yard",  "#8d4a30", dict(bw=220, bh=64)),
]


def inner_pages():
    """تصاویر صفحه‌های وبلاگ، پروژه و کارخانه."""
    for name, colour, kw in BLOG:
        save(cinematic(brick_wall((1600, 900), colour, **kw), vignette=0.62),
             "blog", f"{name}.jpg")

    for i, (name, colour, op) in enumerate(GALLERY, start=1):
        for suffix, shift_op in (("b", [(0.24, 0.30, 0.24, 0.36)]), ("c", [])):
            save(cinematic(facade((1200, 900), colour, shift_op, bw=176, bh=48)),
                 "gallery", f"project-{i:02d}-{suffix}.jpg")

    for name, colour, kw in PLANT:
        save(cinematic(brick_wall((1400, 1000), colour, **kw), vignette=0.7),
             "plant", f"{name}.jpg")


# code, colour, glazed, wall geometry tweaks
PRODUCTS = [
    ("az-r110-nasooz-ghermez",  "#8d4a30", False, {}),
    ("az-w220-nasooz-sefid",    "#e6e1d8", False, {"speckle": 1.4, "mortar": "#191617"}),
    ("az-g330-nasooz-toosi",    "#a6a099", False, {"speckle": 0.9}),
    ("az-b140-nasooz-shokolati", "#573323", False, {}),
    ("az-k410-ghazaghi-dastsaz", "#a96b41", False, {"bw": 214, "bh": 78, "gap": 15, "variance": 26}),
    ("az-p510-plak-laabdar",    "#c2653a", True,  {"bw": 268, "bh": 56, "gap": 9}),
    ("az-y150-nasooz-zard",     "#c9a05c", False, {"speckle": 0.7}),
    ("az-d620-nama-meshki",     "#2f2c2a", False, {"mortar": "#0d0c0c"}),
    ("az-l710-konj-nasooz",     "#8d4a30", False, {"bw": 200, "bh": 64}),
    ("az-f810-farsh-kaf",       "#8f5236", False, {"bw": 210, "bh": 106, "gap": 12, "offset": 0.0}),
]

GALLERY = [
    ("project-01", "#8d4a30", [(0.10, 0.30, 0.16, 0.40), (0.38, 0.30, 0.16, 0.40), (0.66, 0.30, 0.16, 0.40)]),
    ("project-02", "#e6e1d8", [(0.14, 0.18, 0.30, 0.30), (0.56, 0.46, 0.30, 0.34)]),
    ("project-03", "#a6a099", [(0.20, 0.22, 0.52, 0.26), (0.20, 0.58, 0.52, 0.20)]),
    ("project-04", "#573323", [(0.30, 0.16, 0.40, 0.62)]),
    ("project-05", "#c9a05c", [(0.08, 0.36, 0.22, 0.30), (0.40, 0.36, 0.22, 0.30), (0.72, 0.36, 0.20, 0.30)]),
    ("project-06", "#2f2c2a", [(0.16, 0.24, 0.28, 0.48), (0.54, 0.24, 0.28, 0.48)]),
]

if __name__ == "__main__":
    print("Azarakhsh · generating stand-in imagery")
    for code, colour, glazed, kw in PRODUCTS:
        save(brick_wall((1100, 1375), colour, **kw), "products", f"{code}-wall.jpg")
        save(studio_brick((1100, 1375), colour, glazed), "products", f"{code}-single.jpg")

    for name, colour, op in GALLERY:
        save(cinematic(facade((1400, 1050), colour, op)), "gallery", f"{name}.jpg")

    inner_pages()
    print("done.")
    print("یادآوری: تصویر تالار (assets/intro/) عکس واقعی است و اینجا ساخته نمی‌شود.")

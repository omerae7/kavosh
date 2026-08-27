#!/usr/bin/env python3
"""Regenerate the icon assets from data/logo-source.png.

    python3 tools/invoice/make_icons.py

Writes data/logo.json (base64 payloads inlined by build.py) and
data/brickala.ico (for a Windows desktop shortcut).
"""
import base64
import io
import json
import pathlib

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "data" / "logo-source.png"
ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
# 32 for the tab, 192 for an Android home-screen shortcut, 180 for iOS,
# 64 for the mark in the application's top bar
WEB = {"i32": 32, "i192": 192, "i180": 180, "mark": 64}


def square(im):
    w, h = im.size
    side = max(w, h)
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.paste(im, ((side - w) // 2, (side - h) // 2), im)
    return out


def png_bytes(sq, size):
    im = sq.resize((size, size), Image.LANCZOS)
    # the mark is a handful of flat colours, so a palette keeps it tiny
    q = im.quantize(colors=48, method=Image.FASTOCTREE, dither=Image.NONE)
    buf = io.BytesIO()
    q.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def main():
    sq = square(Image.open(SRC).convert("RGBA"))
    payload = {k: base64.b64encode(png_bytes(sq, s)).decode() for k, s in WEB.items()}
    (HERE / "data" / "logo.json").write_text(
        json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    sq.resize((256, 256), Image.LANCZOS).save(
        HERE / "data" / "brickala.ico", format="ICO", sizes=ICO_SIZES)
    print("logo.json: %d B   brickala.ico: %d B"
          % (len(json.dumps(payload)), (HERE / "data" / "brickala.ico").stat().st_size))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Assemble the standalone invoice.html from its parts.

    python3 tools/invoice/build.py

Everything the application needs (fonts, product database, Unicode tables,
engine, UI) is inlined, so the produced file works offline from local
storage with no server, no installation and no external request.
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = ROOT / "invoice.html"


def read(p):
    return (HERE / p).read_text(encoding="utf-8")


def inject_json(html, marker, path):
    data = json.loads(read(path))
    blob = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    # never let embedded text terminate the surrounding <script>
    blob = blob.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    pat = re.compile(r"/\*__" + marker + r"__\*/.*?/\*__END__\*/", re.S)
    if not pat.search(html):
        sys.exit("placeholder __%s__ not found" % marker)
    return pat.sub(lambda m: blob, html, count=1)


def inject_code(html, marker, path):
    code = read(path)
    token = "/*__%s__*/" % marker
    if token not in html:
        sys.exit("placeholder %s not found" % token)
    return html.replace(token, code, 1)


def main():
    html = read("parts/template.html")
    html = inject_json(html, "FONTDATA", "data/fontdata.json")
    html = inject_json(html, "UNIMETA", "data/unimeta.json")
    html = inject_json(html, "PRODUCTS", "data/products.json")
    html = inject_code(html, "ENGINE", "parts/engine.js")
    html = inject_code(html, "APP", "parts/app.js")

    for bad in ("__FONTDATA__", "__UNIMETA__", "__PRODUCTS__", "__ENGINE__", "__APP__"):
        if bad in html:
            sys.exit("placeholder %s survived the build" % bad)

    OUT.write_text(html, encoding="utf-8")
    size = OUT.stat().st_size
    print("wrote %s  (%.1f KB)" % (OUT, size / 1024))


if __name__ == "__main__":
    main()

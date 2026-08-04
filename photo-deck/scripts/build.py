#!/usr/bin/env python3
"""Inline a deck's photos as data URIs.

The Artifact CSP blocks every external host, so images cannot be linked. Write
the template with __IMG_NAME__ placeholders and let this substitute each one
with the contents of <images>/<name>.jpg (lowercased).

    python3 build.py [template] [images_dir] [output]

Defaults: deck.template.html, web, deck.html
"""
import base64
import mimetypes
import pathlib
import re
import sys

TOKEN = re.compile(r"__IMG_([A-Z0-9_]+)__")   # note: _ and digits, or BT_SPEED silently survives

# every extension a placeholder may resolve to, in preference order
EXTS = (".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg")


def find(images: pathlib.Path, token: str) -> pathlib.Path:
    stem = token.lower()
    for ext in EXTS:
        p = images / f"{stem}{ext}"
        if p.exists():
            return p
    sys.exit(f"build: no image for __IMG_{token}__ (looked for {stem}{{{','.join(EXTS)}}} in {images})")


def main() -> None:
    args = sys.argv[1:]
    template = pathlib.Path(args[0] if len(args) > 0 else "deck.template.html")
    images = pathlib.Path(args[1] if len(args) > 1 else "web")
    output = pathlib.Path(args[2] if len(args) > 2 else "deck.html")

    if not template.exists():
        sys.exit(f"build: no template at {template}")
    if not images.is_dir():
        sys.exit(f"build: no images directory at {images}")

    html = template.read_text(encoding="utf-8")
    tokens = sorted(set(TOKEN.findall(html)))
    if not tokens:
        print("build: warning — template has no __IMG_*__ placeholders")

    used = 0
    for token in tokens:
        src = find(images, token)
        mime = mimetypes.guess_type(src.name)[0] or "image/jpeg"
        uri = f"data:{mime};base64," + base64.b64encode(src.read_bytes()).decode()
        html = html.replace(f"__IMG_{token}__", uri)
        used += 1

    # The guard must not share the blind spot of the pattern it guards.
    leftover = TOKEN.findall(html)
    if leftover:
        sys.exit(f"build: unsubstituted tokens: {sorted(set(leftover))}")

    output.write_text(html, encoding="utf-8")

    spare = [p.name for p in sorted(images.iterdir())
             if p.suffix.lower() in EXTS and p.stem.upper() not in tokens]
    if spare:
        print(f"build: {len(spare)} unused image(s) in {images}/: {', '.join(spare)}")
    print(f"build: {output} — {used} images, {len(html) / 1048576:.2f} MB")


if __name__ == "__main__":
    main()

"""Turn AI-generated images from art_in/ into game-ready PNGs in assets/art/.

  bg_<scene>.(png|jpg)    -> centre-cropped to 16:9, resized to 1920x1080
  char_<name>.(png|jpg)   -> background removed, split into 3 poses (idle, point, chest),
                             each trimmed, scaled to POSE_HEIGHT and bottom-aligned
                             -> char_<name>_idle.png, char_<name>_point.png, char_<name>_chest.png
  prop_<name>.(png|jpg)   -> background removed, trimmed

Usage: python tools/import_art.py            (from the game2d folder)
"""
from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art_in"
DST = ROOT / "assets" / "art"
POSE_HEIGHT = 262          # px; actors are scaled x1.15 in game -> ~300 px tall
BG_TOLERANCE = 38          # colour distance treated as "background" when flood-filling from the border
POSES = ["idle", "point", "chest"]
PROP_MAX = 512            # px, longest side of a prop


def load_rgba(p: Path) -> Image.Image:
    return Image.open(p).convert("RGBA")


def has_alpha(img: Image.Image) -> bool:
    lo, _hi = img.getchannel("A").getextrema()
    return lo < 250


def remove_background(img: Image.Image) -> Image.Image:
    """Flood-fill from the border every pixel close to the border colour and make it transparent."""
    if has_alpha(img):
        return img
    w, h = img.size
    px = img.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def close(c) -> bool:
        return sum(abs(c[i] - bg[i]) for i in range(3)) <= BG_TOLERANCE

    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        c = px[x, y]
        if not close(c):
            continue
        px[x, y] = (c[0], c[1], c[2], 0)
        if x > 0:
            q.append((x - 1, y))
        if x < w - 1:
            q.append((x + 1, y))
        if y > 0:
            q.append((x, y - 1))
        if y < h - 1:
            q.append((x, y + 1))
    return img


def column_segments(img: Image.Image, n: int) -> list[tuple[int, int]]:
    """Find n horizontal runs of non-transparent columns (the figures), merging small gaps."""
    w, h = img.size
    alpha = img.getchannel("A").load()
    filled = [any(alpha[x, y] > 30 for y in range(0, h, 2)) for x in range(w)]
    runs: list[list[int]] = []
    x = 0
    while x < w:
        if filled[x]:
            start = x
            while x < w and filled[x]:
                x += 1
            runs.append([start, x])
        x += 1
    # merge runs separated by tiny gaps until n remain (a pointing arm may split nothing, a gap may split a robe)
    while len(runs) > n:
        gaps = [(runs[i + 1][0] - runs[i][1], i) for i in range(len(runs) - 1)]
        _g, i = min(gaps)
        runs[i][1] = runs[i + 1][1]
        del runs[i + 1]
    if len(runs) < n:
        third = w // n
        return [(i * third, (i + 1) * third) for i in range(n)]
    return [(a, b) for a, b in runs]


def trim(img: Image.Image) -> Image.Image:
    box = img.getchannel("A").point(lambda a: 255 if a > 30 else 0).getbbox()
    return img.crop(box) if box else img


def do_bg(p: Path) -> None:
    img = Image.open(p).convert("RGB")
    w, h = img.size
    target = 16 / 9
    if w / h > target:
        nw = int(h * target)
        img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w / target)
        img = img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    img = img.resize((1920, 1080), Image.LANCZOS)
    out = DST / (p.stem + ".png")
    img.save(out)
    print(f"bg    {p.name} -> {out.name}")


def foot_anchor(img: Image.Image) -> float:
    """x of the figure's footing: alpha-weighted mean x of the bottom 25% rows (ignores a pointing arm)."""
    alpha = img.getchannel("A").load()
    total = 0
    acc = 0.0
    for y in range(int(img.height * 0.75), img.height):
        for x in range(img.width):
            a = alpha[x, y]
            if a > 30:
                total += 1
                acc += x
    return acc / total if total else img.width / 2


ANCHORS: dict[str, float] = {}


def do_char(p: Path) -> None:
    img = remove_background(load_rgba(p))
    segs = column_segments(img, 3)
    for pose, (a, b) in zip(POSES, segs):
        part = trim(img.crop((a, 0, b, img.height)))
        scale = POSE_HEIGHT / part.height
        part = part.resize((max(1, round(part.width * scale)), POSE_HEIGHT), Image.LANCZOS)
        name = f"{p.stem}_{pose}"
        part.save(DST / f"{name}.png")
        ANCHORS[name] = round(foot_anchor(part), 1)
        print(f"char  {p.name} [{pose}] -> {name}.png {part.size} anchor_x={ANCHORS[name]}")


def do_prop(p: Path) -> None:
    img = trim(remove_background(load_rgba(p)))
    img.thumbnail((PROP_MAX, PROP_MAX), Image.LANCZOS)
    out = DST / (p.stem + ".png")
    img.save(out)
    print(f"prop  {p.name} -> {out.name} {img.size}")


def main() -> int:
    DST.mkdir(parents=True, exist_ok=True)
    files = sorted(f for f in SRC.iterdir() if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"))
    if not files:
        print("art_in/ is empty")
        return 1
    for f in files:
        if f.stem.startswith("bg_"):
            do_bg(f)
        elif f.stem.startswith("char_"):
            do_char(f)
        elif f.stem.startswith("prop_"):
            do_prop(f)
        else:
            print(f"skip  {f.name} (name must start with bg_, char_ or prop_)")
    anchors_file = DST / "anchors.json"
    old = json.loads(anchors_file.read_text(encoding="utf-8")) if anchors_file.exists() else {}
    old.update(ANCHORS)
    anchors_file.write_text(json.dumps(old, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())

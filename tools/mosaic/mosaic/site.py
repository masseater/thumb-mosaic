import concurrent.futures as cf
import hashlib
import html
import io
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

from .image import crop_to_tile
from .net import get
from .solve import mask_path

LEVELS = (("xs", 16, 0), ("s", 48, 16), ("l", 160, 8))
TILE = (640, 360)
QUALITY = 82
ATLAS_QUALITY = 80
YOUTUBE_SIZES = ("maxresdefault", "sddefault", "hqdefault", "mqdefault")
OG_IMAGE = re.compile(r'property="og:image" content="([^"]+)"')


def _youtube(url: str) -> list[str]:
    video = url.rsplit("/", 1)[-1].split("v=")[-1]
    return [f"https://i.ytimg.com/vi/{video}/{size}.jpg" for size in YOUTUBE_SIZES]


def _niconico(url: str, fallback: str) -> list[str]:
    page = get(url)
    found = OG_IMAGE.search(page.decode("utf-8", "replace")) if page else None
    if found is None or "s=blur" in found.group(1):
        return [fallback]
    return [html.unescape(found.group(1)), fallback]


def _candidates(url: str, fallback: str) -> list[str]:
    if fallback:
        return _niconico(url, fallback)
    return _youtube(url)


def _fetch(url: str, fallback: str, cache: Path) -> Path:
    path = cache / f"{hashlib.sha256(url.encode()).hexdigest()[:24]}.jpg"
    if path.exists():
        return path
    for candidate in _candidates(url, fallback):
        raw = get(candidate)
        if raw is None:
            continue
        im = crop_to_tile(Image.open(io.BytesIO(raw)).convert("RGB"))
        if im.size[0] > TILE[0]:
            im = im.resize(TILE, Image.LANCZOS)
        im.save(path, quality=QUALITY, optimize=True, progressive=True)
        return path
    raise RuntimeError(f"サムネイルを取れなかった: {url}")


def _level(tiles: list[tuple[int, Path]], grid: tuple[int, int], out: Path, prefix: str, width: int, block: int) -> dict:
    cols, rows = grid
    height = width * 9 // 16
    side = block or max(cols, rows)
    groups: dict[tuple[int, int], list[tuple[int, Path]]] = {}
    for cell, path in tiles:
        groups.setdefault(((cell % cols) // side, (cell // cols) // side), []).append((cell, path))
    blocks = []
    for (bx, by), members in sorted(groups.items()):
        w = min(side, cols - bx * side) * width
        h = min(side, rows - by * side) * height
        sheet = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        for cell, path in members:
            im = Image.open(path).convert("RGB").resize((width, height), Image.LANCZOS)
            sheet.paste(im, (((cell % cols) % side) * width, ((cell // cols) % side) * height))
        name = f"{prefix}{bx}_{by}.webp"
        sheet.save(out / name, quality=ATLAS_QUALITY, method=6)
        blocks.append([bx, by, name])
    return {"tw": width, "th": height, "block": side, "blocks": blocks}


def site(slug: str, data: Path, cache: Path, public: Path) -> None:
    raw = data.read_bytes()
    assignment = json.loads(raw)
    version = hashlib.sha256(raw + mask_path(data).read_bytes() + repr((LEVELS, TILE, QUALITY, ATLAS_QUALITY)).encode()).hexdigest()[:16]
    cache.mkdir(parents=True, exist_ok=True)
    tiles = assignment["tiles"]
    with cf.ThreadPoolExecutor(16) as ex:
        paths = list(ex.map(lambda t: _fetch(t[0][3], t[1], cache), zip(tiles, assignment["fallbacks"])))
    if (public / slug).exists():
        shutil.rmtree(public / slug)
    out = public / slug / version
    (out / "t").mkdir(parents=True)
    for i, path in enumerate(paths):
        shutil.copyfile(path, out / "t" / f"{i}.jpg")
    cells = [t[0] for t in tiles]
    grid = (assignment["cols"], assignment["rows"])
    levels = [_level(list(zip(cells, paths)), grid, out, *spec) for spec in LEVELS]
    shutil.copyfile(mask_path(data), out / "mask.webp")
    (out / "tiles.json").write_text(json.dumps(tiles, ensure_ascii=False, separators=(",", ":")))
    manifest = {k: v for k, v in assignment.items() if k not in ("fallbacks", "tiles")}
    manifest |= {
        "version": version,
        "levels": levels,
        "tile": {"width": TILE[0], "height": TILE[1], "dir": "t"},
        "cells": cells,
        "mask": "mask.webp",
        "tiles": "tiles.json",
    }
    (public / f"{slug}.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")))
    widths: dict[int, int] = {}
    for path in paths:
        w = Image.open(path).size[0]
        widths[w] = widths.get(w, 0) + 1
    print(f"site {slug} version={version} tiles={len(paths)} widths={dict(sorted(widths.items()))}", file=sys.stderr)

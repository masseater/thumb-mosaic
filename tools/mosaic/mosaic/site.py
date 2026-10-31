import concurrent.futures as cf
import hashlib
import html
import io
import json
import math
import os
import re
import shutil
import sys
import threading
from pathlib import Path

from PIL import Image

from .image import crop_to_tile
from .net import get
from .characters import Character
from .pool import POOL_FILE, SMALL_DIR
from .solve import variant_path

LEVELS = (("xs", 16, 0), ("s", 48, 16), ("l", 160, 8), ("t", 640, 4))
TILE = (640, 360)
QUALITY = 82
ATLAS_QUALITY = 80
CHUNK = 256
CHUNK_DIR = "tiles"
YOUTUBE_SIZES = ("maxresdefault", "sddefault", "hqdefault", "mqdefault")
OG_SIZE = (1200, 630)
OG_TILE = (64, 36)
OG_FILE = "og.jpg"
CANDIDATES = "candidates.json"
MANIFEST = "manifest.json"
OG_IMAGE = re.compile(r'property="og:image" content="([^"]+)"')
NICO_OG = "niconico-og.json"
NICO_PAGES = threading.Semaphore(4)


def _youtube(url: str) -> list[str]:
    video = url.rsplit("/", 1)[-1].split("v=")[-1]
    return [f"https://i.ytimg.com/vi/{video}/{size}.jpg" for size in YOUTUBE_SIZES]


def _niconico_og(url: str) -> str | None:
    with NICO_PAGES:
        page = get(url)
    if page is None:
        return None
    found = OG_IMAGE.search(page.decode("utf-8", "replace"))
    if found is None or "s=blur" in found.group(1):
        return ""
    return html.unescape(found.group(1))


def _niconico(url: str, fallback: str, og: dict[str, str]) -> list[str]:
    if url not in og:
        found = _niconico_og(url)
        if found is None:
            return [fallback]
        og[url] = found
    return [og[url], fallback] if og[url] else [fallback]


def _candidates(url: str, fallback: str, og: dict[str, str]) -> list[str]:
    if fallback:
        return _niconico(url, fallback, og)
    return _youtube(url)


def _fetch(url: str, fallback: str, cache: Path, small: Path | None, og: dict[str, str]) -> Path:
    path = cache / f"{hashlib.sha256(url.encode()).hexdigest()[:24]}.jpg"
    if path.exists():
        return path
    for candidate in _candidates(url, fallback, og):
        raw = get(candidate)
        if raw is None:
            continue
        im = crop_to_tile(Image.open(io.BytesIO(raw)).convert("RGB"))
        if im.size[0] > TILE[0]:
            im = im.resize(TILE, Image.LANCZOS)
        im.save(path, quality=QUALITY, optimize=True, progressive=True)
        return path
    if small is None or not small.exists():
        raise RuntimeError(f"サムネイルを取れなかった: {url}")
    print(f"site: 縮小サムネで代用 {url}", file=sys.stderr, flush=True)
    Image.open(small).convert("RGB").resize(TILE, Image.LANCZOS).save(path, quality=QUALITY, optimize=True, progressive=True)
    return path


def _sheet(members: list[tuple[int, Path]], spec: tuple[int, int, int, int, int], out: Path, name: str) -> None:
    cols, w, h, width, side = spec
    height = width * 9 // 16
    sheet = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for cell, path in members:
        im = Image.open(path).convert("RGB").resize((width, height), Image.LANCZOS)
        sheet.paste(im, (((cell % cols) % side) * width, ((cell // cols) % side) * height))
    sheet.save(out / name, quality=ATLAS_QUALITY, method=6)


def _level(tiles: list[tuple[int, Path]], grid: tuple[int, int], out: Path, prefix: str, width: int, block: int) -> dict:
    cols, rows = grid
    height = width * 9 // 16
    side = block or max(cols, rows)
    groups: dict[tuple[int, int], list[tuple[int, Path]]] = {}
    for cell, path in tiles:
        groups.setdefault(((cell % cols) // side, (cell // cols) // side), []).append((cell, path))
    blocks = []
    jobs = []
    with cf.ThreadPoolExecutor(os.cpu_count()) as ex:
        for (bx, by), members in sorted(groups.items()):
            w = min(side, cols - bx * side) * width
            h = min(side, rows - by * side) * height
            name = f"{prefix}{bx}_{by}.webp"
            jobs.append(ex.submit(_sheet, members, (cols, w, h, width, side), out, name))
            blocks.append([bx, by, name])
    for job in jobs:
        job.result()
    return {"tw": width, "th": height, "block": side, "blocks": blocks}


def _og(tiles: list[tuple[int, Path]], cols: int, crop: tuple[int, int, int], out: Path) -> None:
    col, row, width = crop
    tw, th = OG_TILE
    height = math.ceil(width * tw * OG_SIZE[1] / OG_SIZE[0] / th)
    card = Image.new("RGB", (width * tw, height * th), "white")
    for cell, path in tiles:
        x, y = cell % cols - col, cell // cols - row
        if 0 <= x < width and 0 <= y < height:
            card.paste(Image.open(path).convert("RGB").resize(OG_TILE, Image.LANCZOS), (x * tw, y * th))
    card = card.crop((0, 0, card.width, card.width * OG_SIZE[1] // OG_SIZE[0]))
    card.resize(OG_SIZE, Image.LANCZOS).save(out / OG_FILE, quality=QUALITY, optimize=True, progressive=True)


def _smalls(pool: Path) -> dict[str, Path]:
    entries = json.loads((pool / POOL_FILE).read_text()) if (pool / POOL_FILE).exists() else []
    return {e["url"]: pool / SMALL_DIR / f"{e['song']}.jpg" for e in entries}


def site(ch: Character, data: Path, cache: Path, public: Path, pool: Path) -> None:
    cache.mkdir(parents=True, exist_ok=True)
    if (public / ch.slug).exists():
        shutil.rmtree(public / ch.slug)
    smalls = _smalls(pool)
    og_path = pool / NICO_OG
    og = json.loads(og_path.read_text()) if og_path.exists() else {}
    try:
        variants = [_variant(ch, variant_path(data, v), cache, public / ch.slug / str(v), smalls, og) for v in range(ch.variants)]
    finally:
        og_path.write_text(json.dumps(og, separators=(",", ":")))
    ids: dict[str, int] = {}
    candidates = [[[ids.setdefault(m["urls"][i], len(ids)), m["errors"][i]] for m in variants] for i in range(len(variants[0]["cells"]))]
    (public / ch.slug / CANDIDATES).write_text(json.dumps(candidates, separators=(",", ":")))
    first = variants[0]
    manifest = {k: v for k, v in first.items() if k not in ("urls", "errors", "version", "variant", "meanDelta", "og")}
    manifest |= {
        "og": f"0/{first['version']}/{first['og']}",
        "candidates": CANDIDATES,
        "variants": [{"version": m["version"], "meanDelta": m["meanDelta"]} for m in variants],
    }
    (public / ch.slug / MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")))
    print(f"site {ch.slug} variants={len(variants)} thumbnails={len(ids)}", file=sys.stderr)


def _variant(ch: Character, data: Path, cache: Path, public: Path, smalls: dict[str, Path], og: dict[str, str]) -> dict:
    raw = data.read_bytes()
    assignment = json.loads(raw)
    version = hashlib.sha256(raw + repr((LEVELS, TILE, QUALITY, ATLAS_QUALITY, CHUNK, ch.og, OG_SIZE, OG_TILE)).encode()).hexdigest()[:16]
    tiles = assignment["tiles"]
    with cf.ThreadPoolExecutor(16) as ex:
        paths = list(ex.map(lambda t: _fetch(t[0][3], t[1], cache, smalls.get(t[0][3]), og), zip(tiles, assignment["fallbacks"])))
    out = public / version
    out.mkdir(parents=True)
    cells = [t[0] for t in tiles]
    grid = (assignment["cols"], assignment["rows"])
    levels = [_level(list(zip(cells, paths)), grid, out, *spec) for spec in LEVELS]
    _og(list(zip(cells, paths)), grid[0], ch.og, out)
    (out / "tiles.json").write_text(json.dumps(tiles, ensure_ascii=False, separators=(",", ":")))
    (out / CHUNK_DIR).mkdir()
    for start in range(0, len(tiles), CHUNK):
        chunk = json.dumps(tiles[start : start + CHUNK], ensure_ascii=False, separators=(",", ":"))
        (out / CHUNK_DIR / f"{start // CHUNK}.json").write_text(chunk)
    manifest = {k: v for k, v in assignment.items() if k not in ("fallbacks", "tiles", "pool", "errors")}
    manifest |= {
        "version": version,
        "levels": levels,
        "tile": {"width": TILE[0], "height": TILE[1]},
        "cells": cells,
        "og": OG_FILE,
        "tiles": "tiles.json",
        "chunk": {"size": CHUNK, "dir": CHUNK_DIR},
    }
    widths: dict[int, int] = {}
    for path in paths:
        w = Image.open(path).size[0]
        widths[w] = widths.get(w, 0) + 1
    print(f"site {ch.slug}/{public.name} version={version} tiles={len(paths)} widths={dict(sorted(widths.items()))}", file=sys.stderr)
    return manifest | {"urls": [t[3] for t in tiles], "errors": assignment["errors"]}

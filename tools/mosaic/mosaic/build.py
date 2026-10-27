import concurrent.futures as cf
import io
import json
import math
import sys
from pathlib import Path

from PIL import Image

from .characters import Character
from .image import crop_to_tile
from .net import get

ATLASES = (("s", 48, 85, 85 * 90), ("l", 160, 25, 25 * 45))
TILE = (640, 360)
ATLAS_QUALITY = 82
TILE_QUALITY = 82
SERVICE_LABEL = {"Youtube": "YouTube", "NicoNicoDouga": "ニコニコ"}


def _atlas(small: Path, songs: list[int], out: Path, prefix: str, width: int, per_row: int, per_atlas: int) -> dict:
    height = width * 9 // 16
    files = []
    for first in range(0, len(songs), per_atlas):
        chunk = songs[first : first + per_atlas]
        sheet = Image.new("RGB", (per_row * width, math.ceil(len(chunk) / per_row) * height), (255, 255, 255))
        for k, song in enumerate(chunk):
            im = Image.open(small / f"{song}.jpg").convert("RGB").resize((width, height), Image.LANCZOS)
            sheet.paste(im, ((k % per_row) * width, (k // per_row) * height))
        name = f"{prefix}{first // per_atlas}.jpg"
        sheet.save(out / name, quality=ATLAS_QUALITY, optimize=True, progressive=True)
        files.append(name)
    return {"tw": width, "th": height, "perRow": per_row, "perAtlas": per_atlas, "files": files}


def _tile(entry: dict, small: Path, path: Path) -> str:
    if path.exists():
        return "cached"
    for url in entry["thumbs"]:
        raw = get(url)
        if raw is None:
            continue
        im = crop_to_tile(Image.open(io.BytesIO(raw)).convert("RGB"))
        if im.size[0] > TILE[0]:
            im = im.resize(TILE, Image.LANCZOS)
        im.save(path, quality=TILE_QUALITY, optimize=True, progressive=True)
        return f"{im.size[0]}"
    Image.open(small / f"{entry['song']}.jpg").save(path, quality=TILE_QUALITY)
    return "small"


def build(ch: Character, cache: Path, out: Path) -> None:
    pool = json.loads((cache / "pool.json").read_text())
    layout = json.loads((out / "layout.json").read_text())
    cells = sorted(layout["cells"])
    entries = [pool[p] for _, p in cells]
    small = cache / "small"
    site = out / "site"
    (site / "t").mkdir(parents=True, exist_ok=True)
    levels = [_atlas(small, [e["song"] for e in entries], site, *spec) for spec in ATLASES]
    with cf.ThreadPoolExecutor(16) as ex:
        sizes = list(ex.map(lambda ie: _tile(ie[1], small, site / "t" / f"{ie[0]}.jpg"), enumerate(entries)))
    counts: dict[str, int] = {}
    for s in sizes:
        counts[s] = counts.get(s, 0) + 1
    meta = {
        "character": ch.name,
        "credit": ch.credit,
        "cols": layout["cols"],
        "rows": layout["rows"],
        "pool": layout["pool"],
        "meanDelta": layout["meanDelta"],
        "levels": levels,
        "tile": {"width": TILE[0], "height": TILE[1], "dir": "t"},
        "tiles": [[c, e["name"], e["artist"], e["url"], SERVICE_LABEL[e["service"]]] for (c, _), e in zip(cells, entries)],
    }
    (site / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")))
    print(f"build tiles={len(entries)} widths={counts}", file=sys.stderr)

import concurrent.futures as cf
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from .characters import Character
from .image import crop_to_tile, dhash, features
from .net import get
from .vocadb import YOUTUBE_SIZES, pages, thumbnail_candidates

SMALL = (160, 90)
MIN_WIDTH = 320


def _download(song: dict, small_dir: Path) -> dict | None:
    picked = thumbnail_candidates(song, ("mqdefault",))
    full = thumbnail_candidates(song, YOUTUBE_SIZES)
    if picked is None or full is None:
        return None
    pv, urls = picked
    path = small_dir / f"{song['id']}.jpg"
    if not path.exists():
        raw = get(urls[0])
        if raw is None:
            return None
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        if im.size[0] < MIN_WIDTH and pv["service"] == "Youtube":
            return None
        crop_to_tile(im).resize(SMALL, Image.LANCZOS).save(path, quality=90)
    return {
        "song": song["id"],
        "name": song["name"],
        "artist": song.get("artistString") or "",
        "service": pv["service"],
        "pvId": pv["pvId"],
        "url": pv["url"].replace("http://", "https://"),
        "thumbs": full[1],
    }


def build_pool(ch: Character, cache: Path, limit: int | None) -> None:
    small_dir = cache / "small"
    small_dir.mkdir(parents=True, exist_ok=True)
    songs = list(pages(ch.vocadb_artist_id, cache / "vocadb", limit))
    with cf.ThreadPoolExecutor(16) as ex:
        entries = [e for e in ex.map(lambda s: _download(s, small_dir), songs) if e]
    seen: set[bytes] = set()
    kept, feats = [], []
    for e in entries:
        im = Image.open(small_dir / f"{e['song']}.jpg").convert("RGB")
        h = dhash(im)
        if h in seen:
            continue
        seen.add(h)
        kept.append(e)
        feats.append(features(im))
    np.save(cache / "features.npy", np.array(feats, dtype=np.float32))
    (cache / "pool.json").write_text(json.dumps(kept, ensure_ascii=False))
    print(f"pool songs={len(songs)} downloaded={len(entries)} unique={len(kept)}", file=sys.stderr)

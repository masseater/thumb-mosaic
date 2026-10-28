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
from .vocadb import YOUTUBE_SIZES, songs, thumbnail_candidates

SMALL = (160, 90)
MIN_WIDTH = 320


def _load_thumbs(path: Path) -> tuple[dict[int, tuple[bytes, np.ndarray]], set[int]]:
    if not path.exists():
        return {}, set()
    z = np.load(path)
    known = {int(i): (h.tobytes(), f) for i, h, f in zip(z["ids"], z["hashes"], z["features"])}
    return known, {int(i) for i in z["missing"]}


def _save_thumbs(path: Path, known: dict[int, tuple[bytes, np.ndarray]], missing: set[int]) -> None:
    ids = sorted(known)
    np.savez(
        path,
        ids=np.array(ids, dtype=np.int64),
        hashes=np.array([np.frombuffer(known[i][0], dtype=np.uint8) for i in ids], dtype=np.uint8).reshape(len(ids), -1),
        features=np.array([known[i][1] for i in ids], dtype=np.float32).reshape(len(ids), -1),
        missing=np.array(sorted(missing), dtype=np.int64),
    )


def _download(song: dict, small_dir: Path, missing: set[int]) -> dict | None:
    picked = thumbnail_candidates(song, ("mqdefault",))
    full = thumbnail_candidates(song, YOUTUBE_SIZES)
    if picked is None or full is None or song["id"] in missing:
        return None
    pv, urls = picked
    path = small_dir / f"{song['id']}.jpg"
    if not path.exists():
        raw = get(urls[0])
        if raw is None:
            missing.add(song["id"])
            return None
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        if im.size[0] < MIN_WIDTH and pv["service"] == "Youtube":
            missing.add(song["id"])
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
    thumbs = cache / "thumbs.npz"
    known, missing = _load_thumbs(thumbs)
    found = songs(ch.vocadb_artist_id, cache / "vocadb", limit)
    with cf.ThreadPoolExecutor(16) as ex:
        entries = [e for e in ex.map(lambda s: _download(s, small_dir, missing), found) if e]
    seen: set[bytes] = set()
    kept, feats = [], []
    for e in entries:
        if e["song"] not in known:
            im = Image.open(small_dir / f"{e['song']}.jpg").convert("RGB")
            known[e["song"]] = (dhash(im), features(im).astype(np.float32))
        h, f = known[e["song"]]
        if h in seen:
            continue
        seen.add(h)
        kept.append(e)
        feats.append(f)
    _save_thumbs(thumbs, known, missing)
    np.save(cache / "features.npy", np.array(feats, dtype=np.float32))
    (cache / "pool.json").write_text(json.dumps(kept, ensure_ascii=False))
    print(f"pool songs={len(found)} downloaded={len(entries)} unique={len(kept)}", file=sys.stderr)

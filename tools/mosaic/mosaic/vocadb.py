import json
import sys
from collections.abc import Iterator
from pathlib import Path

from .net import get

PAGE = 100
API = "https://vocadb.net/api/songs"


def pages(artist_id: int, cache: Path, limit: int | None) -> Iterator[dict]:
    cache.mkdir(parents=True, exist_ok=True)
    start = 0
    while limit is None or start < limit:
        path = cache / f"{start:07d}.json"
        if path.exists():
            body = json.loads(path.read_text())
        else:
            url = f"{API}?artistId%5B%5D={artist_id}&childVoicebanks=true&maxResults={PAGE}&start={start}&fields=PVs&sort=RatingScore&pvServices=NicoNicoDouga,Youtube"
            raw = get(url)
            if raw is None:
                raise RuntimeError(f"VocaDB の一覧を取れなかった: {url}")
            body = json.loads(raw)
            path.write_text(json.dumps(body, ensure_ascii=False))
            print(f"vocadb {start}", file=sys.stderr, flush=True)
        items = body["items"]
        yield from items
        if len(items) < PAGE:
            return
        start += PAGE


def original_pv(song: dict, service: str) -> dict | None:
    return next(
        (p for p in song.get("pvs", []) if p["service"] == service and p["pvType"] == "Original" and not p.get("disabled")),
        None,
    )


YOUTUBE_SIZES = ("maxresdefault", "sddefault", "hqdefault", "mqdefault")


def thumbnail_candidates(song: dict, sizes: tuple[str, ...]) -> tuple[dict, list[str]] | None:
    yt = original_pv(song, "Youtube")
    if yt:
        return yt, [f"https://i.ytimg.com/vi/{yt['pvId']}/{s}.jpg" for s in sizes]
    nico = original_pv(song, "NicoNicoDouga")
    if nico and nico.get("thumbUrl"):
        return nico, [nico["thumbUrl"].replace("http://", "https://")]
    return None

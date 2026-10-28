import concurrent.futures as cf
import json
import sys
from collections.abc import Iterator
from pathlib import Path

from .net import get

PAGE = 100
WORKERS = 4
API = "https://vocadb.net/api/songs"


def _url(artist_id: int, start: int, sort: str) -> str:
    return f"{API}?artistId%5B%5D={artist_id}&childVoicebanks=true&maxResults={PAGE}&start={start}&fields=PVs&sort={sort}&pvServices=NicoNicoDouga,Youtube&getTotalCount=true"


def _page(artist_id: int, start: int, sort: str) -> dict:
    url = _url(artist_id, start, sort)
    raw = get(url)
    if raw is None:
        raise RuntimeError(f"VocaDB の一覧を取れなかった: {url}")
    print(f"vocadb {sort} {start}", file=sys.stderr, flush=True)
    return json.loads(raw)


def _all(artist_id: int, total: int, sort: str) -> Iterator[dict]:
    first = _page(artist_id, 0, sort)
    count = min(total, first["totalCount"])
    with cf.ThreadPoolExecutor(WORKERS) as ex:
        rest = ex.map(lambda start: _page(artist_id, start, sort), range(PAGE, count, PAGE))
        for body in [first, *rest]:
            yield from body["items"]


def _added_since(artist_id: int, known: set[int]) -> Iterator[dict]:
    start = 0
    while True:
        items = _page(artist_id, start, "AdditionDate")["items"]
        yield from items
        if len(items) < PAGE or all(song["id"] in known for song in items):
            return
        start += PAGE


def songs(artist_id: int, cache: Path, limit: int | None) -> list[dict]:
    if limit is not None:
        return list({s["id"]: s for s in _all(artist_id, limit, "RatingScore")}.values())
    path = cache / "songs.json"
    known = {s["id"]: s for s in json.loads(path.read_text())} if path.exists() else {}
    fresh = _added_since(artist_id, set(known)) if known else _all(artist_id, sys.maxsize, "AdditionDate")
    merged = {**known, **{s["id"]: s for s in fresh}}
    cache.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(list(merged.values()), ensure_ascii=False))
    print(f"vocadb known={len(known)} now={len(merged)}", file=sys.stderr, flush=True)
    return sorted(merged.values(), key=lambda s: (-s.get("ratingScore", 0), s["id"]))


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

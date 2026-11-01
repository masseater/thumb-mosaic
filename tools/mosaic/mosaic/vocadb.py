import json
import sys
import time
from collections.abc import Iterator
from pathlib import Path

from .net import get

PAGE = 100
INTERVAL = 1.0
API = "https://vocadb.net/api/songs"


def _url(artist_id: int, start: int, sort: str, count: bool) -> str:
    return f"{API}?artistId%5B%5D={artist_id}&childVoicebanks=true&maxResults={PAGE}&start={start}&fields=PVs&sort={sort}&pvServices=NicoNicoDouga,Youtube&getTotalCount={str(count).lower()}"


def _page(artist_id: int, start: int, sort: str, count: bool = False) -> dict:
    url = _url(artist_id, start, sort, count)
    time.sleep(INTERVAL)
    raw = get(url)
    if raw is None:
        raise RuntimeError(f"VocaDB の一覧を取れなかった: {url}")
    print(f"vocadb {sort} {start}", file=sys.stderr, flush=True)
    return json.loads(raw)


def _all(artist_id: int, total: int, sort: str) -> Iterator[dict]:
    first = _page(artist_id, 0, sort, count=True)
    count = min(total, first["totalCount"])
    yield from first["items"]
    for start in range(PAGE, count, PAGE):
        yield from _page(artist_id, start, sort)["items"]


def _added_since(artist_id: int, known: set[int]) -> Iterator[dict]:
    start = 0
    while True:
        items = _page(artist_id, start, "AdditionDate")["items"]
        yield from items
        if len(items) < PAGE or all(song["id"] in known for song in items):
            return
        start += PAGE


def _fresh(artist_id: int, known: dict[int, dict]) -> dict[int, dict]:
    if not known:
        return {s["id"]: s for s in _all(artist_id, sys.maxsize, "AdditionDate")}
    try:
        return {s["id"]: s for s in _added_since(artist_id, set(known))}
    except RuntimeError as error:
        print(f"vocadb 差分を取れず前回の一覧のまま使う: {error}", file=sys.stderr, flush=True)
        return {}


def fetch_songs(artist_id: int, cache: Path, limit: int | None) -> None:
    path = cache / "songs.json"
    if limit is not None:
        merged = {s["id"]: s for s in _all(artist_id, limit, "RatingScore")}
        known: dict[int, dict] = {}
    else:
        known = {s["id"]: s for s in json.loads(path.read_text())} if path.exists() else {}
        merged = {**known, **_fresh(artist_id, known)}
    cache.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(list(merged.values()), ensure_ascii=False))
    print(f"vocadb known={len(known)} now={len(merged)}", file=sys.stderr, flush=True)


def load_songs(cache: Path) -> list[dict]:
    found = json.loads((cache / "songs.json").read_text())
    return sorted(found, key=lambda s: (-s.get("ratingScore", 0), s["id"]))


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

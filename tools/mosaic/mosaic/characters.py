import json
from dataclasses import dataclass
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[3] / "libs" / "mosaic" / "src" / "characters.json"


@dataclass(frozen=True)
class Character:
    slug: str
    name: str
    vocadb_artist_id: int
    target_url: str
    cols: int
    credit: str
    og: tuple[int, int, int]
    variants: int


CHARACTERS = {
    c["slug"]: Character(
        slug=c["slug"],
        name=c["name"],
        vocadb_artist_id=c["vocadbArtistId"],
        target_url=c["targetUrl"],
        cols=c["cols"],
        credit=c["credit"],
        og=(c["og"]["col"], c["og"]["row"], c["og"]["cols"]),
        variants=c["variants"],
    )
    for c in json.loads(SOURCE.read_text())
}

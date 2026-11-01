import json
from dataclasses import dataclass
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[3] / "libs" / "mosaic" / "src" / "characters.json"


@dataclass(frozen=True)
class Character:
    slug: str
    name: str
    vocadb_artist_id: int
    targets: tuple[tuple[str, str | None, int], ...]
    credit: str
    og: tuple[float, float, float]
    variants: int


CHARACTERS = {
    c["slug"]: Character(
        slug=c["slug"],
        name=c["name"],
        vocadb_artist_id=c["vocadbArtistId"],
        targets=tuple((t["url"], t.get("member"), t.get("alphaFloor", 0)) for t in c["targets"]),
        credit=c["credit"],
        og=(c["og"]["left"], c["og"]["top"], c["og"]["width"]),
        variants=c["variants"],
    )
    for c in json.loads(SOURCE.read_text())
}

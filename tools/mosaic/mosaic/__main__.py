import argparse
from pathlib import Path

from .characters import CHARACTERS
from .pool import build_pool
from .site import site
from .solve import solve

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parents[1]
DATA = REPO / "libs" / "mosaic" / "data"
PUBLIC = REPO / "apps" / "web" / "public" / "files"


def main() -> None:
    parser = argparse.ArgumentParser(prog="mosaic")
    parser.add_argument("step", choices=["pool", "solve", "site", "all"])
    parser.add_argument("characters", nargs="*", choices=sorted(CHARACTERS), help="省略すると全キャラクター")
    parser.add_argument("--limit", type=int, default=None, help="VocaDB から取る曲数の上限（評価順）")
    args = parser.parse_args()
    for slug in args.characters or sorted(CHARACTERS):
        ch = CHARACTERS[slug]
        cache = ROOT / ".cache" / slug
        data = DATA / slug
        if args.step in ("pool", "all"):
            build_pool(ch, cache, args.limit)
        if args.step in ("solve", "all"):
            solve(ch, cache, data)
        if args.step in ("site", "all"):
            site(ch, data, ROOT / ".cache" / "tiles", PUBLIC)


if __name__ == "__main__":
    main()

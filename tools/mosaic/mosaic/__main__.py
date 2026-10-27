import argparse
from pathlib import Path

from .build import build
from .characters import CHARACTERS
from .pool import build_pool
from .solve import solve

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(prog="mosaic")
    parser.add_argument("step", choices=["pool", "solve", "build", "all"])
    parser.add_argument("character", choices=sorted(CHARACTERS))
    parser.add_argument("--limit", type=int, default=None, help="VocaDB から取る曲数の上限（評価順）")
    args = parser.parse_args()
    ch = CHARACTERS[args.character]
    cache = ROOT / ".cache" / ch.slug
    out = ROOT / "out" / ch.slug
    if args.step in ("pool", "all"):
        build_pool(ch, cache, args.limit)
    if args.step in ("solve", "all"):
        solve(ch, cache, out)
    if args.step in ("build", "all"):
        build(ch, cache, out)


if __name__ == "__main__":
    main()

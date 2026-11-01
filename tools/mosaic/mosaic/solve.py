import io
import json
import sys
import time
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import min_weight_full_bipartite_matching

from .characters import Character
from .image import BLOCKS_X, BLOCKS_Y, TILE_ASPECT, oklab
from .net import get
from .pool import POOL_FILE

NEAREST = 300
RANDOM_EDGES = 24
RANDOM_PENALTY = 10.0
CHUNK = 2000
COVERAGE = 0.05
REUSE_PENALTY = 1.0
ERROR_SCALE = 10000
PART_GAP = 0.02
FILL = 0.85
MAX_CELLS = 8200
MIN_COLS = 8
MAX_COLS = 400


def _member(archive: bytes, name: str) -> bytes:
    with zipfile.ZipFile(io.BytesIO(archive), metadata_encoding="cp932") as z:
        return z.read(name)


def _part(url: str, member: str | None, alpha_floor: int) -> Image.Image:
    raw = get(url)
    if raw is None:
        raise RuntimeError(f"元画像を取れなかった: {url}")
    im = Image.open(io.BytesIO(_member(raw, member) if member else raw)).convert("RGBA")
    if alpha_floor:
        im.putalpha(im.getchannel("A").point(lambda a: a if a >= alpha_floor else 0))
    return im


def _side_by_side(parts: list[Image.Image]) -> Image.Image:
    trimmed = [p.crop(p.getchannel("A").getbbox()) for p in parts]
    height = max(p.height for p in trimmed)
    gap = round(height * PART_GAP)
    joined = Image.new("RGBA", (sum(p.width for p in trimmed) + gap * (len(trimmed) - 1), height), (0, 0, 0, 0))
    x = 0
    for p in trimmed:
        joined.paste(p, (x, height - p.height))
        x += p.width + gap
    return joined


def load_target(ch: Character, cache: Path) -> Image.Image:
    path = cache / "target.png"
    if not path.exists():
        parts = [_part(url, member, floor) for url, member, floor in ch.targets]
        (parts[0] if len(parts) == 1 else _side_by_side(parts)).save(path)
    return Image.open(path).convert("RGBA")


def _grid(src: Image.Image, cols: int) -> int:
    aw, ah = TILE_ASPECT
    return int(src.size[1] / (src.size[0] / cols * ah / aw))


def _covered(alpha: Image.Image, cols: int, rows: int) -> np.ndarray:
    cover = np.asarray(alpha.resize((cols, rows), Image.BOX), dtype=np.float64).ravel() / 255
    return np.where(cover > COVERAGE)[0]


def fit_cols(src: Image.Image, pool: int) -> int:
    alpha = src.getchannel("A")
    target = min(MAX_CELLS, int(pool * FILL))
    low, high = MIN_COLS, MAX_COLS
    while low < high:
        mid = (low + high + 1) // 2
        if len(_covered(alpha, mid, _grid(src, mid))) <= target:
            low = mid
        else:
            high = mid - 1
    return low


def target_cells(src: Image.Image, cols: int) -> tuple[int, np.ndarray, np.ndarray, np.ndarray]:
    alpha = src.getchannel("A")
    bg = Image.new("RGBA", src.size, (255, 255, 255, 255))
    bg.alpha_composite(src)
    rgb = bg.convert("RGB")
    rows = _grid(src, cols)
    big = rgb.resize((cols * BLOCKS_X * 4, rows * BLOCKS_Y * 4), Image.LANCZOS)
    grid = np.asarray(big.resize((cols * BLOCKS_X, rows * BLOCKS_Y), Image.BOX), dtype=np.float64)
    feats = oklab(grid).reshape(rows, BLOCKS_Y, cols, BLOCKS_X, 3).transpose(0, 2, 1, 3, 4).reshape(rows * cols, -1)
    cells = _covered(alpha, cols, rows)
    blocks = np.asarray(alpha.resize((cols * BLOCKS_X, rows * BLOCKS_Y), Image.BOX), dtype=np.float64) / 255
    weights = blocks.reshape(rows, BLOCKS_Y, cols, BLOCKS_X).transpose(0, 2, 1, 3).reshape(rows * cols, -1)
    return rows, cells, feats[cells].astype(np.float32), weights[cells].astype(np.float32)


def assign(cells: np.ndarray, weights: np.ndarray, pool: np.ndarray, penalty: np.ndarray) -> np.ndarray:
    n, m = len(cells), len(pool)
    if m < n:
        raise RuntimeError(f"サムネイルが足りない: マス {n} に対して {m} 枚")
    rng = np.random.default_rng(0)
    p2 = (pool**2).reshape(m, -1, 3).sum(2)
    ri, cj, vals = [], [], []
    for s in range(0, n, CHUNK):
        c = cells[s : s + CHUNK]
        w = weights[s : s + CHUNK]
        wc = c * np.repeat(w, 3, axis=1)
        d = (wc * c).sum(1)[:, None] + w @ p2.T - 2 * wc @ pool.T + penalty[None, :]
        k = min(NEAREST, m - 1)
        nn = np.argpartition(d, k, axis=1)[:, :k]
        j = np.concatenate([nn, rng.integers(0, m, size=(len(c), RANDOM_EDGES))], 1)
        v = np.maximum(np.take_along_axis(d, j, 1), 0) + 1e-6
        v[:, k:] += RANDOM_PENALTY
        ri.append(np.repeat(np.arange(s, s + len(c)), j.shape[1]))
        cj.append(j.ravel())
        vals.append(v.ravel())
    graph = csr_matrix((np.concatenate(vals).astype(np.float64), (np.concatenate(ri), np.concatenate(cj))), shape=(n, m))
    r, c = min_weight_full_bipartite_matching(graph)
    out = np.empty(n, dtype=np.int64)
    out[r] = c
    if len(set(out.tolist())) != n:
        raise RuntimeError("同じサムネイルが 2 マス以上に割り当てられた")
    return out


SERVICE_LABEL = {"Youtube": "YouTube", "NicoNicoDouga": "ニコニコ"}


def variant_path(data: Path, variant: int) -> Path:
    return data / f"{variant}.json"


def solve(ch: Character, cache: Path, data: Path) -> None:
    pool = np.load(cache / "features.npy")
    entries = json.loads((cache / POOL_FILE).read_text())
    src = load_target(ch, cache)
    cols = fit_cols(src, len(pool))
    rows, cells, cfeats, weights = target_cells(src, cols)
    uses = np.zeros(len(pool))
    reuse = 0.0
    data.mkdir(parents=True, exist_ok=True)
    for variant in range(ch.variants):
        started = time.time()
        chosen = assign(cfeats, weights, pool, reuse * uses)
        uses[chosen] += 1
        if variant == 0:
            reuse = REUSE_PENALTY * float(np.median(((cfeats - pool[chosen]) ** 2 * np.repeat(weights, 3, axis=1)).sum(1)))
        _write(ch, entries, (cols, rows, cells, cfeats, weights), (pool, chosen), variant_path(data, variant))
        print(f"solve variant={variant} seconds={time.time() - started:.1f}", file=sys.stderr)


def _write(ch: Character, entries: list[dict], target: tuple, picks: tuple, path: Path) -> None:
    cols, rows, cells, cfeats, weights = target
    pool, chosen = picks
    per_block = np.sqrt(((cfeats - pool[chosen]) ** 2).reshape(len(cells), BLOCKS_X * BLOCKS_Y, 3).sum(2))
    delta = (per_block * weights).sum() / weights.sum()
    errors = (per_block * weights).sum(1) / np.maximum(weights.sum(1), np.finfo(np.float32).tiny)
    picked = sorted(zip(cells.tolist(), chosen.tolist()))
    tiles = [entries[p] for _, p in picked]
    assignment = {
        "character": ch.name,
        "credit": ch.credit,
        "cols": cols,
        "rows": rows,
        "pool": len(pool),
        "meanDelta": round(float(delta), 4),
        "tiles": [[c, e["name"], e["artist"], e["url"], SERVICE_LABEL[e["service"]]] for (c, _), e in zip(picked, tiles)],
        "errors": [round(float(e) * ERROR_SCALE) for e in errors],
        "fallbacks": [e["thumbs"][0] if e["service"] == "NicoNicoDouga" else "" for e in tiles],
    }
    path.write_text(json.dumps(assignment, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"solve {path.name} cols={cols} cells={len(cells)} pool={len(pool)} meanDelta={delta:.4f}", file=sys.stderr)

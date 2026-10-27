import json
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import min_weight_full_bipartite_matching

from .characters import Character
from .image import BLOCKS_X, BLOCKS_Y, TILE_ASPECT, oklab
from .net import get

NEAREST = 300
RANDOM_EDGES = 24
RANDOM_PENALTY = 10.0
CHUNK = 2000
COVERAGE = 0.05
MASK_CELL = (16, 9)
MASK_LEVELS = 16


def load_target(ch: Character, cache: Path) -> Image.Image:
    path = cache / "target.png"
    if not path.exists():
        raw = get(ch.target_url)
        if raw is None:
            raise RuntimeError(f"元画像を取れなかった: {ch.target_url}")
        path.write_bytes(raw)
    return Image.open(path).convert("RGBA")


def target_cells(ch: Character, cache: Path) -> tuple[int, np.ndarray, np.ndarray, np.ndarray, Image.Image]:
    src = load_target(ch, cache)
    alpha = src.getchannel("A")
    bg = Image.new("RGBA", src.size, (255, 255, 255, 255))
    bg.alpha_composite(src)
    rgb = bg.convert("RGB")
    aw, ah = TILE_ASPECT
    rows = int(src.size[1] / (src.size[0] / ch.cols * ah / aw))
    big = rgb.resize((ch.cols * BLOCKS_X * 4, rows * BLOCKS_Y * 4), Image.LANCZOS)
    grid = np.asarray(big.resize((ch.cols * BLOCKS_X, rows * BLOCKS_Y), Image.BOX), dtype=np.float64)
    feats = oklab(grid).reshape(rows, BLOCKS_Y, ch.cols, BLOCKS_X, 3).transpose(0, 2, 1, 3, 4).reshape(rows * ch.cols, -1)
    cover = np.asarray(alpha.resize((ch.cols, rows), Image.BOX), dtype=np.float64).ravel() / 255
    cells = np.where(cover > COVERAGE)[0]
    blocks = np.asarray(alpha.resize((ch.cols * BLOCKS_X, rows * BLOCKS_Y), Image.BOX), dtype=np.float64) / 255
    weights = blocks.reshape(rows, BLOCKS_Y, ch.cols, BLOCKS_X).transpose(0, 2, 1, 3).reshape(rows * ch.cols, -1)
    step = 255 / (MASK_LEVELS - 1)
    shape = alpha.resize((ch.cols * MASK_CELL[0], rows * MASK_CELL[1]), Image.LANCZOS).point(lambda v: round(round(v / step) * step))
    mask = Image.new("RGBA", shape.size, (0, 0, 0, 0))
    mask.putalpha(shape)
    return rows, cells, feats[cells].astype(np.float32), weights[cells].astype(np.float32), mask


def assign(cells: np.ndarray, weights: np.ndarray, pool: np.ndarray) -> np.ndarray:
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
        d = (wc * c).sum(1)[:, None] + w @ p2.T - 2 * wc @ pool.T
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


def mask_path(data: Path) -> Path:
    return data.with_suffix(".mask.webp")


def solve(ch: Character, cache: Path, data: Path) -> None:
    pool = np.load(cache / "features.npy")
    entries = json.loads((cache / "pool.json").read_text())
    rows, cells, cfeats, weights, mask = target_cells(ch, cache)
    started = time.time()
    chosen = assign(cfeats, weights, pool)
    per_block = np.sqrt(((cfeats - pool[chosen]) ** 2).reshape(len(cells), BLOCKS_X * BLOCKS_Y, 3).sum(2))
    delta = (per_block * weights).sum() / weights.sum()
    picked = sorted(zip(cells.tolist(), chosen.tolist()))
    tiles = [entries[p] for _, p in picked]
    assignment = {
        "character": ch.name,
        "credit": ch.credit,
        "cols": ch.cols,
        "rows": rows,
        "pool": len(pool),
        "meanDelta": round(float(delta), 4),
        "tiles": [[c, e["name"], e["artist"], e["url"], SERVICE_LABEL[e["service"]]] for (c, _), e in zip(picked, tiles)],
        "fallbacks": [e["thumbs"][0] if e["service"] == "NicoNicoDouga" else "" for e in tiles],
    }
    data.parent.mkdir(parents=True, exist_ok=True)
    mask.save(mask_path(data), lossless=True, method=6)
    data.write_text(json.dumps(assignment, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"solve cells={len(cells)} pool={len(pool)} meanDelta={delta:.4f} seconds={time.time() - started:.1f}", file=sys.stderr)

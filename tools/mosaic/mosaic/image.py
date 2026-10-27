import numpy as np
from PIL import Image

BLOCKS_X, BLOCKS_Y = 4, 3
TILE_ASPECT = (16, 9)

_M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
_M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])


def oklab(rgb: np.ndarray) -> np.ndarray:
    c = rgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return np.cbrt(c @ _M1.T) @ _M2.T


def crop_to_tile(im: Image.Image) -> Image.Image:
    w, h = im.size
    aw, ah = TILE_ASPECT
    if w * ah > h * aw:
        nw = h * aw // ah
        return im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    nh = w * ah // aw
    return im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))


def features(im: Image.Image) -> np.ndarray:
    return oklab(np.asarray(im.resize((BLOCKS_X, BLOCKS_Y), Image.BOX), dtype=np.float64)).ravel()


def dhash(im: Image.Image) -> bytes:
    g = np.asarray(im.convert("L").resize((9, 8), Image.BOX), dtype=np.int16)
    return np.packbits(g[:, 1:] > g[:, :-1]).tobytes()

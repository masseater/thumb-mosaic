import type { Tile } from "@thumb-mosaic/mosaic";
import { Array, String, pipe } from "effect";

const MAX_RESULTS = 8;

interface Hit {
  readonly tile: number;
  readonly name: string;
  readonly artist: string;
}

const normalize = (text: string): string =>
  pipe(text, String.normalize("NFKC"), String.toLowerCase);

const searchTiles = ({
  tiles,
  query,
}: Readonly<{ tiles: readonly (typeof Tile.Type)[]; query: string }>): readonly Hit[] => {
  const needle = normalize(String.trim(query));
  return pipe(
    tiles,
    Array.map(([, name, artist], tile): Hit => ({ tile, name, artist })),
    Array.filter((hit) => pipe(normalize(`${hit.name} ${hit.artist}`), String.includes(needle))),
    Array.take(MAX_RESULTS),
  );
};

const hasQuery = (query: string): boolean => String.isNonEmpty(normalize(String.trim(query)));

export type { Hit };
export { hasQuery, searchTiles };

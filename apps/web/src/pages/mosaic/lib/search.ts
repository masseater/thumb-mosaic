import { Array, String, pipe } from "effect";

import type { Mosaic } from "./sprites";

const MAX_RESULTS = 8;

interface Hit {
  readonly tile: number;
  readonly name: string;
  readonly artist: string;
}

const normalize = (text: string): string =>
  pipe(text, String.normalize("NFKC"), String.toLowerCase);

const searchTiles = ({
  mosaic,
  query,
}: Readonly<{ mosaic: Mosaic; query: string }>): readonly Hit[] => {
  const needle = normalize(String.trim(query));
  return pipe(
    mosaic.tiles,
    Array.map(([, name, artist], tile): Hit => ({ tile, name, artist })),
    Array.filter((hit) => pipe(normalize(`${hit.name} ${hit.artist}`), String.includes(needle))),
    Array.take(MAX_RESULTS),
  );
};

const hasQuery = (query: string): boolean => String.isNonEmpty(normalize(String.trim(query)));

export type { Hit };
export { hasQuery, searchTiles };

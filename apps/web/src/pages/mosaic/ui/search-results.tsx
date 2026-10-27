import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { searchTiles } from "#/pages/mosaic/lib/search";
import { useTiles } from "#/pages/mosaic/model/tiles";

import { SearchResult } from "./search-result";

const NOTHING = "見つかりませんでした";

const SearchResults = ({ query }: Readonly<{ query: string }>): ReactNode => {
  const tiles = useTiles();
  const hits = searchTiles({ tiles, query });
  return (
    <ul className="bg-background/95 absolute inset-x-0 top-10 flex flex-col rounded-md border py-1 text-sm shadow-lg backdrop-blur">
      {Array.isReadonlyArrayEmpty(hits) && (
        <li className="text-muted-foreground px-3 py-2">{NOTHING}</li>
      )}
      {pipe(
        hits,
        Array.map((hit) => <SearchResult key={hit.tile} hit={hit} />),
      )}
    </ul>
  );
};

export { SearchResults };

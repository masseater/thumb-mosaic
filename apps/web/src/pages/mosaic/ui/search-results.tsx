import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { searchTiles } from "#/pages/mosaic/lib/search";
import type { Mosaic } from "#/pages/mosaic/lib/sprites";

import { SearchResult } from "./search-result";

const NOTHING = "見つかりませんでした";

const SearchResults = ({
  mosaic,
  query,
}: Readonly<{ mosaic: Mosaic; query: string }>): ReactNode => {
  const hits = searchTiles({ mosaic, query });
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

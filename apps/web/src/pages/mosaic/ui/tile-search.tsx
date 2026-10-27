import type { ChangeEventHandler, ReactNode } from "react";
import { useCallback } from "react";

import { hasQuery } from "#/pages/mosaic/lib/search";
import type { Mosaic } from "#/pages/mosaic/lib/sprites";
import { useSearch, useSetSearch } from "#/pages/mosaic/model/viewer";

import { SearchResults } from "./search-results";

const PLACEHOLDER = "曲名やボカロPで探す";

const TileSearch = ({ mosaic }: Readonly<{ mosaic: Mosaic }>): ReactNode => {
  const query = useSearch();
  const setQuery = useSetSearch();
  const change = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );
  return (
    <div className="relative w-full sm:w-72">
      <input
        type="search"
        value={query}
        onChange={change}
        placeholder={PLACEHOLDER}
        aria-label={PLACEHOLDER}
        className="bg-background/90 h-9 w-full rounded-md border px-3 text-sm backdrop-blur"
      />
      {hasQuery(query) && <SearchResults mosaic={mosaic} query={query} />}
    </div>
  );
};

export { TileSearch };

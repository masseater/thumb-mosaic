import type { ReactNode } from "react";

import { TileSearch } from "./tile-search";

const MosaicToolbar = (): ReactNode => (
  <header className="absolute inset-x-4 top-4 flex justify-end">
    <TileSearch />
  </header>
);

export { MosaicToolbar };

import type { ReactNode } from "react";

import { TileSearch } from "./tile-search";

const MosaicToolbar = (): ReactNode => (
  <header className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-6 absolute inset-x-4 top-4 flex justify-end duration-700 ease-out">
    <TileSearch />
  </header>
);

export { MosaicToolbar };

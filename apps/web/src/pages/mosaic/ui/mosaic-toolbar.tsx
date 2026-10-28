import type { ReactNode } from "react";

import { MosaicActions } from "./mosaic-actions";
import { TileSearch } from "./tile-search";

const MosaicToolbar = ({ slug, seed }: Readonly<{ slug: string; seed: number }>): ReactNode => (
  <header className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-6 absolute inset-x-4 top-4 flex justify-end gap-2 duration-700 ease-out">
    <MosaicActions slug={slug} seed={seed} />
    <TileSearch />
  </header>
);

export { MosaicToolbar };

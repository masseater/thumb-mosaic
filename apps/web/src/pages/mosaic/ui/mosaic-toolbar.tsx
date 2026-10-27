import type { ReactNode } from "react";

import type { Mosaic } from "#/pages/mosaic/lib/sprites";

import { CreditsLink } from "./credits-link";
import { FitButton } from "./fit-button";
import { MosaicTitle } from "./mosaic-title";
import { ReplayButton } from "./replay-button";
import { TileSearch } from "./tile-search";

const MosaicToolbar = ({ mosaic, slug }: Readonly<{ mosaic: Mosaic; slug: string }>): ReactNode => (
  <header className="absolute inset-x-4 top-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <MosaicTitle character={mosaic.character} count={mosaic.tiles.length} />
    <div className="flex flex-wrap items-start gap-2">
      <TileSearch mosaic={mosaic} />
      <FitButton />
      <ReplayButton />
      <CreditsLink slug={slug} />
    </div>
  </header>
);

export { MosaicToolbar };

import type { ReactNode } from "react";

import { CreditsLink } from "./credits-link";
import { FitButton } from "./fit-button";
import { ReplayButton } from "./replay-button";
import { TileSearch } from "./tile-search";

const MosaicToolbar = ({ slug }: Readonly<{ slug: string }>): ReactNode => (
  <header className="absolute inset-x-4 top-4 flex justify-end">
    <div className="flex flex-wrap items-start gap-2">
      <TileSearch />
      <FitButton />
      <ReplayButton />
      <CreditsLink slug={slug} />
    </div>
  </header>
);

export { MosaicToolbar };

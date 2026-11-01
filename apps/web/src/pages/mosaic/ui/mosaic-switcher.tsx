import { CHARACTERS } from "@thumb-mosaic/mosaic";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { SwitcherLink } from "./switcher-link";

const MosaicSwitcher = ({ slug }: Readonly<{ slug: string }>): ReactNode => (
  <nav className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 text-muted-foreground bg-background/80 absolute inset-x-2 bottom-14 flex gap-3 overflow-x-auto rounded-md px-2 py-2 text-xs whitespace-nowrap backdrop-blur duration-700 ease-out sm:inset-x-auto sm:right-2 sm:bottom-2 sm:max-h-96 sm:flex-col sm:items-end sm:gap-1 sm:overflow-x-visible sm:overflow-y-auto">
    {pipe(
      CHARACTERS,
      Array.map((character) => (
        <SwitcherLink
          key={character.slug}
          slug={character.slug}
          current={character.slug === slug}
        />
      )),
    )}
  </nav>
);

export { MosaicSwitcher };

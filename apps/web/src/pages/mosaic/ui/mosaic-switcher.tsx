import { CHARACTERS } from "@thumb-mosaic/mosaic";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { SwitcherLink } from "./switcher-link";

const MosaicSwitcher = (): ReactNode => (
  <nav className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 text-muted-foreground absolute bottom-12 left-0 flex flex-col gap-1 px-4 py-3 text-xs duration-700 ease-out sm:bottom-0">
    {pipe(
      CHARACTERS,
      Array.map((character) => <SwitcherLink key={character.slug} slug={character.slug} />),
    )}
  </nav>
);

export { MosaicSwitcher };

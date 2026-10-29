import { CHARACTERS } from "@thumb-mosaic/mosaic";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { SwitcherLink } from "./switcher-link";

const MosaicSwitcher = (): ReactNode => (
  <nav className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 bg-background/80 text-muted-foreground absolute bottom-12 left-2 flex flex-col gap-1 rounded-md px-2 py-2 text-xs backdrop-blur duration-700 ease-out sm:bottom-2">
    {pipe(
      CHARACTERS,
      Array.map((character) => <SwitcherLink key={character.slug} slug={character.slug} />),
    )}
  </nav>
);

export { MosaicSwitcher };

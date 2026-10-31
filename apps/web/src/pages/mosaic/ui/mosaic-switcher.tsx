import { CHARACTERS } from "@thumb-mosaic/mosaic";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { SwitcherChevron } from "./switcher-chevron";
import { SwitcherLink } from "./switcher-link";

const MosaicSwitcher = ({ slug }: Readonly<{ slug: string }>): ReactNode => (
  <details className="group motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 text-muted-foreground absolute bottom-12 left-2 text-xs duration-700 ease-out sm:bottom-2">
    <summary className="bg-background/80 text-foreground flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-2 font-medium backdrop-blur [&::-webkit-details-marker]:hidden">
      {slug}
      <SwitcherChevron />
    </summary>
    <nav className="bg-background/80 absolute bottom-full left-0 mb-1 flex max-h-96 flex-col gap-1 overflow-y-auto rounded-md px-2 py-2 backdrop-blur">
      {pipe(
        CHARACTERS,
        Array.map((character) => <SwitcherLink key={character.slug} slug={character.slug} />),
      )}
    </nav>
  </details>
);

export { MosaicSwitcher };

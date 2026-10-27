import { CHARACTERS } from "@thumb-mosaic/mosaic";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { CharacterLink } from "./character-link";
import { GalleryIntro } from "./gallery-intro";

const GalleryPage = (): ReactNode => (
  <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
    <GalleryIntro />
    <ul className="flex flex-col gap-2">
      {pipe(
        CHARACTERS,
        Array.map((character) => (
          <CharacterLink key={character.slug} slug={character.slug} name={character.name} />
        )),
      )}
    </ul>
  </main>
);

export { GalleryPage };

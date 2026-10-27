import { getRouteApi } from "@tanstack/react-router";
import { CHARACTERS } from "@thumb-mosaic/mosaic";
import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { CreditsList } from "./credits-list";

const route = getRouteApi("/$slug_/credits");

const HEADING = "クレジット";
const SOURCES = [
  "VocaDB API",
  "YouTube API",
  "i.ytimg.com",
  "ニコニコ動画API",
  "nicovideo.cdn.nimg.jp",
] as const;

const creditOf = (slug: string): readonly string[] =>
  pipe(
    Array.findFirst(CHARACTERS, (character) => character.slug === slug),
    Option.map((character) => [character.credit]),
    Option.getOrElse((): readonly string[] => []),
  );

const CreditsPage = (): ReactNode => {
  const { slug } = route.useParams();
  const tiles = route.useLoaderData();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6 text-sm sm:p-8">
      <h1 className="text-2xl font-bold">{HEADING}</h1>
      <ul className="text-muted-foreground flex flex-col gap-1">
        {pipe(
          [...creditOf(slug), ...SOURCES],
          Array.map((line) => <li key={line}>{line}</li>),
        )}
      </ul>
      <CreditsList tiles={tiles} />
    </main>
  );
};

export { CreditsPage };

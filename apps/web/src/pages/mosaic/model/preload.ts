import type { QueryClient } from "@tanstack/react-query";
import { Array, Effect, Option, pipe } from "effect";

import { mosaicTitle, slugFile, variantFile } from "#/pages/mosaic/lib/files";
import type { Visit } from "#/pages/mosaic/lib/files";
import { BASE_PATH, SITE_ORIGIN } from "#/shared/config";

import { loadVisit } from "./visit";
import type { Assignment, Loaded } from "./visit";

const OVERVIEW = 0;
const BEST_VARIANT = 0;
const BLOCK_FILE = 2;

interface Card {
  readonly title: string;
  readonly description: string;
  readonly image: string;
  readonly url: string;
}

interface Preload extends Assignment {
  readonly images: readonly string[];
  readonly card: Option.Option<Card>;
}

interface PreloadLink {
  readonly rel: "preload";
  readonly as: "image";
  readonly href: string;
  readonly fetchPriority: "high";
}

type Meta =
  | Readonly<{ title: string }>
  | Readonly<{ name: string; content: string }>
  | Readonly<{ property: string; content: string }>;

interface Head {
  links: PreloadLink[];
  meta: Meta[];
}

const overviewImages = (visit: Omit<Visit, "seed" | "choice">): readonly string[] =>
  pipe(
    Array.get(visit.mosaic.levels, OVERVIEW),
    Option.map((level) =>
      pipe(
        level.blocks,
        Array.map((block) => variantFile(visit)(BEST_VARIANT, block[BLOCK_FILE])),
      ),
    ),
    Option.getOrElse((): readonly string[] => []),
  );

const cardOf = ({ mosaic, slug }: Omit<Visit, "seed" | "choice">): Card => ({
  title: mosaicTitle(slug),
  description: `動画のサムネイルを一枚ずつ並べて描いた${mosaic.character}`,
  image: `${SITE_ORIGIN}${slugFile({ slug, file: mosaic.og })}`,
  url: `${SITE_ORIGIN}${BASE_PATH}/${slug}`,
});

const preloadOf = (slug: string, { seed, choice, mosaic }: Loaded): Preload => ({
  seed,
  choice,
  images: Option.match(mosaic, {
    onNone: (): readonly string[] => [],
    onSome: (found) => overviewImages({ slug, mosaic: found }),
  }),
  card: pipe(
    mosaic,
    Option.map((found) => cardOf({ slug, mosaic: found })),
  ),
});

const loadMosaic = ({
  queryClient,
  slug,
  seed,
}: Readonly<{
  queryClient: QueryClient;
  slug: string;
  seed: Option.Option<number>;
}>): Promise<Preload> =>
  Effect.runPromise(
    loadVisit({ queryClient, slug, seed }).pipe(Effect.map((loaded) => preloadOf(slug, loaded))),
  );

const preloadLink = (href: string): PreloadLink => ({
  rel: "preload",
  as: "image",
  href,
  fetchPriority: "high",
});

const cardMeta = (card: Card): Meta[] => [
  { title: card.title },
  { name: "description", content: card.description },
  { property: "og:type", content: "website" },
  { property: "og:title", content: card.title },
  { property: "og:description", content: card.description },
  { property: "og:image", content: card.image },
  { property: "og:url", content: card.url },
  { name: "twitter:card", content: "summary_large_image" },
];

const mosaicHead = (preload: Preload | undefined): Head =>
  Option.match(Option.fromNullishOr(preload), {
    onNone: (): Head => ({ links: [], meta: [] }),
    onSome: ({ images, card }): Head => ({
      links: pipe(images, Array.map(preloadLink)),
      meta: pipe(
        card,
        Option.map(cardMeta),
        Option.getOrElse((): Meta[] => []),
      ),
    }),
  });

export { loadMosaic, mosaicHead };

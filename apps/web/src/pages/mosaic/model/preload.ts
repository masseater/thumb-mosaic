import type { QueryClient } from "@tanstack/react-query";
import { CHARACTERS } from "@thumb-mosaic/mosaic";
import type { VariantRef } from "@thumb-mosaic/mosaic";
import { Array, Effect, Option, Random, pipe } from "effect";

import { bundledMosaic } from "#/pages/mosaic/api/bundled";
import { mosaicQuery } from "#/pages/mosaic/api/queries";
import type { Mosaic } from "#/pages/mosaic/api/queries";
import { filesBase } from "#/pages/mosaic/lib/files";
import { BASE_PATH, SITE_ORIGIN } from "#/shared/config";

const OVERVIEW = 0;
const SINGLE = 1;
const FIRST = 0;
const BLOCK_FILE = 2;

interface Card {
  readonly title: string;
  readonly description: string;
  readonly image: string;
  readonly url: string;
}

interface Preload {
  readonly variant: number;
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

const overviewImages = ({
  mosaic,
  slug,
}: Readonly<{ mosaic: Mosaic; slug: string }>): readonly string[] => {
  const base = filesBase({ slug, mosaic });
  return pipe(
    Array.get(mosaic.levels, OVERVIEW),
    Option.map((level) =>
      pipe(
        level.blocks,
        Array.map((block) => `${base}/${block[BLOCK_FILE]}`),
      ),
    ),
    Option.getOrElse((): readonly string[] => []),
  );
};

const cardOf = ({ mosaic, slug }: Readonly<{ mosaic: Mosaic; slug: string }>): Card => ({
  title: `${slug}.mosaic`,
  description: `動画のサムネイルを一枚ずつ並べて描いた${mosaic.character}`,
  image: `${SITE_ORIGIN}${filesBase({ slug, mosaic })}/${mosaic.og}`,
  url: `${SITE_ORIGIN}${BASE_PATH}/${slug}`,
});

const variantsOf = (slug: string): number =>
  pipe(
    Array.findFirst(CHARACTERS, (character) => character.slug === slug),
    Option.match({ onNone: () => SINGLE, onSome: (character) => character.variants }),
  );

const preloadOf = ({
  queryClient,
  ref,
}: Readonly<{ queryClient: QueryClient; ref: VariantRef }>): Preload =>
  Option.match(bundledMosaic(ref), {
    onNone: (): Preload => ({ variant: ref.variant, images: [], card: Option.none() }),
    onSome: (mosaic) => {
      queryClient.setQueryData(mosaicQuery(ref).queryKey, mosaic);
      return {
        variant: ref.variant,
        images: overviewImages({ mosaic, slug: ref.slug }),
        card: Option.some(cardOf({ mosaic, slug: ref.slug })),
      };
    },
  });

const loadMosaic = ({
  queryClient,
  slug,
}: Readonly<{ queryClient: QueryClient; slug: string }>): Promise<Preload> => {
  const pick = Random.nextIntBetween(FIRST, variantsOf(slug), { halfOpen: true });
  return Effect.runPromise(
    pick.pipe(Effect.map((variant) => preloadOf({ queryClient, ref: { slug, variant } }))),
  );
};

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

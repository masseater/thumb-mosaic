import type { QueryClient } from "@tanstack/react-query";
import { Array, Option, pipe } from "effect";

import { bundledMosaic, mosaicQuery } from "#/entities/mosaic";
import type { Mosaic } from "#/entities/mosaic";
import { filesBase } from "#/pages/mosaic/lib/files";
import { BASE_PATH, SITE_ORIGIN } from "#/shared/config";

const OVERVIEW = 0;
const BLOCK_FILE = 2;

interface Card {
  readonly title: string;
  readonly description: string;
  readonly image: string;
  readonly url: string;
}

interface Preload {
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
  const base = filesBase({ slug, version: mosaic.version });
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
  title: `${mosaic.character}のサムネイルモザイク`,
  description: `${mosaic.cells.length.toLocaleString("ja-JP")} 本の動画のサムネイルを一枚ずつ並べて描いた${mosaic.character}`,
  image: `${SITE_ORIGIN}${filesBase({ slug, version: mosaic.version })}/${mosaic.og}`,
  url: `${SITE_ORIGIN}${BASE_PATH}/${slug}`,
});

const loadMosaic = ({
  queryClient,
  slug,
}: Readonly<{ queryClient: QueryClient; slug: string }>): Preload =>
  Option.match(bundledMosaic(slug), {
    onNone: (): Preload => ({ images: [], card: Option.none() }),
    onSome: (mosaic) => {
      queryClient.setQueryData(mosaicQuery(slug).queryKey, mosaic);
      return {
        images: overviewImages({ mosaic, slug }),
        card: Option.some(cardOf({ mosaic, slug })),
      };
    },
  });

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

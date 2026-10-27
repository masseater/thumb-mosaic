import type { QueryClient } from "@tanstack/react-query";
import { Array, Option, pipe } from "effect";

import { bundledMosaic, mosaicQuery } from "#/entities/mosaic";
import type { Mosaic } from "#/entities/mosaic";
import { filesBase } from "#/pages/mosaic/lib/files";

const OVERVIEW = 0;
const BLOCK_FILE = 2;

interface Preload {
  readonly images: readonly string[];
}

interface PreloadLink {
  readonly rel: "preload";
  readonly as: "image";
  readonly href: string;
  readonly fetchPriority: "high";
}

const overviewImages = ({
  mosaic,
  slug,
}: Readonly<{ mosaic: Mosaic; slug: string }>): readonly string[] => {
  const base = filesBase({ slug, version: mosaic.version });
  const sheets = pipe(
    Array.get(mosaic.levels, OVERVIEW),
    Option.map((level) =>
      pipe(
        level.blocks,
        Array.map((block) => block[BLOCK_FILE]),
      ),
    ),
    Option.getOrElse((): readonly string[] => []),
  );
  return pipe(
    [mosaic.mask, ...sheets],
    Array.map((file) => `${base}/${file}`),
  );
};

const loadMosaic = ({
  queryClient,
  slug,
}: Readonly<{ queryClient: QueryClient; slug: string }>): Preload => ({
  images: Option.match(bundledMosaic(slug), {
    onNone: (): readonly string[] => [],
    onSome: (mosaic) => {
      queryClient.setQueryData(mosaicQuery(slug).queryKey, mosaic);
      return overviewImages({ mosaic, slug });
    },
  }),
});

const mosaicHead = (preload: Preload | undefined): { links: PreloadLink[] } => ({
  links: pipe(
    Option.fromNullishOr(preload),
    Option.map(({ images }) =>
      pipe(
        images,
        Array.map((href): PreloadLink => ({
          rel: "preload",
          as: "image",
          href,
          fetchPriority: "high",
        })),
      ),
    ),
    Option.getOrElse((): PreloadLink[] => []),
  ),
});

export { loadMosaic, mosaicHead };

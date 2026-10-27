import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Array, Option, pipe } from "effect";

import { mosaicQuery, tileChunkQuery, tilesQuery } from "#/pages/mosaic/api/queries";
import type { Mosaic, TileList } from "#/pages/mosaic/api/queries";

const NO_TILES: TileList = [];
const FIRST = 0;

const route = getRouteApi("/$slug");

const useMosaic = (): Readonly<{ slug: string; mosaic: Mosaic }> => {
  const { slug } = route.useParams();
  const { variant } = route.useLoaderData();
  return { slug, mosaic: useSuspenseQuery(mosaicQuery({ slug, variant })).data };
};

const useTiles = (): TileList => {
  const { slug, mosaic } = useMosaic();
  return useQuery(tilesQuery({ slug, ...mosaic })).data ?? NO_TILES;
};

const useTile = (index: Option.Option<number>): Option.Option<TileList[number]> => {
  const { slug, mosaic } = useMosaic();
  const query = useQuery({
    ...tileChunkQuery({
      slug,
      ...mosaic,
      index: Option.getOrElse(index, () => FIRST),
    }),
    enabled: Option.isSome(index),
  });
  return pipe(
    index,
    Option.flatMap((at) => Array.get(query.data ?? NO_TILES, at % mosaic.chunk.size)),
  );
};

export { useTile, useTiles };

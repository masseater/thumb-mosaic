import { useQueries, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Array, Option, pipe } from "effect";

import { mosaicQuery, tileChunkQuery, tilesQuery } from "#/pages/mosaic/api/queries";
import type { TileList } from "#/pages/mosaic/api/queries";
import { variantOf } from "#/pages/mosaic/lib/files";
import type { Visit } from "#/pages/mosaic/lib/files";

const NO_TILES: TileList = [];
const FIRST = 0;
const NEXT = 1;

const route = getRouteApi("/$slug");

const useVisit = (): Visit => {
  const { slug } = route.useParams();
  const { seed, choice } = route.useLoaderData();
  return { slug, seed, choice, mosaic: useSuspenseQuery(mosaicQuery(slug)).data };
};

const visitTiles =
  (visit: Visit) =>
  (lists: readonly TileList[]): TileList =>
    pipe(
      visit.choice,
      Array.map((variant, index) =>
        pipe(
          Array.get(lists, variant),
          Option.flatMap((list) => Array.get(list, index)),
        ),
      ),
      Array.getSomes,
    );

const useTiles = (): TileList => {
  const visit = useVisit();
  const variants = Array.range(FIRST, visit.mosaic.variants.length - NEXT);
  return useQueries({
    queries: pipe(
      variants,
      Array.map((variant) => tilesQuery({ ...visit, variant })),
    ),
    combine: (results) =>
      visitTiles(visit)(
        pipe(
          results,
          Array.map((result) => result.data ?? NO_TILES),
        ),
      ),
  });
};

const useTile = (index: Option.Option<number>): Option.Option<TileList[number]> => {
  const visit = useVisit();
  const at = Option.getOrElse(index, () => FIRST);
  const query = useQuery({
    ...tileChunkQuery({ ...visit, variant: variantOf({ visit, index: at }), index: at }),
    enabled: Option.isSome(index),
  });
  return pipe(
    index,
    Option.flatMap((found) => Array.get(query.data ?? NO_TILES, found % visit.mosaic.chunk.size)),
  );
};

export { useTile, useTiles };

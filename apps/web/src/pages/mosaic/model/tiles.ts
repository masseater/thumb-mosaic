import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { mosaicQuery, tilesQuery } from "#/entities/mosaic";
import type { TileList } from "#/entities/mosaic";

const NO_TILES: TileList = [];

const route = getRouteApi("/$slug");

const useTiles = (): TileList => {
  const { slug } = route.useParams();
  const mosaic = useSuspenseQuery(mosaicQuery(slug)).data;
  return (
    useQuery(tilesQuery({ slug, version: mosaic.version, tiles: mosaic.tiles })).data ?? NO_TILES
  );
};

export { useTiles };

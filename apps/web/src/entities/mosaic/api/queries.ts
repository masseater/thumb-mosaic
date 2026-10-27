import { PublishedMosaic, Tiles, manifestPath, versionPath } from "@thumb-mosaic/mosaic";
import { Effect, ManagedRuntime } from "effect";
import type { Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { BASE_PATH } from "#/shared/config";

type Mosaic = typeof PublishedMosaic.Type;
type TileList = typeof Tiles.Type;
type FetchError = HttpClientError.HttpClientError | Schema.SchemaError;

interface Query<Value> {
  readonly queryKey: readonly string[];
  readonly queryFn: (context: Readonly<{ signal: AbortSignal }>) => Promise<Value>;
  readonly staleTime: number;
}

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

const fetchMosaic = (slug: string): Effect.Effect<Mosaic, FetchError, HttpClient.HttpClient> =>
  HttpClient.get(`${BASE_PATH}/${manifestPath(slug)}`).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(PublishedMosaic)),
    Effect.withSpan("mosaic.manifest", { attributes: { slug } }),
  );

const fetchTiles = (path: string): Effect.Effect<TileList, FetchError, HttpClient.HttpClient> =>
  HttpClient.get(`${BASE_PATH}/${path}`).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Tiles)),
    Effect.withSpan("mosaic.tiles", { attributes: { path } }),
  );

const mosaicQuery = (slug: string): Query<Mosaic> => ({
  queryKey: ["mosaic", slug],
  queryFn: ({ signal }) => runtime.runPromise(fetchMosaic(slug), { signal }),
  staleTime: Number.POSITIVE_INFINITY,
});

const tilesQuery = ({
  slug,
  version,
  tiles,
}: Readonly<Pick<Mosaic, "version" | "tiles"> & { slug: string }>): Query<TileList> => {
  const path = `${versionPath({ slug, version })}/${tiles}`;
  return {
    queryKey: ["tiles", path],
    queryFn: ({ signal }) => runtime.runPromise(fetchTiles(path), { signal }),
    staleTime: Number.POSITIVE_INFINITY,
  };
};

export type { Mosaic, Query, TileList };
export { mosaicQuery, tilesQuery };

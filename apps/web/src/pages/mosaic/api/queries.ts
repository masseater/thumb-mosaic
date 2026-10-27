import { PublishedMosaic, Tiles, manifestPath, versionPath } from "@thumb-mosaic/mosaic";
import type { VariantRef } from "@thumb-mosaic/mosaic";
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

const fetchMosaic = (ref: VariantRef): Effect.Effect<Mosaic, FetchError, HttpClient.HttpClient> =>
  HttpClient.get(`${BASE_PATH}/${manifestPath(ref)}`).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(PublishedMosaic)),
    Effect.withSpan("mosaic.manifest", { attributes: { ...ref } }),
  );

const fetchTiles = (path: string): Effect.Effect<TileList, FetchError, HttpClient.HttpClient> =>
  HttpClient.get(`${BASE_PATH}/${path}`).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Tiles)),
    Effect.withSpan("mosaic.tiles", { attributes: { path } }),
  );

const mosaicQuery = ({ slug, variant }: VariantRef): Query<Mosaic> => ({
  queryKey: ["mosaic", slug, String(variant)],
  queryFn: ({ signal }) => runtime.runPromise(fetchMosaic({ slug, variant }), { signal }),
  staleTime: Number.POSITIVE_INFINITY,
});

const tilesQuery = ({
  slug,
  variant,
  version,
  tiles,
}: Readonly<Pick<Mosaic, "variant" | "version" | "tiles"> & { slug: string }>): Query<TileList> => {
  const path = `${versionPath({ slug, variant, version })}/${tiles}`;
  return {
    queryKey: ["tiles", path],
    queryFn: ({ signal }) => runtime.runPromise(fetchTiles(path), { signal }),
    staleTime: Number.POSITIVE_INFINITY,
  };
};

const tileChunkQuery = ({
  slug,
  variant,
  version,
  chunk,
  index,
}: Readonly<
  Pick<Mosaic, "variant" | "version" | "chunk"> & { slug: string; index: number }
>): Query<TileList> => {
  const path = `${versionPath({ slug, variant, version })}/${chunk.dir}/${Math.floor(index / chunk.size)}.json`;
  return {
    queryKey: ["tiles", path],
    queryFn: ({ signal }) => runtime.runPromise(fetchTiles(path), { signal }),
    staleTime: Number.POSITIVE_INFINITY,
  };
};

export type { Mosaic, Query, TileList };
export { mosaicQuery, tileChunkQuery, tilesQuery };

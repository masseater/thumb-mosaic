import {
  Candidates,
  PublishedMosaic,
  Tiles,
  manifestPath,
  slugPath,
  versionPath,
} from "@thumb-mosaic/mosaic";
import { Array, Effect, ManagedRuntime, Option, pipe } from "effect";
import type { Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { BASE_PATH } from "#/shared/config";

type Mosaic = typeof PublishedMosaic.Type;
type TileList = typeof Tiles.Type;
type CandidateList = typeof Candidates.Type;
type FetchError = HttpClientError.HttpClientError | Schema.SchemaError;

interface Query<Value> {
  readonly queryKey: readonly string[];
  readonly queryFn: (context: Readonly<{ signal: AbortSignal }>) => Promise<Value>;
  readonly staleTime: number;
}

interface VariantFile {
  readonly slug: string;
  readonly mosaic: Mosaic;
  readonly variant: number;
}

const MISSING = "";

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

const fetchMosaic = (path: string): Effect.Effect<Mosaic, FetchError, HttpClient.HttpClient> =>
  HttpClient.get(`${BASE_PATH}/${path}`).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(PublishedMosaic)),
    Effect.withSpan("mosaic.manifest", { attributes: { path } }),
  );

const fetchCandidates = (
  path: string,
): Effect.Effect<CandidateList, FetchError, HttpClient.HttpClient> =>
  HttpClient.get(`${BASE_PATH}/${path}`).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Candidates)),
    Effect.withSpan("mosaic.candidates", { attributes: { path } }),
  );

const fetchTiles = (path: string): Effect.Effect<TileList, FetchError, HttpClient.HttpClient> =>
  HttpClient.get(`${BASE_PATH}/${path}`).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Tiles)),
    Effect.withSpan("mosaic.tiles", { attributes: { path } }),
  );

const mosaicQuery = (slug: string): Query<Mosaic> => {
  const path = manifestPath(slug);
  return {
    queryKey: ["mosaic", path],
    queryFn: ({ signal }) => runtime.runPromise(fetchMosaic(path), { signal }),
    staleTime: Number.POSITIVE_INFINITY,
  };
};

const candidatesQuery = ({ slug, mosaic }: Omit<VariantFile, "variant">): Query<CandidateList> => {
  const path = `${slugPath(slug)}/${mosaic.candidates}`;
  return {
    queryKey: ["candidates", path],
    queryFn: ({ signal }) => runtime.runPromise(fetchCandidates(path), { signal }),
    staleTime: Number.POSITIVE_INFINITY,
  };
};

const variantPath = ({ slug, mosaic, variant }: VariantFile): string =>
  pipe(
    Array.get(mosaic.variants, variant),
    Option.match({
      onNone: () => MISSING,
      onSome: ({ version }) => versionPath({ slug, variant, version }),
    }),
  );

const tilesAt = (path: string): Query<TileList> => ({
  queryKey: ["tiles", path],
  queryFn: ({ signal }) => runtime.runPromise(fetchTiles(path), { signal }),
  staleTime: Number.POSITIVE_INFINITY,
});

const tilesQuery = (file: VariantFile): Query<TileList> =>
  tilesAt(`${variantPath(file)}/${file.mosaic.tiles}`);

const tileChunkQuery = (file: VariantFile & { readonly index: number }): Query<TileList> =>
  tilesAt(
    `${variantPath(file)}/${file.mosaic.chunk.dir}/${Math.floor(file.index / file.mosaic.chunk.size)}.json`,
  );

export type { CandidateList, Mosaic, Query, TileList, VariantFile };
export { candidatesQuery, mosaicQuery, tileChunkQuery, tilesQuery };

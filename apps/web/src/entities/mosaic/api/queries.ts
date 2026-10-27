import { PublishedMosaic, manifestPath } from "@thumb-mosaic/mosaic";
import { Effect, ManagedRuntime } from "effect";
import type { Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { BASE_PATH } from "#/shared/config";

type Mosaic = typeof PublishedMosaic.Type;

interface MosaicQuery {
  readonly queryKey: readonly [string, string];
  readonly queryFn: (context: Readonly<{ signal: AbortSignal }>) => Promise<Mosaic>;
  readonly staleTime: number;
}

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

const fetchMosaic = (
  slug: string,
): Effect.Effect<
  Mosaic,
  HttpClientError.HttpClientError | Schema.SchemaError,
  HttpClient.HttpClient
> =>
  HttpClient.get(`${BASE_PATH}/${manifestPath(slug)}`).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(PublishedMosaic)),
    Effect.withSpan("mosaic.manifest", { attributes: { slug } }),
  );

const mosaicQuery = (slug: string): MosaicQuery => ({
  queryKey: ["mosaic", slug],
  queryFn: ({ signal }) => runtime.runPromise(fetchMosaic(slug), { signal }),
  staleTime: Number.POSITIVE_INFINITY,
});

export { mosaicQuery };

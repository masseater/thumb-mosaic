import {
  Candidates,
  PublishedMosaic,
  Tiles,
  assignVariants,
  assignedTiles,
  manifestPath,
  slugPath,
  versionPath,
} from "@thumb-mosaic/mosaic";
import { Effect, ManagedRuntime } from "effect";
import type { Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { BASE_PATH } from "#/shared/config";

type TileList = typeof Tiles.Type;
type FetchError = HttpClientError.HttpClientError | Schema.SchemaError;

interface Request {
  readonly slug: string;
  readonly seed: number;
}

const NO_TILES: TileList = [];

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

const fetchJson =
  <Model extends Schema.Decoder<unknown>>(schema: Model) =>
  (path: string): Effect.Effect<Model["Type"], FetchError, HttpClient.HttpClient> =>
    HttpClient.get(`${BASE_PATH}/${path}`).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
      Effect.withSpan("credits.fetch", { attributes: { path } }),
    );

const creditedTiles = ({ slug, seed }: Request): Promise<TileList> =>
  runtime.runPromise(
    Effect.gen(function* credited() {
      const mosaic = yield* fetchJson(PublishedMosaic)(manifestPath(slug));
      const [candidates, lists] = yield* Effect.all(
        [
          fetchJson(Candidates)(`${slugPath(slug)}/${mosaic.candidates}`),
          Effect.forEach(
            mosaic.variants,
            ({ version }, variant) =>
              fetchJson(Tiles)(`${versionPath({ slug, variant, version })}/${mosaic.tiles}`),
            { concurrency: "unbounded" },
          ),
        ],
        { concurrency: "unbounded" },
      );
      const choice = yield* assignVariants({ candidates, seed });
      return assignedTiles({ choice, lists });
    }).pipe(Effect.orElseSucceed(() => NO_TILES)),
  );

export { creditedTiles };

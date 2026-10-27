import { PublishedMosaic, manifestKey, objectKey } from "@thumb-mosaic/mosaic";
import { env } from "cloudflare:workers";
import { Effect, Option, Schema } from "effect";

import { createRouter } from "#/shared/api/index.server";
import { runRequest } from "#/shared/lib/index.server";

const decodeManifest = Schema.decodeUnknownEffect(Schema.fromJsonString(PublishedMosaic));

const readObject = (key: string): Effect.Effect<Option.Option<R2ObjectBody>> =>
  Effect.promise(() => env.MOSAICS.get(key)).pipe(
    Effect.map(Option.fromNullishOr),
    Effect.withSpan("mosaic.r2.get", { attributes: { key } }),
  );

const readManifest = (slug: string): Effect.Effect<Option.Option<typeof PublishedMosaic.Type>> =>
  readObject(manifestKey(slug)).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (object) =>
          Effect.promise(() => object.text()).pipe(Effect.flatMap(decodeManifest), Effect.asSome),
      }),
    ),
    Effect.orDie,
  );

const NOT_FOUND = 404;

const manifestOr = <Missing>(
  slug: string,
  missing: () => Missing,
): Effect.Effect<typeof PublishedMosaic.Type | Missing> =>
  Effect.map(readManifest(slug), Option.getOrElse(missing));

const fileResponse = (object: R2ObjectBody): Response => {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
};

const notFound = (): Response => new Response("not found", { status: NOT_FOUND });

const fileOrNotFound = Option.match({ onNone: notFound, onSome: fileResponse });

const mosaicRoutes = createRouter("/api/mosaics")
  .get("/:slug", ({ params, status }) =>
    runRequest(manifestOr(params.slug, () => status(NOT_FOUND, "not found"))),
  )
  .get("/:slug/:version/*", ({ params }) => {
    const key = objectKey({ slug: params.slug, version: params.version, file: params["*"] });
    return runRequest(readObject(key).pipe(Effect.map(fileOrNotFound)));
  });

type MosaicRoutes = typeof mosaicRoutes;

export type { MosaicRoutes };
export { mosaicRoutes };

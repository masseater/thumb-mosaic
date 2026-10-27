import { ORIGINAL_TYPE } from "@thumb-mosaic/mosaic";
import { env } from "cloudflare:workers";
import { Effect, String as Str, pipe } from "effect";

import { BASE_PATH } from "#/shared/config";

const NOT_FOUND = 404;
const SEPARATOR = "/";

const keyOf = (request: Request): string =>
  pipe(new URL(request.url).pathname, Str.slice(BASE_PATH.length + SEPARATOR.length));

const notFound = (): Response => new Response("not found", { status: NOT_FOUND });

const readOriginal = (key: string): Effect.Effect<Response> =>
  pipe(
    Effect.promise(() => env.ORIGINALS.get(key)),
    Effect.map((object) => {
      if (object === null) {
        return notFound();
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("Content-Type", ORIGINAL_TYPE);
      headers.set("ETag", object.httpEtag);
      return new Response(object.body, { headers });
    }),
    Effect.withSpan("mosaic.original", { attributes: { key } }),
  );

const original = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  Effect.runPromise(readOriginal(keyOf(request)));

export { original };

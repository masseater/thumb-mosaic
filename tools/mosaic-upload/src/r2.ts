import { fromCredentials } from "@distilled.cloud/aws/Credentials";
import { of } from "@distilled.cloud/aws/Endpoint";
import { CredentialsFromEnv } from "@distilled.cloud/cloudflare/Credentials";
import { verifyToken } from "@distilled.cloud/cloudflare/user";
import { Config, Effect, Layer, Redacted, Schema } from "effect";
import { FetchHttpClient } from "effect/http";

const R2_REGION = "us-east-1";

const encodeHex = Schema.encodeEffect(Schema.Uint8ArrayFromHex);

const secretOf = (token: string): Effect.Effect<string, Schema.SchemaError> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).pipe(
    Effect.flatMap((digest) => encodeHex(new Uint8Array(digest))),
    Effect.withSpan("mosaic.upload.secret"),
  );

export const r2 = Layer.unwrap(
  Effect.gen(function* r2Credentials() {
    const token = yield* Config.Redacted("CLOUDFLARE_API_TOKEN");
    const accountId = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
    const { id } = yield* verifyToken({});
    const secretAccessKey = yield* secretOf(Redacted.value(token));
    return Layer.mergeAll(
      fromCredentials({ accessKeyId: id, secretAccessKey }, R2_REGION),
      of(`https://${accountId}.r2.cloudflarestorage.com`),
    );
  }).pipe(Effect.withSpan("mosaic.upload.credentials")),
).pipe(Layer.provide(CredentialsFromEnv), Layer.provide(FetchHttpClient.layer), Layer.orDie);

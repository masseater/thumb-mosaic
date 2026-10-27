import { CredentialsFromEnv } from "@distilled.cloud/cloudflare/Credentials";
import { putObject } from "@distilled.cloud/cloudflare/r2";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import {
  MOSAIC_BUCKET,
  Mosaic,
  PublishedMosaic,
  manifestKey,
  objectKey,
} from "@thumb-mosaic/mosaic";
import type { Context } from "effect";
import {
  Array,
  Config,
  Console,
  Effect,
  FileSystem,
  Layer,
  Path,
  Schema,
  String,
  pipe,
} from "effect";
import { Argument, Command } from "effect/cli";
import { Hex } from "effect/encoding";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

const UPLOAD_CONCURRENCY = 16;
const VERSION_START = 0;
const VERSION_LENGTH = 16;
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const MANIFEST_CACHE = "public, max-age=60";
const MANIFEST_FILE = "meta.json";

const decodeMosaic = Schema.decodeUnknownEffect(Schema.fromJsonString(Mosaic));
const encodePublished = Schema.encodeEffect(Schema.fromJsonString(PublishedMosaic));

const tracing = OtlpTracer.layerFromConfig({
  resource: { serviceName: "mosaic-upload" },
}).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer));

const services = Layer.mergeAll(
  tracing,
  NodeServices.layer,
  CredentialsFromEnv,
  FetchHttpClient.layer,
);

const versionOf = (manifest: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(manifest))).pipe(
    Effect.map((digest) =>
      pipe(new Uint8Array(digest), Hex.encode, String.slice(VERSION_START, VERSION_LENGTH)),
    ),
  );

const filesOf = (mosaic: typeof Mosaic.Type): readonly string[] => [
  ...pipe(
    mosaic.levels,
    Array.flatMap((level) => level.files),
  ),
  ...pipe(
    mosaic.tiles,
    Array.map((_tile, index) => `${mosaic.tile.dir}/${index}.jpg`),
  ),
];

const command = Command.make(
  "mosaic-upload",
  {
    slug: Argument.String("slug"),
    directory: Argument.String("directory"),
  },
  ({ slug, directory }) =>
    Effect.gen(function* upload() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const manifest = yield* fileSystem.readFileString(path.join(directory, MANIFEST_FILE));
      const mosaic = yield* decodeMosaic(manifest);
      const version = yield* versionOf(manifest);
      const bucket = {
        accountId: yield* Config.String("CLOUDFLARE_ACCOUNT_ID"),
        bucketName: MOSAIC_BUCKET,
      };
      const files = filesOf(mosaic);
      yield* Effect.forEach(
        files,
        (file) =>
          Effect.gen(function* uploadFile() {
            const body = yield* fileSystem.readFile(path.join(directory, file));
            yield* putObject({
              ...bucket,
              objectName: objectKey({ slug, version, file }),
              body,
              contentType: "image/jpeg",
              cacheControl: IMMUTABLE_CACHE,
            });
          }).pipe(Effect.withSpan("mosaic.upload.file", { attributes: { file } })),
        { concurrency: UPLOAD_CONCURRENCY, discard: true },
      );
      yield* putObject({
        ...bucket,
        objectName: manifestKey(slug),
        body: yield* encodePublished({ ...mosaic, version }),
        contentType: "application/json",
        cacheControl: MANIFEST_CACHE,
      }).pipe(Effect.withSpan("mosaic.upload.manifest"));
      yield* Console.log(`uploaded ${files.length} files as ${slug}/${version}`);
    }).pipe(Effect.withSpan("mosaic.upload")),
);

const upload = Command.run(command, { version: "0.0.0" });

const runWith = (
  context: Context.Context<Layer.Success<typeof services>>,
): Effect.Effect<void, Effect.Error<typeof upload>> => Effect.provideContext(upload, context);

const program = Effect.scoped(Effect.flatMap(Layer.build(services), runWith));

NodeRuntime.runMain(program);

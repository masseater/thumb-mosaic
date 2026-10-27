import { CredentialsFromEnv } from "@distilled.cloud/cloudflare/Credentials";
import { listObjects, putObject } from "@distilled.cloud/cloudflare/r2";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { FILES_DIR, ORIGINALS_BUCKET } from "@thumb-mosaic/mosaic";
import type { Context } from "effect";
import {
  Array,
  Config,
  Console,
  Effect,
  FileSystem,
  HashSet,
  Layer,
  Path,
  Stream,
  String,
  pipe,
} from "effect";
import { Argument, Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

const UPLOAD_CONCURRENCY = 32;
const PAGE_SIZE = 1000;
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const IMAGE_EXTENSION = ".jpg";

const tracing = OtlpTracer.layerFromConfig({
  resource: { serviceName: "mosaic-upload" },
}).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer));

const services = Layer.mergeAll(
  tracing,
  NodeServices.layer,
  CredentialsFromEnv,
  FetchHttpClient.layer,
);

const command = Command.make(
  "mosaic-upload",
  { directory: Argument.String("directory") },
  ({ directory }) =>
    Effect.gen(function* upload() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const bucket = {
        accountId: yield* Config.String("CLOUDFLARE_ACCOUNT_ID"),
        bucketName: ORIGINALS_BUCKET,
      };
      const files = pipe(
        yield* fileSystem.readDirectory(directory, { recursive: true }),
        Array.filter(String.endsWith(IMAGE_EXTENSION)),
      );
      const existing = yield* pipe(
        listObjects.items({ ...bucket, prefix: `${FILES_DIR}/`, perPage: PAGE_SIZE }),
        Stream.runFold(HashSet.empty<string>, (keys, object) =>
          HashSet.add(keys, object.key ?? ""),
        ),
        Effect.withSpan("mosaic.upload.list"),
      );
      const missing = pipe(
        files,
        Array.filter((file) => !HashSet.has(existing, `${FILES_DIR}/${file}`)),
      );
      yield* Effect.forEach(
        missing,
        (file) =>
          Effect.gen(function* uploadFile() {
            const body = yield* fileSystem.readFile(path.join(directory, file));
            yield* putObject({
              ...bucket,
              objectName: `${FILES_DIR}/${file}`,
              body,
              contentType: "image/jpeg",
              cacheControl: IMMUTABLE_CACHE,
            });
          }).pipe(Effect.withSpan("mosaic.upload.file", { attributes: { file } })),
        { concurrency: UPLOAD_CONCURRENCY, discard: true },
      );
      yield* Console.log(
        `uploaded ${missing.length} of ${files.length} originals (${files.length - missing.length} already stored)`,
      );
    }).pipe(Effect.withSpan("mosaic.upload")),
);

const upload = Command.run(command, { version: "0.0.0" });

const runWith = (
  context: Context.Context<Layer.Success<typeof services>>,
): Effect.Effect<void, Effect.Error<typeof upload>> => Effect.provideContext(upload, context);

const program = Effect.scoped(Effect.flatMap(Layer.build(services), runWith));

NodeRuntime.runMain(program);

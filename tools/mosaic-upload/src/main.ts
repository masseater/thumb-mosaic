import { listObjectsV2, putObject } from "@distilled.cloud/aws/s3";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { FILES_DIR, ORIGINAL_TYPE, ORIGINALS_BUCKET } from "@thumb-mosaic/mosaic";
import type { Context } from "effect";
import {
  Array,
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

import { r2 } from "./r2.ts";

const UPLOAD_CONCURRENCY = 64;
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const IMAGE_EXTENSION = ".jpg";

const tracing = OtlpTracer.layerFromConfig({
  resource: { serviceName: "mosaic-upload" },
}).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer));

const services = Layer.mergeAll(tracing, NodeServices.layer, FetchHttpClient.layer, r2);

const command = Command.make(
  "mosaic-upload",
  { directory: Argument.String("directory") },
  ({ directory }) =>
    Effect.gen(function* upload() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const files = pipe(
        yield* fileSystem.readDirectory(directory, { recursive: true }),
        Array.filter(String.endsWith(IMAGE_EXTENSION)),
      );
      const existing = yield* pipe(
        listObjectsV2.pages({ Bucket: ORIGINALS_BUCKET, Prefix: `${FILES_DIR}/` }),
        Stream.flatMap((page) => Stream.fromIterable(page.Contents ?? [])),
        Stream.runFold(
          () => HashSet.empty<string>(),
          (keys, object) => HashSet.add(keys, object.Key ?? ""),
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
              Bucket: ORIGINALS_BUCKET,
              Key: `${FILES_DIR}/${file}`,
              Body: body,
              ContentType: ORIGINAL_TYPE,
              CacheControl: IMMUTABLE_CACHE,
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

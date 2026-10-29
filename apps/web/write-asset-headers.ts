import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Array as Arr, Effect, FileSystem, Option, Path, Record as Rec, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";

import { assetHeaders } from "./asset-headers.ts";
import { SEARCH_INDEX_ORIGIN } from "./src/shared/config/search.ts";
import { contentSecurityPolicy } from "./src/shared/config/security-headers.ts";

const OUTDIR = "dist/client";
const HEADERS_FILE = "_headers";
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>(?<body>[\s\S]*?)<\/script>/gu;
const encoder = new TextEncoder();

const scriptBodies = (html: string): readonly string[] =>
  pipe(
    Arr.fromIterable(html.matchAll(INLINE_SCRIPT)),
    Arr.map((match) =>
      pipe(
        Option.fromNullishOr(match.groups),
        Option.flatMap(Rec.get("body")),
        Option.getOrElse(() => ""),
      ),
    ),
  );

const scriptHash = (body: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", encoder.encode(body))).pipe(
    Effect.map((digest) => `'sha256-${Base64.encode(new Uint8Array(digest))}'`),
  );

const documentHeaders = (hashes: readonly string[]): Readonly<Record<string, string>> => ({
  "Content-Security-Policy": contentSecurityPolicy(hashes),
  ...Option.match(SEARCH_INDEX_ORIGIN, {
    onNone: () => ({ "X-Robots-Tag": "noindex" }),
    onSome: () => ({}),
  }),
});

const program = Effect.gen(function* write() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entries = yield* fileSystem.readDirectory(OUTDIR, { recursive: true });
  const pages = pipe(entries, Arr.filter(Str.endsWith(".html")));
  const bodies = yield* Effect.forEach(pages, (page) =>
    fileSystem.readFileString(path.join(OUTDIR, page)).pipe(Effect.map(scriptBodies)),
  );
  const hashes = yield* Effect.forEach(pipe(bodies, Arr.flatten, Arr.dedupe), scriptHash);
  yield* fileSystem.writeFileString(
    path.join(OUTDIR, HEADERS_FILE),
    assetHeaders(documentHeaders(hashes)),
  );
});

NodeRuntime.runMain(
  program.pipe(Effect.withSpan("build.asset-headers"), Effect.provide(NodeServices.layer)),
);

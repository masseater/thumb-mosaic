import { createHash } from "node:crypto";
import { glob, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Array as Arr, Effect, Option, pipe } from "effect";

import { assetHeaders } from "./asset-headers.ts";
import { SEARCH_INDEX_ORIGIN } from "./src/shared/config/search.ts";
import { contentSecurityPolicy } from "./src/shared/config/security-headers.ts";

const OUTDIR = "dist/client";
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>(?<body>[\s\S]*?)<\/script>/gu;

const scriptHashes = (html: string): readonly string[] =>
  pipe(
    Arr.fromIterable(html.matchAll(INLINE_SCRIPT)),
    Arr.map(
      (match) =>
        `'sha256-${createHash("sha256")
          .update(match.groups?.["body"] ?? "")
          .digest("base64")}'`,
    ),
  );

const documentHeaders = (hashes: readonly string[]): Readonly<Record<string, string>> => ({
  "Content-Security-Policy": contentSecurityPolicy(hashes),
  ...Option.match(SEARCH_INDEX_ORIGIN, {
    onNone: () => ({ "X-Robots-Tag": "noindex" }),
    onSome: () => ({}),
  }),
});

const program = Effect.gen(function* write() {
  const pages = yield* Effect.promise(() => Array.fromAsync(glob(`${OUTDIR}/**/*.html`)));
  const hashes = yield* Effect.forEach(pages, (page) =>
    Effect.promise(() => readFile(page, "utf8")).pipe(Effect.map(scriptHashes)),
  );
  yield* Effect.promise(() =>
    writeFile(
      path.join(OUTDIR, "_headers"),
      assetHeaders(documentHeaders(pipe(hashes, Arr.flatten, Arr.dedupe))),
    ),
  );
});

void Effect.runPromise(program.pipe(Effect.withSpan("build.asset-headers")));

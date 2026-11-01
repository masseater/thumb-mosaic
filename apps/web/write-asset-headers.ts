import { NodeRuntime, NodeServices } from "@effect/platform-node";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import { Base64 } from "effect/encoding";

import { assetHeaders } from "./asset-headers.ts";
import type { PageHeaders } from "./asset-headers.ts";
import { BASE_PATH } from "./base-path.ts";
import { SEARCH_INDEX_ORIGIN } from "./src/shared/config/search.ts";
import { contentSecurityPolicy } from "./src/shared/config/security-headers.ts";

const OUTDIR = "dist/client";
const HEADERS_FILE = "_headers";
const NOT_FOUND_PAGE = "404.html";
const INDEX_PAGE = /(?<=^|\/)index\.html$/u;
const HTML_EXTENSION = /\.html$/u;
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>(?<body>[\s\S]*?)<\/script>/gu;
const encoder = new TextEncoder();

const scriptBodies = (html: string): readonly string[] =>
  pipe(
    html,
    Str.matchAll(INLINE_SCRIPT),
    Arr.fromIterable,
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

const contentSecurityPolicyHeader = (
  hashes: readonly string[],
): Readonly<Record<string, string>> => ({
  "Content-Security-Policy": contentSecurityPolicy(hashes),
});

const documentHeaders = (hashes: readonly string[]): Readonly<Record<string, string>> => ({
  ...contentSecurityPolicyHeader(hashes),
  ...Option.match(SEARCH_INDEX_ORIGIN, {
    onNone: () => ({ "X-Robots-Tag": "noindex" }),
    onSome: () => ({}),
  }),
});

const pagePath = (page: string): string =>
  `${BASE_PATH}/${pipe(page, Str.replace(INDEX_PAGE, ""), Str.replace(HTML_EXTENSION, ""))}`;

const scriptHashes = (bodies: readonly string[]): Effect.Effect<readonly string[]> =>
  pipe(bodies, Arr.dedupe, Effect.forEach(scriptHash));

const isNotFound = ({ page }: Readonly<{ page: string }>): boolean => page === NOT_FOUND_PAGE;

const program = Effect.gen(function* write() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entries = yield* fileSystem.readDirectory(OUTDIR, { recursive: true });
  const pages = yield* pipe(
    entries,
    Arr.filter(Str.endsWith(".html")),
    Effect.forEach((page) =>
      fileSystem.readFileString(path.join(OUTDIR, page)).pipe(
        Effect.map(scriptBodies),
        Effect.flatMap(scriptHashes),
        Effect.map((hashes) => ({ page, hashes })),
      ),
    ),
  );
  const notFoundHashes = pipe(
    pages,
    Arr.filter(isNotFound),
    Arr.flatMap(({ hashes }) => hashes),
  );
  const pageHeaders: readonly PageHeaders[] = pipe(
    pages,
    Arr.filter((entry) => !isNotFound(entry)),
    Arr.map(({ page, hashes }) => ({
      path: pagePath(page),
      headers: contentSecurityPolicyHeader(hashes),
    })),
  );
  yield* fileSystem.writeFileString(
    path.join(OUTDIR, HEADERS_FILE),
    assetHeaders({ documentHeaders: documentHeaders(notFoundHashes), pages: pageHeaders }),
  );
});

NodeRuntime.runMain(
  Layer.build(NodeServices.layer).pipe(
    Effect.flatMap((context) =>
      Effect.provideContext(program.pipe(Effect.withSpan("build.asset-headers")), context),
    ),
    Effect.scoped,
  ),
);

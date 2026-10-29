import { CHARACTERS, slugPath } from "@thumb-mosaic/mosaic";
import { Stack } from "alchemy";
import { Website, Workers, providers, state } from "alchemy/Cloudflare";
import type { InferEnv } from "alchemy/Cloudflare";
import { Config, Effect, Option, Schema, pipe } from "effect";

import { APP_NAME, CI_TELEMETRY_AUDIENCE, requireAppPrefix } from "./app-name.ts";
import { ASSET_HEADERS } from "./asset-headers.ts";
import { BASE_PATH } from "./base-path.ts";
import { edgeGuard } from "./edge-guard.ts";
import { logArchive } from "./log-archive.ts";

const ZONE = "masseater.dev";

const COMPATIBILITY = { date: "2026-08-25" } as const;

const OWNED_ZONE = Option.none<string>();

const web = Website.StaticSite("Web", {
  command: "vp build && node ./write-asset-headers.ts",
  outdir: "dist/client",
  memo: false,
  compatibility: COMPATIBILITY,
  logpush: true,
  routes: [{ pattern: `${ZONE}${BASE_PATH}*`, zoneName: ZONE }],
  assets: {
    base: BASE_PATH,
    htmlHandling: "auto-trailing-slash",
    notFoundHandling: "404-page",
  },
  dev: { command: "vp dev" },
});

const characterFiles = pipe(
  CHARACTERS,
  Effect.forEach(({ slug }) =>
    Workers.Worker(`Files-${slug}`, {
      name: `${APP_NAME}-files-${slug}`,
      compatibility: COMPATIBILITY,
      logpush: true,
      routes: [{ pattern: `${ZONE}${BASE_PATH}/${slugPath(slug)}/*`, zoneName: ZONE }],
      assets: {
        directory: `./public/${slugPath(slug)}`,
        base: `${BASE_PATH}/${slugPath(slug)}`,
        headers: ASSET_HEADERS,
      },
    }),
  ),
);

const ciTelemetry = Effect.gen(function* ciTelemetry() {
  const GITHUB_REPOSITORY = yield* Config.schema(Schema.String, "GITHUB_REPOSITORY").pipe(
    Config.withDefault(""),
  );
  return yield* Workers.Worker("CiTelemetry", {
    name: CI_TELEMETRY_AUDIENCE,
    main: "./ci-telemetry.worker.ts",
    compatibility: COMPATIBILITY,
    logpush: true,
    env: { GITHUB_REPOSITORY },
    observability: {
      enabled: true,
      logs: { enabled: true, invocationLogs: false, persist: true },
    },
  });
});

type WebEnv = InferEnv<typeof web>;
type CiTelemetryEnv = InferEnv<typeof ciTelemetry>;

export type { CiTelemetryEnv, WebEnv };
export default Stack(
  APP_NAME,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    yield* characterFiles;
    yield* Option.match(OWNED_ZONE, {
      onNone: () => Effect.void,
      onSome: (zone) =>
        Effect.gen(function* accountWide() {
          yield* edgeGuard(zone, COMPATIBILITY);
          yield* logArchive;
        }),
    });
    yield* ciTelemetry;
    yield* requireAppPrefix;
    return { url };
  }),
);

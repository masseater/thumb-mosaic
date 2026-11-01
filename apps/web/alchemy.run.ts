import { Workers, providers, state } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Config, Effect, Option, Schema } from "effect";

import { APP_NAME, CI_TELEMETRY_AUDIENCE, requireAppPrefix } from "./app-name.ts";
import { BASE_PATH } from "./base-path.ts";
import { COMPATIBILITY, ZONE } from "./cloudflare.ts";
import { edgeGuard } from "./edge-guard.ts";
import { logArchive } from "./log-archive.ts";

const CF_BEACON_TOKEN = "021b4961f3fd419297b186136a5a8a0a";

const OWNED_ZONE = Option.none<string>();

const web = Effect.gen(function* web() {
  const site = yield* Build("WebBuild", {
    command: "vp run build",
    env: { VITE_CF_BEACON_TOKEN: CF_BEACON_TOKEN },
    outdir: "dist/client",
    memo: false,
  });
  return yield* Workers.Worker("Web", {
    compatibility: COMPATIBILITY,
    logpush: true,
    routes: [{ pattern: `${ZONE}${BASE_PATH}*`, zoneName: ZONE }],
    assets: {
      directory: site.outdir,
      base: BASE_PATH,
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "404-page",
    },
  });
});

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

type CiTelemetryEnv = InferEnv<typeof ciTelemetry>;

export type { CiTelemetryEnv };
export default Stack(
  APP_NAME,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* web;
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

import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api";

import type { MosaicRoutes } from "./routes.server";

const loadMosaicRoutes = (): Promise<MosaicRoutes> =>
  Effect.runPromise(
    Effect.promise(() => import("./routes.server")).pipe(
      Effect.map((module) => module.mosaicRoutes),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<MosaicRoutes>(loadMosaicRoutes))
  .client(() => browserClient<MosaicRoutes>());

const mosaicQueries = createQueries<MosaicRoutes>(client());

export { mosaicQueries };

import { Workers, providers, state } from "@alchemy.run/cloudflare";
import { CHARACTERS, slugPath } from "@thumb-mosaic/mosaic";
import { Stack } from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import { Array as Arr, Effect, Option } from "effect";

import { APP_NAME, requireAppPrefix } from "./app-name.ts";
import { ASSET_HEADERS } from "./asset-headers.ts";
import { BASE_PATH } from "./base-path.ts";
import { COMPATIBILITY, ZONE } from "./cloudflare.ts";

export default Stack(
  APP_NAME,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { stage } = yield* Stack;
    const character = yield* Option.match(
      Arr.findFirst(CHARACTERS, ({ slug }) => slug === stage),
      {
        onNone: () =>
          Effect.die(new Error(`ステージにはキャラの slug を渡す（--stage <slug>）: ${stage}`)),
        onSome: Effect.succeed,
      },
    );
    const { url } = yield* Workers.Worker("Files", {
      name: `${APP_NAME}-files-${character.slug}`,
      compatibility: COMPATIBILITY,
      logpush: true,
      routes: [{ pattern: `${ZONE}${BASE_PATH}/${slugPath(character.slug)}/*`, zoneName: ZONE }],
      assets: {
        directory: `./public/${slugPath(character.slug)}`,
        base: `${BASE_PATH}/${slugPath(character.slug)}`,
        headers: ASSET_HEADERS,
      },
    }).pipe(adopt(true));
    yield* requireAppPrefix;
    return { url };
  }),
);

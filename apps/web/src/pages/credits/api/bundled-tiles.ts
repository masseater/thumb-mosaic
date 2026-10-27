import { createServerFn } from "@tanstack/react-start";
import { Tiles, versionPath } from "@thumb-mosaic/mosaic";
import type { VariantRef } from "@thumb-mosaic/mosaic";
import { Array, Option, Record, Schema, String as Str, pipe } from "effect";

type TileList = typeof Tiles.Type;

const decode = Schema.decodeUnknownOption(Tiles);

const bundledTiles = createServerFn({ method: "GET" })
  .validator((ref: VariantRef) => ref)
  .handler(({ data: ref }): TileList =>
    pipe(
      Record.toEntries(
        import.meta.glob<unknown>("../../../../public/files/*/*/*/tiles.json", {
          eager: true,
          import: "default",
        }),
      ),
      Array.findFirst(([path]) => Str.includes(`/${versionPath({ ...ref, version: "" })}`)(path)),
      Option.flatMap(([, tiles]) => decode(tiles)),
      Option.getOrElse((): TileList => []),
    ),
  );

export type { TileList };
export { bundledTiles };

import { createServerFn } from "@tanstack/react-start";
import { Tiles } from "@thumb-mosaic/mosaic";
import { Array, Option, Record, Schema, String as Str, pipe } from "effect";

type TileList = typeof Tiles.Type;

const decode = Schema.decodeUnknownOption(Tiles);

const bundledTiles = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(({ data: slug }): TileList =>
    pipe(
      Record.toEntries(
        import.meta.glob<unknown>("../../../../public/files/*/*/tiles.json", {
          eager: true,
          import: "default",
        }),
      ),
      Array.findFirst(([path]) => Str.includes(`/files/${slug}/`)(path)),
      Option.flatMap(([, tiles]) => decode(tiles)),
      Option.getOrElse((): TileList => []),
    ),
  );

export type { TileList };
export { bundledTiles };

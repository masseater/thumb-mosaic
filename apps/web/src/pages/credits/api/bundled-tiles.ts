import { createServerFn } from "@tanstack/react-start";
import {
  Candidates,
  PublishedMosaic,
  Tiles,
  assignVariants,
  manifestPath,
  slugPath,
  versionPath,
} from "@thumb-mosaic/mosaic";
import { Array, Effect, Option, Record, Schema, pipe } from "effect";

type TileList = typeof Tiles.Type;
type Mosaic = typeof PublishedMosaic.Type;

interface Request {
  readonly slug: string;
  readonly seed: number;
}

const PUBLIC = "../../../../public";
const NO_TILES: TileList = [];

const manifests = import.meta.glob<unknown>("../../../../public/files/*.json", {
  eager: true,
  import: "default",
});
const candidateFiles = import.meta.glob<unknown>("../../../../public/files/*/candidates.json", {
  eager: true,
  import: "default",
});
const tileFiles = import.meta.glob<unknown>("../../../../public/files/*/*/*/tiles.json", {
  eager: true,
  import: "default",
});

const decodeMosaic = Schema.decodeUnknownOption(PublishedMosaic);
const decodeCandidates = Schema.decodeUnknownOption(Candidates);
const decodeTiles = Schema.decodeUnknownOption(Tiles);

const variantTiles = (slug: string, mosaic: Mosaic): readonly TileList[] =>
  pipe(
    mosaic.variants,
    Array.map(({ version }, variant) =>
      pipe(
        Record.get(
          tileFiles,
          `${PUBLIC}/${versionPath({ slug, variant, version })}/${mosaic.tiles}`,
        ),
        Option.flatMap(decodeTiles),
        Option.getOrElse(() => NO_TILES),
      ),
    ),
  );

const visitTiles = ({ slug, seed }: Request, mosaic: Mosaic): Effect.Effect<TileList> =>
  pipe(
    Record.get(candidateFiles, `${PUBLIC}/${slugPath(slug)}/${mosaic.candidates}`),
    Option.flatMap(decodeCandidates),
    Option.match({
      onNone: () => Effect.succeed(NO_TILES),
      onSome: (candidates) =>
        Effect.map(assignVariants({ candidates, seed }), (choice) => {
          const lists = variantTiles(slug, mosaic);
          return pipe(
            choice,
            Array.map((variant, index) => Array.get(lists[variant] ?? NO_TILES, index)),
            Array.getSomes,
          );
        }),
    }),
  );

const creditedTiles = (request: Request): Effect.Effect<TileList> =>
  pipe(
    Record.get(manifests, `${PUBLIC}/${manifestPath(request.slug)}`),
    Option.flatMap(decodeMosaic),
    Option.match({
      onNone: () => Effect.succeed(NO_TILES),
      onSome: (mosaic) => visitTiles(request, mosaic),
    }),
  );

const bundledTiles = createServerFn({ method: "GET" })
  .validator((request: Request) => request)
  .handler(({ data }): Promise<TileList> => Effect.runPromise(creditedTiles(data)));

export type { TileList };
export { bundledTiles };

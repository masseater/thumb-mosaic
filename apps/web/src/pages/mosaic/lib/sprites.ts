import type { PublishedMosaic } from "@thumb-mosaic/mosaic";
import { Array, Effect, MutableHashMap, Option, Record, pipe } from "effect";

const TILE_CACHE_SIZE = 384;
const NO_WIDTH = 0;
const SHARPER = 1.2;
const OVERVIEW = 0;

type Mosaic = typeof PublishedMosaic.Type;
type Level = Mosaic["levels"][number];

interface BlockAt {
  readonly sheet: number;
  readonly column: number;
  readonly row: number;
  readonly request: boolean;
}

interface Sheets {
  readonly levels: readonly Level[];
  readonly block: (at: BlockAt) => Option.Option<HTMLImageElement>;
}

interface Sprites extends Sheets {
  readonly ready: Effect.Effect<void>;
  readonly levelFor: (devicePixels: number) => number;
  readonly tile: (index: number) => Option.Option<HTMLImageElement>;
}

interface Source {
  readonly mosaic: Mosaic;
  readonly fileUrl: (file: string) => string;
  readonly onLoad: () => void;
}

interface Block {
  readonly image: HTMLImageElement;
  readonly url: string;
}

const pendingImage = (onLoad: () => void): HTMLImageElement => {
  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", onLoad);
  return image;
};

const loadImage = (url: string, onLoad: () => void): HTMLImageElement => {
  const image = pendingImage(onLoad);
  image.src = url;
  return image;
};

const isLoaded = (image: HTMLImageElement): boolean =>
  image.complete && image.naturalWidth > NO_WIDTH;

const whenSettled = (image: HTMLImageElement): Effect.Effect<void> =>
  Effect.ignore(Effect.tryPromise(() => image.decode()));

const blockKey = (column: number, row: number): string => `${column}_${row}`;

const sheetOf =
  ({ fileUrl, onLoad }: Source) =>
  (level: Level): Record.ReadonlyRecord<string, Block> =>
    pipe(
      level.blocks,
      Array.map(([column, row, file]): readonly [string, Block] => [
        blockKey(column, row),
        { image: pendingImage(onLoad), url: fileUrl(file) },
      ]),
      Record.fromEntries,
    );

const requested = ({ image, url }: Block): HTMLImageElement => {
  if (image.getAttribute("src") === null) {
    image.src = url;
  }
  return image;
};

const blockLookup =
  (sheets: readonly Record.ReadonlyRecord<string, Block>[]) =>
  ({ sheet, column, row, request }: BlockAt): Option.Option<HTMLImageElement> =>
    pipe(
      Array.get(sheets, sheet),
      Option.flatMap((blocks) => Record.get(blocks, blockKey(column, row))),
      Option.map((block) => {
        if (request) {
          return requested(block);
        }
        return block.image;
      }),
      Option.filter(isLoaded),
    );

const tileCache = ({ mosaic, fileUrl, onLoad }: Source): Sprites["tile"] => {
  const cache = MutableHashMap.empty<number, HTMLImageElement>();
  const startLoading = (index: number): Option.Option<HTMLImageElement> => {
    if (MutableHashMap.size(cache) >= TILE_CACHE_SIZE) {
      const keys = Array.fromIterable(MutableHashMap.keys(cache));
      pipe(
        Array.head(keys),
        Option.map((oldest) => MutableHashMap.remove(cache, oldest)),
      );
    }
    MutableHashMap.set(cache, index, loadImage(fileUrl(`${mosaic.tile.dir}/${index}.jpg`), onLoad));
    return Option.none();
  };
  return (index) =>
    Option.match(MutableHashMap.get(cache, index), {
      onNone: () => startLoading(index),
      onSome: (image) => Option.filter(Option.some(image), isLoaded),
    });
};

const levelFinder =
  (levels: readonly Level[]) =>
  (devicePixels: number): number =>
    Option.getOrElse(
      Array.findFirstIndex(levels, (level) => devicePixels <= level.tw * SHARPER),
      () => levels.length,
    );

const createSprites = (source: Source): Sprites => {
  const sheets = pipe(source.mosaic.levels, Array.map(sheetOf(source)));
  const overview = pipe(
    Array.get(sheets, OVERVIEW),
    Option.map((blocks) => pipe(Record.values(blocks), Array.map(requested))),
    Option.getOrElse((): readonly HTMLImageElement[] => []),
  );
  return {
    levels: source.mosaic.levels,
    block: blockLookup(sheets),
    ready: Effect.forEach(overview, whenSettled, {
      concurrency: "unbounded",
      discard: true,
    }),
    levelFor: levelFinder(source.mosaic.levels),
    tile: tileCache(source),
  };
};

export type { Level, Mosaic, Sprites };
export { createSprites };

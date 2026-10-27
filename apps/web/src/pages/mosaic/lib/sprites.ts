import { Array, Effect, MutableHashMap, Option, Record, pipe } from "effect";

import type { Mosaic } from "#/pages/mosaic/api/queries";

import { composeBlock } from "./compose";
import { tileImage } from "./files";
import type { Visit } from "./files";

const TILE_CACHE_SIZE = 384;
const NO_WIDTH = 0;
const SHARPER = 1.2;
const OVERVIEW = 0;

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
  readonly visit: Visit;
  readonly onLoad: () => void;
}

interface Block {
  readonly image: HTMLImageElement;
  readonly start: () => void;
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

const whenLoaded = (image: HTMLImageElement): Effect.Effect<unknown> =>
  Effect.callback<unknown>((resume) => {
    if (isLoaded(image)) {
      resume(Effect.void);
      return;
    }
    image.addEventListener(
      "load",
      () => {
        resume(Effect.void);
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        resume(Effect.void);
      },
      { once: true },
    );
  });

const blockKey = (column: number, row: number): string => `${column}_${row}`;

const blockOf = ({ visit, onLoad }: Source, level: Level, at: Level["blocks"][number]): Block => {
  const image = pendingImage(onLoad);
  const [column, row, file] = at;
  let started = false;
  return {
    image,
    start: () => {
      if (!started) {
        started = true;
        Effect.runFork(
          Effect.map(composeBlock({ visit, level, column, row, file }), (url) => {
            image.src = url;
          }),
        );
      }
    },
  };
};

const sheetOf =
  (source: Source) =>
  (level: Level): Record.ReadonlyRecord<string, Block> =>
    pipe(
      level.blocks,
      Array.map((at): readonly [string, Block] => {
        const [column, row] = at;
        return [blockKey(column, row), blockOf(source, level, at)];
      }),
      Record.fromEntries,
    );

const requested = ({ image, start }: Block): HTMLImageElement => {
  start();
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

const tileCache = ({ visit, onLoad }: Source): Sprites["tile"] => {
  const cache = MutableHashMap.empty<number, HTMLImageElement>();
  const startLoading = (index: number): Option.Option<HTMLImageElement> => {
    if (MutableHashMap.size(cache) >= TILE_CACHE_SIZE) {
      const keys = Array.fromIterable(MutableHashMap.keys(cache));
      pipe(
        Array.head(keys),
        Option.map((oldest) => MutableHashMap.remove(cache, oldest)),
      );
    }
    MutableHashMap.set(cache, index, loadImage(tileImage({ visit, index }), onLoad));
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
  const { levels } = source.visit.mosaic;
  const sheets = pipe(levels, Array.map(sheetOf(source)));
  const overview = pipe(
    Array.get(sheets, OVERVIEW),
    Option.map((blocks) => pipe(Record.values(blocks), Array.map(requested))),
    Option.getOrElse((): readonly HTMLImageElement[] => []),
  );
  return {
    levels,
    block: blockLookup(sheets),
    ready: Effect.forEach(overview, whenLoaded, {
      concurrency: "unbounded",
      discard: true,
    }),
    levelFor: levelFinder(levels),
    tile: tileCache(source),
  };
};

export type { Level, Sprites };
export { createSprites };

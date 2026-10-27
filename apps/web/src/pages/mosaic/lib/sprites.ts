import { Array, Effect, Option, Record, pipe } from "effect";

import type { Mosaic } from "#/pages/mosaic/api/queries";

import { composeBlock } from "./compose";
import { variantFile } from "./files";
import type { Visit } from "./files";

const NO_WIDTH = 0;
const SHARPER = 1.2;
const OVERVIEW = 0;
const BEST_VARIANT = 0;

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

const blockOf = (
  { visit, onLoad }: Source,
  { level, index }: Readonly<{ level: Level; index: number }>,
  at: Level["blocks"][number],
): Block => {
  const image = pendingImage(onLoad);
  const [column, row, file] = at;
  let started = false;
  return {
    image,
    start: () => {
      if (!started) {
        started = true;
        const first = index === OVERVIEW;
        if (first) {
          image.src = variantFile(visit)(BEST_VARIANT, file);
        }
        const composed = composeBlock({ visit, level, column, row, file });
        const show = (url: string): void => {
          image.src = url;
        };
        Effect.runFork(
          Effect.when(whenLoaded(image), Effect.succeed(first)).pipe(
            Effect.andThen(composed),
            Effect.tap((url) =>
              Effect.sync(() => {
                show(url);
              }),
            ),
          ),
        );
      }
    },
  };
};

const sheetOf =
  (source: Source) =>
  (level: Level, index: number): Record.ReadonlyRecord<string, Block> =>
    pipe(
      level.blocks,
      Array.map((at): readonly [string, Block] => {
        const [column, row] = at;
        return [blockKey(column, row), blockOf(source, { level, index }, at)];
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
  };
};

export type { Level, Sprites };
export { createSprites };

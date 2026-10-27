import type { PublishedMosaic } from "@thumb-mosaic/mosaic";
import { Array, Effect, MutableHashMap, Option, Record, pipe } from "effect";

const TILE_CACHE_SIZE = 384;
const ORIGIN = 0;
const NO_WIDTH = 0;
const SHARPER = 1.2;
const OVERVIEW = 0;

type Mosaic = typeof PublishedMosaic.Type;
type Level = Mosaic["levels"][number];

interface Sprite {
  readonly image: HTMLImageElement;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface Wanted {
  readonly tile: number;
  readonly cell: number;
  readonly devicePixels: number;
}

interface Sprites {
  readonly ready: Effect.Effect<void>;
  readonly overview: (cell: number) => Option.Option<Sprite>;
  readonly best: (wanted: Wanted) => Option.Option<Sprite>;
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

interface Sheet {
  readonly level: Level;
  readonly blocks: Record.ReadonlyRecord<string, Block>;
}

interface Position {
  readonly column: number;
  readonly row: number;
}

type TileLookup = (index: number) => Option.Option<Sprite>;
type SheetLookup = (sheet: Sheet, cell: number) => Option.Option<Sprite>;

const loadImage = (url: string, onLoad: () => void): HTMLImageElement => {
  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", onLoad, { once: true });
  image.src = url;
  return image;
};

const isLoaded = (image: HTMLImageElement): boolean =>
  image.complete && image.naturalWidth > NO_WIDTH;

const whenLoaded = (image: HTMLImageElement): Effect.Effect<void> =>
  Effect.callback((resume) => {
    if (image.complete) {
      resume(Effect.void);
      return;
    }
    const settle = (): void => {
      resume(Effect.void);
    };
    image.addEventListener("load", settle, { once: true });
    image.addEventListener("error", settle, { once: true });
  });

const whenSettled = (image: HTMLImageElement): Effect.Effect<void> =>
  Effect.andThen(whenLoaded(image), Effect.ignore(Effect.tryPromise(() => image.decode())));

const wholeImage = (image: HTMLImageElement): Sprite => ({
  image,
  left: ORIGIN,
  top: ORIGIN,
  width: image.naturalWidth,
  height: image.naturalHeight,
});

const blockKey = ({ column, row }: Position): string => `${column}_${row}`;

const pendingBlock =
  ({ fileUrl, onLoad }: Source) =>
  ([column, row, file]: readonly [number, number, string]): readonly [string, Block] => {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", onLoad);
    return [blockKey({ column, row }), { image, url: fileUrl(file) }];
  };

const sheetOf =
  (source: Source) =>
  (level: Level): Sheet => ({
    level,
    blocks: pipe(level.blocks, Array.map(pendingBlock(source)), Record.fromEntries),
  });

const requested = ({ image, url }: Block): HTMLImageElement => {
  if (image.getAttribute("src") === null) {
    image.src = url;
  }
  return image;
};

const slotIn =
  (level: Level, image: HTMLImageElement) =>
  (position: Position): Sprite => ({
    image,
    left: (position.column % level.block) * level.tw,
    top: (position.row % level.block) * level.th,
    width: level.tw,
    height: level.th,
  });

const blockOf = (position: Position, block: number): Position => ({
  column: Math.floor(position.column / block),
  row: Math.floor(position.row / block),
});

const spriteIn =
  (cols: number): SheetLookup =>
  (sheet, cell) => {
    const position = { column: cell % cols, row: Math.floor(cell / cols) };
    const key = blockKey(blockOf(position, sheet.level.block));
    return pipe(
      Record.get(sheet.blocks, key),
      Option.map(requested),
      Option.filter(isLoaded),
      Option.map((image) => slotIn(sheet.level, image)(position)),
    );
  };

const tileCache = ({ mosaic, fileUrl, onLoad }: Source): TileLookup => {
  const cache = MutableHashMap.empty<number, HTMLImageElement>();
  const startLoading = (index: number): Option.Option<Sprite> => {
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
      onSome: (image) => pipe(Option.some(image), Option.filter(isLoaded), Option.map(wholeImage)),
    });
};

const sharpEnough =
  (devicePixels: number) =>
  (sheet: Sheet): boolean =>
    devicePixels <= sheet.level.tw * SHARPER;

const coarser =
  (sheets: readonly Sheet[], sprite: SheetLookup) =>
  (below: number, cell: number): Option.Option<Sprite> =>
    pipe(
      Array.take(sheets, below),
      Array.reverse,
      Array.findFirst((sheet) => sprite(sheet, cell)),
    );

const pickBest = ({
  sheets,
  sprite,
  tile,
}: Readonly<{
  sheets: readonly Sheet[];
  sprite: SheetLookup;
  tile: TileLookup;
}>): Sprites["best"] => {
  const fallback = coarser(sheets, sprite);
  return ({ tile: index, cell, devicePixels }) =>
    Option.match(Array.findFirstIndex(sheets, sharpEnough(devicePixels)), {
      onNone: () => Option.orElse(tile(index), () => fallback(sheets.length, cell)),
      onSome: (wanted) =>
        pipe(
          Array.get(sheets, wanted),
          Option.flatMap((sheet) => sprite(sheet, cell)),
          Option.orElse(() => fallback(wanted, cell)),
        ),
    });
};

const overviewBlocks = (sheets: readonly Sheet[]): readonly HTMLImageElement[] =>
  pipe(
    Array.get(sheets, OVERVIEW),
    Option.match({
      onNone: (): readonly HTMLImageElement[] => [],
      onSome: (sheet) => pipe(Record.values(sheet.blocks), Array.map(requested)),
    }),
  );

const createSprites = (source: Source): Sprites => {
  const sheets = pipe(source.mosaic.levels, Array.map(sheetOf(source)));
  const sprite = spriteIn(source.mosaic.cols);
  return {
    ready: Effect.forEach(overviewBlocks(sheets), (image) => whenSettled(image), {
      concurrency: "unbounded",
      discard: true,
    }),
    overview: (cell) =>
      pipe(
        Array.get(sheets, OVERVIEW),
        Option.flatMap((sheet) => sprite(sheet, cell)),
      ),
    best: pickBest({ sheets, sprite, tile: tileCache(source) }),
  };
};

export type { Mosaic, Sprite, Sprites };
export { createSprites };

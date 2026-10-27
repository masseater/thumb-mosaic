import type { PublishedMosaic } from "@thumb-mosaic/mosaic";
import { Array, Effect, MutableHashMap, Option, pipe } from "effect";

const TILE_CACHE_SIZE = 384;
const ORIGIN = 0;
const NO_WIDTH = 0;
const FIRST_LEVEL = 0;

type Mosaic = typeof PublishedMosaic.Type;
type Level = Mosaic["levels"][number];

interface Sprite {
  readonly image: HTMLImageElement;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface Sprites {
  readonly ready: Effect.Effect<void>;
  readonly atlas: (level: number, index: number) => Option.Option<Sprite>;
  readonly tile: (index: number) => Option.Option<Sprite>;
  readonly atlasWidth: (level: number) => number;
}

interface Source {
  readonly mosaic: Mosaic;
  readonly fileUrl: (file: string) => string;
  readonly onLoad: () => void;
}

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

const atlasSlot = ({
  level,
  image,
  index,
}: Readonly<{ level: Level; image: HTMLImageElement; index: number }>): Sprite => {
  const slot = index % level.perAtlas;
  return {
    image,
    left: (slot % level.perRow) * level.tw,
    top: Math.floor(slot / level.perRow) * level.th,
    width: level.tw,
    height: level.th,
  };
};

const atlasesOf = ({ mosaic, onLoad }: Source): readonly (readonly HTMLImageElement[])[] =>
  pipe(
    mosaic.levels,
    Array.map((level) =>
      pipe(
        level.files,
        Array.map(() => {
          const image = new Image();
          image.decoding = "async";
          image.addEventListener("load", onLoad);
          return image;
        }),
      ),
    ),
  );

const requested = (image: HTMLImageElement, url: string): HTMLImageElement => {
  if (image.getAttribute("src") === null) {
    image.src = url;
  }
  return image;
};

const tileCache = ({ mosaic, fileUrl, onLoad }: Source): Sprites["tile"] => {
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

const createSprites = (source: Source): Sprites => {
  const atlases = atlasesOf(source);
  const levelAt = (levelIndex: number): Option.Option<Level> =>
    Array.get(source.mosaic.levels, levelIndex);
  const sheet = (levelIndex: number, slot: number): Option.Option<HTMLImageElement> =>
    Option.gen(function* sheetOf() {
      const level = yield* levelAt(levelIndex);
      const file = yield* Array.get(level.files, slot);
      const image = yield* Array.get(yield* Array.get(atlases, levelIndex), slot);
      return requested(image, source.fileUrl(file));
    });
  const first = pipe(
    levelAt(FIRST_LEVEL),
    Option.match({ onNone: (): readonly string[] => [], onSome: (level) => level.files }),
    Array.map((_file, slot) => sheet(FIRST_LEVEL, slot)),
    Array.getSomes,
  );
  return {
    ready: Effect.forEach(first, whenSettled, { concurrency: "unbounded", discard: true }),
    atlas: (levelIndex, index) =>
      Option.gen(function* atlasSprite() {
        const level = yield* levelAt(levelIndex);
        const image = yield* sheet(levelIndex, Math.floor(index / level.perAtlas));
        const loaded = yield* Option.filter(Option.some(image), isLoaded);
        return atlasSlot({ level, image: loaded, index });
      }),
    tile: tileCache(source),
    atlasWidth: (levelIndex) =>
      pipe(
        levelAt(levelIndex),
        Option.match({ onNone: () => NO_WIDTH, onSome: (level) => level.tw }),
      ),
  };
};

export type { Mosaic, Sprite, Sprites };
export { createSprites };

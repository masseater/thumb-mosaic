import { Array, Option, pipe } from "effect";

import { CELL_HEIGHT, CELL_WIDTH } from "./camera";
import type { Scene } from "./scene";
import type { Level, Sprites } from "./sprites";

const ONE = 1;
const ORIGIN = 0;
const OVERVIEW = 0;
const HOVER_MIN_TILE_PIXELS = 10;
const HOVER_WIDTH = 2;
const SELECTION_WIDTH = 3;

interface Span {
  readonly col: number;
  readonly row: number;
  readonly cols: number;
  readonly rows: number;
}

interface Item {
  readonly image: HTMLImageElement;
  readonly span: Span;
}

interface Outline {
  readonly span: Span;
  readonly width: number;
  readonly kind: "hover" | "selection";
}

interface Source {
  readonly scene: Scene;
  readonly sprites: Sprites;
}

interface Range {
  readonly firstCol: number;
  readonly lastCol: number;
  readonly firstRow: number;
  readonly lastRow: number;
}

interface BlockAt {
  readonly sheet: number;
  readonly level: Level;
  readonly request: boolean;
}

const cellSpan = (scene: Scene, cell: number): Span => ({
  col: cell % scene.grid.cols,
  row: Math.floor(cell / scene.grid.cols),
  cols: ONE,
  rows: ONE,
});

const visibleRange = (
  offset: number,
  size: number,
  extent: Readonly<{ view: number; count: number }>,
): readonly [number, number] => [
  Math.max(ORIGIN, Math.floor(-offset / size)),
  Math.min(extent.count - ONE, Math.floor((extent.view - offset) / size)),
];

const visible = (scene: Scene): Range => {
  const { camera, grid, viewport } = scene;
  const [firstCol, lastCol] = visibleRange(camera.left, CELL_WIDTH * camera.scale, {
    view: viewport.width,
    count: grid.cols,
  });
  const [firstRow, lastRow] = visibleRange(camera.top, CELL_HEIGHT * camera.scale, {
    view: viewport.height,
    count: grid.rows,
  });
  return { firstCol, lastCol, firstRow, lastRow };
};

const blockItem = (
  { sprites }: Source,
  { sheet, level, request }: BlockAt,
  [column, row]: readonly [number, number],
): Option.Option<Item> =>
  Option.map(sprites.block({ sheet, column, row, request }), (image) => ({
    image,
    span: {
      col: column * level.block,
      row: row * level.block,
      cols: image.naturalWidth / level.tw,
      rows: image.naturalHeight / level.th,
    },
  }));

const blocksOf = (range: Range, level: Level): readonly (readonly [number, number])[] => {
  const blocks: (readonly [number, number])[] = [];
  for (
    let row = Math.floor(range.firstRow / level.block);
    row * level.block <= range.lastRow;
    row += ONE
  ) {
    for (
      let col = Math.floor(range.firstCol / level.block);
      col * level.block <= range.lastCol;
      col += ONE
    ) {
      blocks.push([col, row]);
    }
  }
  return blocks;
};

const sheetItems = (source: Source, sheet: number, request: boolean): readonly Item[] =>
  Option.match(Array.get(source.sprites.levels, sheet), {
    onNone: (): readonly Item[] => [],
    onSome: (level) =>
      pipe(
        blocksOf(visible(source.scene), level),
        Array.map((at) => blockItem(source, { sheet, level, request }, at)),
        Array.getSomes,
      ),
  });

const planImages = (source: Source): readonly Item[] => {
  const { scene, sprites } = source;
  const wanted = sprites.levelFor(CELL_WIDTH * scene.camera.scale * scene.ratio);
  const sharpest = Math.min(wanted, sprites.levels.length - ONE);
  const sheets = Array.flatMap(Array.range(ORIGIN, sharpest), (sheet) =>
    sheetItems(source, sheet, sheet === sharpest),
  );
  return sheets;
};

const overview = (source: Source): Option.Option<Item> =>
  Option.flatMap(Array.get(source.sprites.levels, OVERVIEW), (level) =>
    blockItem(source, { sheet: OVERVIEW, level, request: true }, [ORIGIN, ORIGIN]),
  );

const outlineOf =
  (scene: Scene) =>
  (tile: number, style: Omit<Outline, "span">): Option.Option<Outline> =>
    Option.map(Array.get(scene.cells, tile), (cell) => ({ ...style, span: cellSpan(scene, cell) }));

const planOutlines = (scene: Scene): readonly Outline[] => {
  const outline = outlineOf(scene);
  const hover = pipe(
    scene.hover,
    Option.filter(() => CELL_WIDTH * scene.camera.scale > HOVER_MIN_TILE_PIXELS),
    Option.flatMap((tile) => outline(tile, { width: HOVER_WIDTH, kind: "hover" })),
  );
  const selection = pipe(
    scene.selection,
    Option.flatMap((tile) => outline(tile, { width: SELECTION_WIDTH, kind: "selection" })),
  );
  return Array.getSomes([hover, selection]);
};

export type { Item, Outline, Source, Span };
export { overview, planImages, planOutlines };

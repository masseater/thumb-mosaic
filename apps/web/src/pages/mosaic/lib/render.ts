import { Array, Option } from "effect";

import { CELL_HEIGHT, CELL_WIDTH } from "./camera";
import type { Scene } from "./scene";
import type { Level, Sprites } from "./sprites";

const ONE = 1;
const ORIGIN = 0;
const IDENTITY = 1;
const NO_SKEW = 0;
const EMPTY = -1;
const HIDDEN = 0;
const LANDED = 1;
const FADE_MS = 600;
const HOVER_MIN_TILE_PIXELS = 10;
const HOVER_WIDTH = 2;
const SELECTION_WIDTH = 3;
const HOVER_COLOR = "rgba(255, 255, 255, 0.95)";
const DRAW = "source-over";
const CLIP = "destination-in";

interface Frame {
  readonly context: CanvasRenderingContext2D;
  readonly scene: Scene;
  readonly sprites: Sprites;
  readonly now: number;
  readonly accent: string;
}

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface Span {
  readonly col: number;
  readonly row: number;
  readonly cols: number;
  readonly rows: number;
}

interface Range {
  readonly firstCol: number;
  readonly lastCol: number;
  readonly firstRow: number;
  readonly lastRow: number;
}

const spanRect = (scene: Scene, span: Span): Rect => {
  const { camera, ratio } = scene;
  const width = CELL_WIDTH * camera.scale;
  const height = CELL_HEIGHT * camera.scale;
  const left = Math.round((camera.left + span.col * width) * ratio);
  const top = Math.round((camera.top + span.row * height) * ratio);
  const right = Math.round((camera.left + (span.col + span.cols) * width) * ratio);
  const bottom = Math.round((camera.top + (span.row + span.rows) * height) * ratio);
  return { left, top, width: right - left, height: bottom - top };
};

const cellRect = (scene: Scene, cell: number): Rect =>
  spanRect(scene, {
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

const paint = (context: CanvasRenderingContext2D, image: HTMLImageElement, rect: Rect): void => {
  context.drawImage(image, rect.left, rect.top, rect.width, rect.height);
};

type CellDraw = (cell: number, tile: number) => void;

const drawRow = (
  scene: Scene,
  { row, range }: Readonly<{ row: number; range: Range }>,
  draw: CellDraw,
): void => {
  for (let col = range.firstCol; col <= range.lastCol; col += ONE) {
    const cell = row * scene.grid.cols + col;
    const tile = scene.tileOfCell[cell] ?? EMPTY;
    if (tile !== EMPTY) {
      draw(cell, tile);
    }
  }
};

const forEachCell = (frame: Frame, draw: CellDraw): void => {
  const range = visible(frame.scene);
  for (let row = range.firstRow; row <= range.lastRow; row += ONE) {
    drawRow(frame.scene, { row, range }, draw);
  }
};

const drawBlock = (
  frame: Frame,
  { sheet, level, request }: Readonly<{ sheet: number; level: Level; request: boolean }>,
  [col, row]: readonly [number, number],
): void => {
  const image = frame.sprites.block({ sheet, column: col, row, request });
  if (Option.isSome(image)) {
    paint(
      frame.context,
      image.value,
      spanRect(frame.scene, {
        col: col * level.block,
        row: row * level.block,
        cols: image.value.naturalWidth / level.tw,
        rows: image.value.naturalHeight / level.th,
      }),
    );
  }
};

const drawSheet = (frame: Frame, sheet: number, request: boolean): void => {
  const found = Array.get(frame.sprites.levels, sheet);
  if (Option.isNone(found)) {
    return;
  }
  const level = found.value;
  const range = visible(frame.scene);
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
      drawBlock(frame, { sheet, level, request }, [col, row]);
    }
  }
};

const drawImages = (frame: Frame): void => {
  const { scene, sprites, context } = frame;
  const wanted = sprites.levelFor(CELL_WIDTH * scene.camera.scale * scene.ratio);
  const sharpest = Math.min(wanted, sprites.levels.length - ONE);
  for (const sheet of sprites.levels.keys()) {
    if (sheet <= sharpest) {
      drawSheet(frame, sheet, sheet === sharpest);
    }
  }
  if (wanted >= sprites.levels.length) {
    forEachCell(frame, (cell, tile) => {
      const image = sprites.tile(tile);
      if (Option.isSome(image)) {
        paint(context, image.value, cellRect(scene, cell));
      }
    });
  }
};

const clipToShape = (frame: Frame): void => {
  const { context, scene, sprites } = frame;
  context.globalCompositeOperation = CLIP;
  paint(
    context,
    sprites.mask,
    spanRect(scene, { col: ORIGIN, row: ORIGIN, cols: scene.grid.cols, rows: scene.grid.rows }),
  );
  context.globalCompositeOperation = DRAW;
};

const revealed = (frame: Frame): number =>
  Math.min(LANDED, Math.max(HIDDEN, (frame.now - frame.scene.reveal) / FADE_MS));

const drawMosaic = (frame: Frame): void => {
  frame.context.globalAlpha = revealed(frame);
  drawImages(frame);
  frame.context.globalAlpha = LANDED;
  clipToShape(frame);
};

const outline = (
  frame: Frame,
  tile: number,
  style: Readonly<{ color: string; width: number }>,
): void => {
  const { context, scene } = frame;
  const cell = Array.get(scene.cells, tile);
  if (Option.isNone(cell)) {
    return;
  }
  const rect = cellRect(scene, cell.value);
  context.strokeStyle = style.color;
  context.lineWidth = style.width * scene.ratio;
  context.strokeRect(rect.left, rect.top, rect.width, rect.height);
};

const clear = (context: CanvasRenderingContext2D): void => {
  context.setTransform(IDENTITY, NO_SKEW, NO_SKEW, IDENTITY, ORIGIN, ORIGIN);
  context.globalAlpha = LANDED;
  context.globalCompositeOperation = DRAW;
  context.clearRect(ORIGIN, ORIGIN, context.canvas.width, context.canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
};

const drawHighlights = (frame: Frame): void => {
  const { scene } = frame;
  if (Option.isSome(scene.hover) && CELL_WIDTH * scene.camera.scale > HOVER_MIN_TILE_PIXELS) {
    outline(frame, scene.hover.value, { color: HOVER_COLOR, width: HOVER_WIDTH });
  }
  if (Option.isSome(scene.selection)) {
    outline(frame, scene.selection.value, { color: frame.accent, width: SELECTION_WIDTH });
  }
};

const drawScene = (frame: Frame): void => {
  clear(frame.context);
  drawMosaic(frame);
  drawHighlights(frame);
};

const isFading =
  (now: number) =>
  (scene: Scene): boolean =>
    now < scene.reveal + FADE_MS;

export type { Frame };
export { drawScene, isFading };

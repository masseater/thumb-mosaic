import { Array, Option, pipe } from "effect";

import type { Point } from "./camera";
import { CELL_HEIGHT, CELL_WIDTH } from "./camera";
import { LANDED, poseAt } from "./intro";
import type { Flight, Pose } from "./intro";
import type { Scene } from "./scene";
import type { Sprite, Sprites } from "./sprites";

const SMALL = 0;
const LARGE = 1;
const SHARPER = 1.2;
const HALF = 0.5;
const ORIGIN = 0;
const IDENTITY = 1;
const NO_SKEW = 0;
const EMPTY = -1;
const HOVER_MIN_TILE_PIXELS = 10;
const HOVER_WIDTH = 2;
const SELECTION_WIDTH = 3;
const HOVER_COLOR = "rgba(255, 255, 255, 0.95)";

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

const blit = (context: CanvasRenderingContext2D, sprite: Sprite, rect: Rect): void => {
  context.drawImage(
    sprite.image,
    sprite.left,
    sprite.top,
    sprite.width,
    sprite.height,
    rect.left,
    rect.top,
    rect.width,
    rect.height,
  );
};

const spriteFor = ({ sprites, scene }: Frame, tile: number): Option.Option<Sprite> => {
  const devicePixels = CELL_WIDTH * scene.camera.scale * scene.ratio;
  const small = (): Option.Option<Sprite> => sprites.atlas(SMALL, tile);
  const large = (): Option.Option<Sprite> => pipe(sprites.atlas(LARGE, tile), Option.orElse(small));
  if (devicePixels > sprites.atlasWidth(LARGE) * SHARPER) {
    return pipe(sprites.tile(tile), Option.orElse(large));
  }
  if (devicePixels > sprites.atlasWidth(SMALL) * SHARPER) {
    return large();
  }
  return small();
};

const cellRect = (scene: Scene, cell: number): Rect => {
  const { camera, ratio, grid } = scene;
  const col = cell % grid.cols;
  const row = Math.floor(cell / grid.cols);
  const left = Math.round((camera.left + col * CELL_WIDTH * camera.scale) * ratio);
  const top = Math.round((camera.top + row * CELL_HEIGHT * camera.scale) * ratio);
  const right = Math.round((camera.left + (col + LARGE) * CELL_WIDTH * camera.scale) * ratio);
  const bottom = Math.round((camera.top + (row + LARGE) * CELL_HEIGHT * camera.scale) * ratio);
  return { left, top, width: right - left, height: bottom - top };
};

const visibleRange = (
  offset: number,
  size: number,
  extent: Readonly<{ view: number; count: number }>,
): readonly [number, number] => [
  Math.max(ORIGIN, Math.floor(-offset / size)),
  Math.min(extent.count - LARGE, Math.floor((extent.view - offset) / size)),
];

const drawCell = (frame: Frame, cell: number): void => {
  const tile = frame.scene.tileOfCell[cell] ?? EMPTY;
  if (tile === EMPTY) {
    return;
  }
  const sprite = spriteFor(frame, tile);
  if (Option.isSome(sprite)) {
    blit(frame.context, sprite.value, cellRect(frame.scene, cell));
  }
};

const drawGrid = (frame: Frame): void => {
  const { scene } = frame;
  const { camera, grid, viewport } = scene;
  const [firstCol, lastCol] = visibleRange(camera.left, CELL_WIDTH * camera.scale, {
    view: viewport.width,
    count: grid.cols,
  });
  const [firstRow, lastRow] = visibleRange(camera.top, CELL_HEIGHT * camera.scale, {
    view: viewport.height,
    count: grid.rows,
  });
  for (let row = firstRow; row <= lastRow; row += LARGE) {
    for (let col = firstCol; col <= lastCol; col += LARGE) {
      drawCell(frame, row * grid.cols + col);
    }
  }
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

const flightCenter = (scene: Scene, cell: number): Point => {
  const { camera, grid } = scene;
  return {
    left: camera.left + ((cell % grid.cols) + HALF) * CELL_WIDTH * camera.scale,
    top: camera.top + (Math.floor(cell / grid.cols) + HALF) * CELL_HEIGHT * camera.scale,
  };
};

const placeFlight = (frame: Frame, pose: Pose, center: Point): void => {
  const { context, scene } = frame;
  const cos = Math.cos(pose.rotation) * scene.ratio;
  const sin = Math.sin(pose.rotation) * scene.ratio;
  context.setTransform(
    cos,
    sin,
    -sin,
    cos,
    (center.left + pose.shiftX) * scene.ratio,
    (center.top + pose.shiftY) * scene.ratio,
  );
  context.globalAlpha = pose.alpha;
};

const drawFlight = (
  frame: Frame,
  { flight, tile }: Readonly<{ flight: Flight; tile: number }>,
  elapsed: number,
): void => {
  const { scene } = frame;
  const pose = poseAt({ flight, elapsed });
  placeFlight(frame, pose, flightCenter(scene, scene.cells[tile] ?? ORIGIN));
  const width = CELL_WIDTH * scene.camera.scale * pose.scale;
  const height = CELL_HEIGHT * scene.camera.scale * pose.scale;
  const sprite = frame.sprites.atlas(SMALL, tile);
  if (Option.isSome(sprite)) {
    blit(frame.context, sprite.value, { left: -width * HALF, top: -height * HALF, width, height });
  }
};

const resetTransform = (context: CanvasRenderingContext2D): void => {
  context.setTransform(IDENTITY, NO_SKEW, NO_SKEW, IDENTITY, ORIGIN, ORIGIN);
  context.globalAlpha = LANDED;
};

const drawIntro = (frame: Frame, flights: readonly Flight[], elapsed: number): void => {
  for (const [tile, flight] of flights.entries()) {
    drawFlight(frame, { flight, tile }, elapsed);
  }
  resetTransform(frame.context);
};

const clear = (context: CanvasRenderingContext2D): void => {
  resetTransform(context);
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
  const { context, scene } = frame;
  clear(context);
  if (scene.motion.status === "intro") {
    drawIntro(frame, scene.motion.flights, frame.now - scene.motion.start);
    return;
  }
  drawGrid(frame);
  drawHighlights(frame);
};

export type { Frame };
export { drawScene };

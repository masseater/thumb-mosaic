import { Option } from "effect";

const CELL_WIDTH = 16;
const CELL_HEIGHT = 9;
const FIT_MARGIN = 0.94;
const MIN_ZOOM_OF_FIT = 0.6;
const MAX_TILE_PIXELS = 640;
const HALF = 0.5;
const FIRST = 0;

interface Size {
  readonly width: number;
  readonly height: number;
}

interface Point {
  readonly left: number;
  readonly top: number;
}

interface Camera {
  readonly scale: number;
  readonly left: number;
  readonly top: number;
}

interface Grid {
  readonly cols: number;
  readonly rows: number;
}

interface View {
  readonly viewport: Size;
  readonly grid: Grid;
}

const worldOf = ({ cols, rows }: Grid): Size => ({
  width: cols * CELL_WIDTH,
  height: rows * CELL_HEIGHT,
});

const fitScale = ({ viewport, grid }: View): number => {
  const world = worldOf(grid);
  return Math.min(viewport.width / world.width, viewport.height / world.height) * FIT_MARGIN;
};

const centeredOn = ({
  viewport,
  center,
  scale,
}: Readonly<{ viewport: Size; center: Point; scale: number }>): Camera => ({
  scale,
  left: viewport.width * HALF - center.left * scale,
  top: viewport.height * HALF - center.top * scale,
});

const worldCenter = (grid: Grid): Point => {
  const world = worldOf(grid);
  return { left: world.width * HALF, top: world.height * HALF };
};

const fitCamera = (view: View): Camera =>
  centeredOn({ viewport: view.viewport, center: worldCenter(view.grid), scale: fitScale(view) });

const maxScale = (devicePixelRatio: number): number =>
  MAX_TILE_PIXELS / CELL_WIDTH / devicePixelRatio;

const clampScale = ({
  scale,
  fit,
  max,
}: Readonly<{ scale: number; fit: number; max: number }>): number =>
  Math.min(max, Math.max(fit * MIN_ZOOM_OF_FIT, scale));

const zoomAround = ({
  camera,
  point,
  scale,
}: Readonly<{ camera: Camera; point: Point; scale: number }>): Camera => ({
  scale,
  left: point.left - (point.left - camera.left) * (scale / camera.scale),
  top: point.top - (point.top - camera.top) * (scale / camera.scale),
});

const toWorld = ({ camera, point }: Readonly<{ camera: Camera; point: Point }>): Point => ({
  left: (point.left - camera.left) / camera.scale,
  top: (point.top - camera.top) / camera.scale,
});

const cellCenter = ({ cell, grid }: Readonly<{ cell: number; grid: Grid }>): Point => ({
  left: ((cell % grid.cols) + HALF) * CELL_WIDTH,
  top: (Math.floor(cell / grid.cols) + HALF) * CELL_HEIGHT,
});

const inGrid = ({ col, row, grid }: Readonly<{ col: number; row: number; grid: Grid }>): boolean =>
  col >= FIRST && row >= FIRST && col < grid.cols && row < grid.rows;

const cellAt = ({
  camera,
  point,
  grid,
}: Readonly<{ camera: Camera; point: Point; grid: Grid }>): Option.Option<number> => {
  const world = toWorld({ camera, point });
  const col = Math.floor(world.left / CELL_WIDTH);
  const row = Math.floor(world.top / CELL_HEIGHT);
  return Option.liftPredicate(row * grid.cols + col, () => inGrid({ col, row, grid }));
};

export type { Camera, Grid, Point, Size, View };
export {
  CELL_HEIGHT,
  CELL_WIDTH,
  cellAt,
  cellCenter,
  centeredOn,
  clampScale,
  fitCamera,
  fitScale,
  maxScale,
  toWorld,
  worldCenter,
  zoomAround,
};

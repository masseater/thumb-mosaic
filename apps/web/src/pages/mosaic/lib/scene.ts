import { Array, Option, Record, pipe } from "effect";

import type { Camera, Grid, Point, Size } from "./camera";
import {
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
} from "./camera";
import type { Flight } from "./intro";

const FOCUS_TILE_PIXELS = 160;
const DOUBLE_TAP_ZOOM = 3;
const EMPTY = -1;

type Motion =
  | Readonly<{ status: "still" }>
  | Readonly<{ status: "intro"; start: number; flights: readonly Flight[] }>
  | Readonly<{ status: "flying"; start: number; from: Camera; to: Camera }>;

type Gesture =
  | Readonly<{ status: "none" }>
  | Readonly<{ status: "press"; origin: Point; camera: Camera; at: number }>
  | Readonly<{ status: "drag"; origin: Point; camera: Camera }>
  | Readonly<{ status: "pinch"; distance: number; scale: number }>;

interface Scene {
  readonly grid: Grid;
  readonly cells: readonly number[];
  readonly tileOfCell: readonly number[];
  readonly viewport: Size;
  readonly ratio: number;
  readonly camera: Camera;
  readonly motion: Motion;
  readonly gesture: Gesture;
  readonly pointers: Record.ReadonlyRecord<string, Point>;
  readonly hover: Option.Option<number>;
  readonly selection: Option.Option<number>;
}

type Step = (scene: Scene) => Scene;

const STILL: Motion = { status: "still" };
const NO_GESTURE: Gesture = { status: "none" };

const fitOf = (scene: Scene): number => fitScale({ viewport: scene.viewport, grid: scene.grid });

const tileIndexByCell = (grid: Grid, cells: readonly number[]): readonly number[] => {
  const tileOfCell = Array.makeBy(grid.cols * grid.rows, () => EMPTY);
  for (const [index, cell] of cells.entries()) {
    tileOfCell[cell] = index;
  }
  return tileOfCell;
};

const createScene = ({
  grid,
  cells,
  viewport,
  ratio,
}: Readonly<{ grid: Grid; cells: readonly number[]; viewport: Size; ratio: number }>): Scene => ({
  grid,
  cells,
  tileOfCell: tileIndexByCell(grid, cells),
  viewport,
  ratio,
  camera: fitCamera({ viewport, grid }),
  motion: STILL,
  gesture: NO_GESTURE,
  pointers: Record.empty(),
  hover: Option.none(),
  selection: Option.none(),
});

const tileAt =
  (point: Point) =>
  (scene: Scene): Option.Option<number> =>
    pipe(
      cellAt({ camera: scene.camera, point, grid: scene.grid }),
      Option.flatMap((cell) => Array.get(scene.tileOfCell, cell)),
      Option.filter((tile) => tile !== EMPTY),
    );

const resize =
  ({ viewport, ratio }: Readonly<{ viewport: Size; ratio: number }>): Step =>
  (scene) => {
    const resized = { ...scene, viewport, ratio };
    if (scene.camera.scale <= fitOf(scene)) {
      return { ...resized, camera: fitCamera({ viewport, grid: scene.grid }) };
    }
    return resized;
  };

const zoomAt =
  ({ point, factor }: Readonly<{ point: Point; factor: number }>): Step =>
  (scene) => ({
    ...scene,
    motion: STILL,
    camera: zoomAround({
      camera: scene.camera,
      point,
      scale: clampScale({
        scale: scene.camera.scale * factor,
        fit: fitOf(scene),
        max: maxScale(scene.ratio),
      }),
    }),
  });

const flyTo =
  ({ center, scale, now }: Readonly<{ center: Point; scale: number; now: number }>): Step =>
  (scene) => ({
    ...scene,
    motion: {
      status: "flying",
      start: now,
      from: scene.camera,
      to: centeredOn({ viewport: scene.viewport, center, scale }),
    },
  });

const flyHome =
  (now: number): Step =>
  (scene) =>
    flyTo({ center: worldCenter(scene.grid), scale: fitOf(scene), now })(scene);

const focus =
  ({ tile, now }: Readonly<{ tile: number; now: number }>): Step =>
  (scene) =>
    pipe(
      Array.get(scene.cells, tile),
      Option.match({
        onNone: () => scene,
        onSome: (cell) => ({
          ...flyTo({
            center: cellCenter({ cell, grid: scene.grid }),
            scale: Math.min(maxScale(scene.ratio), FOCUS_TILE_PIXELS / CELL_WIDTH),
            now,
          })(scene),
          selection: Option.some(tile),
        }),
      }),
    );

const zoomInAt =
  ({ point, now }: Readonly<{ point: Point; now: number }>): Step =>
  (scene) =>
    flyTo({
      center: toWorld({ camera: scene.camera, point }),
      scale: Math.min(maxScale(scene.ratio), scene.camera.scale * DOUBLE_TAP_ZOOM),
      now,
    })(scene);

const playIntro =
  ({ flights, now }: Readonly<{ flights: readonly Flight[]; now: number }>): Step =>
  (scene) => ({
    ...scene,
    camera: fitCamera({ viewport: scene.viewport, grid: scene.grid }),
    selection: Option.none(),
    motion: { status: "intro", start: now, flights },
  });

const settle =
  (camera: Camera): Step =>
  (scene) => ({ ...scene, camera, motion: STILL });

const select =
  (selection: Option.Option<number>): Step =>
  (scene) => ({ ...scene, selection });

export type { Gesture, Motion, Scene, Step };
export {
  NO_GESTURE,
  STILL,
  createScene,
  flyHome,
  focus,
  playIntro,
  resize,
  select,
  settle,
  tileAt,
  zoomAt,
  zoomInAt,
};

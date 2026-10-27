import { Array, Effect, Random, pipe } from "effect";

import type { Grid, View } from "./camera";
import { CELL_HEIGHT, CELL_WIDTH } from "./camera";

const RADIUS_OF_DIAGONAL = 0.75;
const RADIUS_MIN = 0.8;
const RADIUS_SPREAD = 0.6;
const ROTATION_SPREAD = 2.4;
const DELAY_RANDOM_MS = 1500;
const DELAY_BY_DISTANCE_MS = 500;
const FLIGHT_MS = 1300;
const START_SCALE_EXTRA = 2.5;
const FADE_IN_SPEED = 3;
const EASE_POWER = 4;
const HALF = 0.5;
const NOT_STARTED = 0;
const LANDED = 1;
const TURN = Math.PI + Math.PI;

interface Flight {
  readonly startX: number;
  readonly startY: number;
  readonly rotation: number;
  readonly delay: number;
}

interface Pose {
  readonly progress: number;
  readonly shiftX: number;
  readonly shiftY: number;
  readonly scale: number;
  readonly rotation: number;
  readonly alpha: number;
}

const easeOut = (progress: number): number => LANDED - (LANDED - progress) ** EASE_POWER;

const distanceFromCenter = ({ cell, grid }: Readonly<{ cell: number; grid: Grid }>): number => {
  const aspect = CELL_HEIGHT / CELL_WIDTH;
  const farthest = Math.hypot(grid.cols * HALF, grid.rows * HALF * aspect);
  return (
    Math.hypot(
      (cell % grid.cols) - grid.cols * HALF,
      (Math.floor(cell / grid.cols) - grid.rows * HALF) * aspect,
    ) / farthest
  );
};

const seedFlight = ({
  cell,
  grid,
  radius,
}: Readonly<{ cell: number; grid: Grid; radius: number }>): Effect.Effect<Flight> =>
  Effect.gen(function* seed() {
    const angle = (yield* Random.next) * TURN;
    const reach = radius * (RADIUS_MIN + (yield* Random.next) * RADIUS_SPREAD);
    return {
      startX: Math.cos(angle) * reach,
      startY: Math.sin(angle) * reach,
      rotation: ((yield* Random.next) - HALF) * ROTATION_SPREAD,
      delay:
        (yield* Random.next) * DELAY_RANDOM_MS +
        distanceFromCenter({ cell, grid }) * DELAY_BY_DISTANCE_MS,
    };
  });

const seedFlights = ({
  cells,
  view,
}: Readonly<{ cells: readonly number[]; view: View }>): Effect.Effect<readonly Flight[]> => {
  const radius = Math.hypot(view.viewport.width, view.viewport.height) * RADIUS_OF_DIAGONAL;
  return pipe(
    cells,
    Array.map((cell) => seedFlight({ cell, grid: view.grid, radius })),
    Effect.all,
  );
};

const poseAt = ({ flight, elapsed }: Readonly<{ flight: Flight; elapsed: number }>): Pose => {
  const progress = Math.min(LANDED, Math.max(NOT_STARTED, (elapsed - flight.delay) / FLIGHT_MS));
  const remaining = LANDED - easeOut(progress);
  return {
    progress,
    shiftX: flight.startX * remaining,
    shiftY: flight.startY * remaining,
    scale: LANDED + remaining * START_SCALE_EXTRA,
    rotation: flight.rotation * remaining,
    alpha: Math.min(LANDED, progress * FADE_IN_SPEED),
  };
};

export type { Flight, Pose };
export { FLIGHT_MS, LANDED, poseAt, seedFlights };

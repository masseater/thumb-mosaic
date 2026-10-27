import { CELL_HEIGHT, CELL_WIDTH } from "./camera";
import { LANDED, poseAt } from "./intro";
import type { Flight, Pose } from "./intro";
import type { Scene } from "./scene";
import type { Sprites } from "./sprites";

const HALF = 0.5;
const ORIGIN = 0;
const HIDDEN = 0;
const FALLBACK_COLOR = "#ffffff";

interface Painter {
  readonly context: CanvasRenderingContext2D;
  readonly scene: Scene;
  readonly sprites: Sprites;
}

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const flightRect = (scene: Scene, cell: number, pose: Pose): Rect => {
  const { camera, grid, ratio } = scene;
  const width = CELL_WIDTH * camera.scale * pose.scale;
  const height = CELL_HEIGHT * camera.scale * pose.scale;
  const left = camera.left + ((cell % grid.cols) + HALF) * CELL_WIDTH * camera.scale + pose.shiftX;
  const top =
    camera.top + (Math.floor(cell / grid.cols) + HALF) * CELL_HEIGHT * camera.scale + pose.shiftY;
  return {
    left: (left - width * HALF) * ratio,
    top: (top - height * HALF) * ratio,
    width: width * ratio,
    height: height * ratio,
  };
};

const drawFlight = (
  frame: Painter,
  { flight, tile }: Readonly<{ flight: Flight; tile: number }>,
  elapsed: number,
): void => {
  const { context, scene, sprites } = frame;
  const pose = poseAt({ flight, elapsed });
  if (pose.alpha > HIDDEN) {
    const rect = flightRect(scene, scene.cells[tile] ?? ORIGIN, pose);
    context.globalAlpha = pose.alpha;
    context.fillStyle = sprites.colors[tile] ?? FALLBACK_COLOR;
    context.fillRect(rect.left, rect.top, rect.width, rect.height);
  }
};

const drawIntro = ({
  frame,
  flights,
  elapsed,
}: Readonly<{ frame: Painter; flights: readonly Flight[]; elapsed: number }>): void => {
  for (const [tile, flight] of flights.entries()) {
    drawFlight(frame, { flight, tile }, elapsed);
  }
  frame.context.globalAlpha = LANDED;
};

export { drawIntro };

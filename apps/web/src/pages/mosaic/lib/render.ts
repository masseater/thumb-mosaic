import { CELL_HEIGHT, CELL_WIDTH } from "./camera";
import { planImages, planOutlines } from "./plan";
import type { Outline, Source, Span } from "./plan";
import type { Scene } from "./scene";

const ORIGIN = 0;
const IDENTITY = 1;
const NO_SKEW = 0;
const HIDDEN = 0;
const LANDED = 1;
const FADE_MS = 600;
const HOVER_COLOR = "rgba(255, 255, 255, 0.95)";
const DRAW = "source-over";

interface Frame extends Source {
  readonly context: CanvasRenderingContext2D;
  readonly now: number;
  readonly accent: string;
}

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
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

const paint = (frame: Frame, image: HTMLImageElement, span: Span): void => {
  const rect = spanRect(frame.scene, span);
  frame.context.drawImage(image, rect.left, rect.top, rect.width, rect.height);
};

const revealed = (frame: Frame): number =>
  Math.min(LANDED, Math.max(HIDDEN, (frame.now - frame.scene.reveal) / FADE_MS));

const drawMosaic = (frame: Frame): void => {
  frame.context.globalAlpha = revealed(frame);
  for (const item of planImages(frame)) {
    paint(frame, item.image, item.span);
  }
  frame.context.globalAlpha = LANDED;
};

const outline = (frame: Frame, { span, width, kind }: Outline): void => {
  const { context, scene } = frame;
  const rect = spanRect(scene, span);
  context.strokeStyle = frame.accent;
  if (kind === "hover") {
    context.strokeStyle = HOVER_COLOR;
  }
  context.lineWidth = width * scene.ratio;
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

const drawScene = (frame: Frame): void => {
  clear(frame.context);
  drawMosaic(frame);
  for (const item of planOutlines(frame.scene)) {
    outline(frame, item);
  }
};

const isFading =
  (now: number) =>
  (scene: Scene): boolean =>
    now < scene.reveal + FADE_MS;

export type { Frame };
export { drawScene, isFading };

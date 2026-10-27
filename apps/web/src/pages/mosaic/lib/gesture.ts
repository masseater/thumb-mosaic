import { Array, Match, Option, Record } from "effect";

import type { Camera, Point } from "./camera";
import type { Scene, Step } from "./scene";
import { NO_GESTURE, STILL, tileAt, zoomAt } from "./scene";

const DRAG_THRESHOLD = 5;
const TAP_MS = 500;
const PINCH_POINTERS = 2;
const FIRST = 0;
const SECOND = 1;

interface PointerInput {
  readonly id: string;
  readonly point: Point;
  readonly now: number;
}

const pinchOf = (
  points: readonly Point[],
): Option.Option<Readonly<{ distance: number; center: Point }>> =>
  Option.gen(function* pinch() {
    const first = yield* Array.get(points, FIRST);
    const second = yield* Array.get(points, SECOND);
    return {
      distance: Math.hypot(first.left - second.left, first.top - second.top),
      center: {
        left: (first.left + second.left) / PINCH_POINTERS,
        top: (first.top + second.top) / PINCH_POINTERS,
      },
    };
  });

const startPinch = (scene: Scene): Scene =>
  Option.match(pinchOf(Record.values(scene.pointers)), {
    onNone: () => scene,
    onSome: ({ distance }) => ({
      ...scene,
      gesture: { status: "pinch", distance, scale: scene.camera.scale },
    }),
  });

const pointerDown =
  ({ id, point, now }: PointerInput): Step =>
  (scene) => {
    const pressed = { ...scene, motion: STILL, pointers: Record.set(scene.pointers, id, point) };
    if (Record.size(pressed.pointers) >= PINCH_POINTERS) {
      return startPinch(pressed);
    }
    return {
      ...pressed,
      gesture: { status: "press", origin: point, camera: scene.camera, at: now },
    };
  };

const pinchMove = (scene: Scene, gesture: Readonly<{ distance: number; scale: number }>): Scene =>
  Option.match(pinchOf(Record.values(scene.pointers)), {
    onNone: () => scene,
    onSome: ({ distance, center }) =>
      zoomAt({
        point: center,
        factor: (gesture.scale * distance) / gesture.distance / scene.camera.scale,
      })(scene),
  });

const dragTo = (
  scene: Scene,
  gesture: Readonly<{ origin: Point; camera: Camera }>,
  point: Point,
): Scene => ({
  ...scene,
  gesture: { status: "drag", origin: gesture.origin, camera: gesture.camera },
  camera: {
    scale: gesture.camera.scale,
    left: gesture.camera.left + point.left - gesture.origin.left,
    top: gesture.camera.top + point.top - gesture.origin.top,
  },
});

const pressMove = (
  scene: Scene,
  gesture: Readonly<{ origin: Point; camera: Camera }>,
  point: Point,
): Scene => {
  const travel = Math.hypot(point.left - gesture.origin.left, point.top - gesture.origin.top);
  if (travel <= DRAG_THRESHOLD) {
    return scene;
  }
  return dragTo(scene, gesture, point);
};

const trackPointer = (scene: Scene, id: string, point: Point): Scene => {
  if (Record.has(scene.pointers, id)) {
    return { ...scene, pointers: Record.set(scene.pointers, id, point) };
  }
  return scene;
};

const pointerMove =
  ({ id, point }: Readonly<{ id: string; point: Point }>): Step =>
  (scene) => {
    const moved = trackPointer(scene, id, point);
    const { gesture } = moved;
    return Match.value(gesture).pipe(
      Match.discriminatorsExhaustive("status")({
        pinch: (pinch) => pinchMove(moved, pinch),
        press: (press) => pressMove(moved, press, point),
        drag: (drag) => dragTo(moved, drag, point),
        none: () => ({ ...moved, hover: tileAt(point)(moved) }),
      }),
    );
  };

const pointerUp =
  ({ id, point, now }: PointerInput): Step =>
  (scene) => {
    const released = { ...scene, pointers: Record.remove(scene.pointers, id), gesture: NO_GESTURE };
    const { gesture } = scene;
    if (gesture.status === "press" && now - gesture.at < TAP_MS) {
      return { ...released, selection: tileAt(point)(scene) };
    }
    return released;
  };

const leave: Step = (scene) => ({ ...scene, hover: Option.none() });

export { leave, pointerDown, pointerMove, pointerUp };

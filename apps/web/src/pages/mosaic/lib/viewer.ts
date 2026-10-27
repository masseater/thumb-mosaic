import { Array, Effect, Option, Record, pipe } from "effect";

import type { ViewerStore } from "#/pages/mosaic/model/viewer";

import type { Point, Size } from "./camera";
import { leave, pointerDown, pointerMove, pointerUp } from "./gesture";
import { seedFlights } from "./intro";
import { advance } from "./motion";
import { drawScene } from "./render";
import type { Scene } from "./scene";
import { createScene, flyHome, playIntro, resize, select, settle, zoomAt, zoomInAt } from "./scene";
import type { Mosaic, Sprites } from "./sprites";
import { createSprites } from "./sprites";

const HIGH_DENSITY = "(min-resolution: 2dppx)";
const HIGH_RATIO = 2;
const STANDARD_RATIO = 1;
const WHEEL_SPEED = -0.0018;
const KEY_ZOOM = 1.4;
const UNIT = 1;
const KEY_ZOOM_OUT = UNIT / KEY_ZOOM;
const KEY_PAN = 80;
const NO_PAN = 0;
const HALF = 0.5;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const ACCENT_PROPERTY = "--primary";

interface Mount {
  readonly canvas: HTMLCanvasElement;
  readonly mosaic: Mosaic;
  readonly filesBase: string;
  readonly store: ViewerStore;
}

interface Measure {
  readonly viewport: Size;
  readonly ratio: number;
}

const pixelRatio = (): number => {
  if (globalThis.matchMedia(HIGH_DENSITY).matches) {
    return HIGH_RATIO;
  }
  return STANDARD_RATIO;
};

const measure = (canvas: HTMLCanvasElement): Measure => {
  const ratio = pixelRatio();
  const viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
  canvas.width = Math.round(viewport.width * ratio);
  canvas.height = Math.round(viewport.height * ratio);
  return { viewport, ratio };
};

const pointOf = (event: MouseEvent): Point => ({
  left: event.offsetX,
  top: event.offsetY,
});

const prefersReducedMotion = (): boolean => globalThis.matchMedia(REDUCED_MOTION).matches;

const replayIntro = (store: ViewerStore): Effect.Effect<void> =>
  Effect.gen(function* replay() {
    const viewer = store.read();
    if (viewer.status !== "ready" || prefersReducedMotion()) {
      return;
    }
    const { scene } = viewer;
    const flights = yield* seedFlights({
      cells: scene.cells,
      view: { viewport: scene.viewport, grid: scene.grid },
    });
    store.step(playIntro({ flights, now: performance.now() }));
  });

const bindPointer = (canvas: HTMLCanvasElement, store: ViewerStore, signal: AbortSignal): void => {
  const options = { signal };
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      canvas.setPointerCapture(event.pointerId);
      store.step(
        pointerDown({ id: `${event.pointerId}`, point: pointOf(event), now: event.timeStamp }),
      );
    },
    options,
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      store.step(pointerMove({ id: `${event.pointerId}`, point: pointOf(event) }));
    },
    options,
  );
  const release = (event: PointerEvent): void => {
    store.step(
      pointerUp({ id: `${event.pointerId}`, point: pointOf(event), now: event.timeStamp }),
    );
  };
  canvas.addEventListener("pointerup", release, options);
  canvas.addEventListener("pointercancel", release, options);
  canvas.addEventListener(
    "pointerleave",
    () => {
      store.step(leave);
    },
    options,
  );
};

const bindWheel = (canvas: HTMLCanvasElement, store: ViewerStore, signal: AbortSignal): void => {
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      store.step(zoomAt({ point: pointOf(event), factor: Math.exp(event.deltaY * WHEEL_SPEED) }));
    },
    { signal, passive: false },
  );
  canvas.addEventListener(
    "dblclick",
    (event) => {
      store.step(zoomInAt({ point: pointOf(event), now: event.timeStamp }));
    },
    { signal },
  );
};

const panBy =
  (left: number, top: number) =>
  (scene: Scene): Scene =>
    settle({ ...scene.camera, left: scene.camera.left + left, top: scene.camera.top + top })(scene);

const center = (scene: Scene): Point => ({
  left: scene.viewport.width * HALF,
  top: scene.viewport.height * HALF,
});

const keySteps: Readonly<Record<string, (now: number) => (scene: Scene) => Scene>> = {
  "+": () => (scene) => zoomAt({ point: center(scene), factor: KEY_ZOOM })(scene),
  "=": () => (scene) => zoomAt({ point: center(scene), factor: KEY_ZOOM })(scene),
  "-": () => (scene) => zoomAt({ point: center(scene), factor: KEY_ZOOM_OUT })(scene),
  "0": (now) => flyHome(now),
  Escape: () => select(Option.none()),
  ArrowLeft: () => panBy(KEY_PAN, NO_PAN),
  ArrowRight: () => panBy(-KEY_PAN, NO_PAN),
  ArrowUp: () => panBy(NO_PAN, KEY_PAN),
  ArrowDown: () => panBy(NO_PAN, -KEY_PAN),
};

const bindKeys = (store: ViewerStore, signal: AbortSignal): void => {
  globalThis.addEventListener(
    "keydown",
    (event) => {
      const step = Record.get(keySteps, event.key);
      if (Option.isSome(step) && !(event.target instanceof HTMLInputElement)) {
        store.step(step.value(event.timeStamp));
      }
    },
    { signal },
  );
};

const bindResize = (canvas: HTMLCanvasElement, store: ViewerStore, signal: AbortSignal): void => {
  const observer = new ResizeObserver(() => {
    store.step(resize(measure(canvas)));
  });
  observer.observe(canvas);
  signal.addEventListener(
    "abort",
    () => {
      observer.disconnect();
    },
    { once: true },
  );
};

const advanceFor =
  (reduced: boolean, now: number) =>
  (scene: Scene): Scene => {
    const advanced = advance(now)(scene);
    if (reduced && advanced.motion.status === "flying") {
      return settle(advanced.motion.to)(advanced);
    }
    return advanced;
  };

const needsDraw = (scene: Scene, drawn: Option.Option<Scene>, dirty: boolean): boolean =>
  dirty || !Option.contains(drawn, scene) || scene.motion.status !== "still";

const startLoop = (
  { canvas, store }: Pick<Mount, "canvas" | "store">,
  sprites: Readonly<{ sprites: Sprites; dirty: () => boolean }>,
  signal: AbortSignal,
): void => {
  const context = canvas.getContext("2d");
  if (context === null) {
    return;
  }
  const accent = getComputedStyle(canvas).getPropertyValue(ACCENT_PROPERTY);
  const reduced = prefersReducedMotion();
  let drawn: Option.Option<Scene> = Option.none();
  const frame = (now: number): void => {
    if (signal.aborted) {
      return;
    }
    store.step(advanceFor(reduced, now));
    const viewer = store.read();
    if (viewer.status === "ready" && needsDraw(viewer.scene, drawn, sprites.dirty())) {
      drawScene({ context, scene: viewer.scene, sprites: sprites.sprites, now, accent });
      drawn = Option.some(viewer.scene);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

interface Invalidation {
  readonly mark: () => void;
  readonly take: () => boolean;
}

const createInvalidation = (): Invalidation => {
  let dirty = true;
  return {
    mark: () => {
      dirty = true;
    },
    take: () => {
      const was = dirty;
      dirty = false;
      return was;
    },
  };
};

const bindAll = (canvas: HTMLCanvasElement, store: ViewerStore, signal: AbortSignal): void => {
  bindPointer(canvas, store, signal);
  bindWheel(canvas, store, signal);
  bindKeys(store, signal);
  bindResize(canvas, store, signal);
};

const revealWhenReady = ({
  canvas,
  mosaic,
  store,
  sprites,
  signal,
}: Readonly<
  Omit<Mount, "filesBase"> & { sprites: Sprites; signal: AbortSignal }
>): Effect.Effect<void> =>
  Effect.gen(function* reveal() {
    yield* sprites.ready;
    if (signal.aborted) {
      return;
    }
    const cells = pipe(
      mosaic.tiles,
      Array.map(([cell]) => cell),
    );
    store.write({
      status: "ready",
      scene: createScene({ grid: mosaic, cells, ...measure(canvas) }),
    });
    yield* replayIntro(store);
  });

const mountViewer = ({ canvas, mosaic, filesBase, store }: Mount): (() => void) => {
  const controller = new AbortController();
  const invalidation = createInvalidation();
  const sprites = createSprites({
    mosaic,
    fileUrl: (file) => `${filesBase}/${file}`,
    onLoad: invalidation.mark,
  });
  store.write({ status: "loading" });
  bindAll(canvas, store, controller.signal);
  startLoop({ canvas, store }, { sprites, dirty: invalidation.take }, controller.signal);
  Effect.runFork(revealWhenReady({ canvas, mosaic, store, sprites, signal: controller.signal }));

  return () => {
    controller.abort();
  };
};

export { mountViewer, replayIntro };

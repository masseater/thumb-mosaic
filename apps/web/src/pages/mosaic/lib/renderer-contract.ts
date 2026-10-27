import type { Effect } from "effect";

import type { Scene } from "./scene";
import type { Sprites } from "./sprites";

interface RenderFrame {
  readonly scene: Scene;
  readonly sprites: Sprites;
  readonly now: number;
}

interface Renderer {
  readonly draw: (frame: RenderFrame) => void;
  readonly animating: (now: number) => (scene: Scene) => boolean;
  readonly prepare: (sprites: Sprites) => Effect.Effect<void>;
}

interface Target {
  readonly canvas: HTMLCanvasElement;
  readonly cells: readonly number[];
  readonly onReady: () => void;
}

export type { RenderFrame, Renderer, Target };

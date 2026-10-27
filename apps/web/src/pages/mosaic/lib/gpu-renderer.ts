import { Array, Effect, Option, pipe } from "effect";

import { acquireGpu } from "./gpu-device";
import type { Gpu } from "./gpu-device";
import { drawGpuFrame, isIntro } from "./gpu-frame";
import type { Bound, Color } from "./gpu-frame";
import { cellsBuffer, createPipelines, drawGroup, frameGroup } from "./gpu-pipelines";
import type { Pipelines } from "./gpu-pipelines";
import { createTextures } from "./gpu-textures";
import type { Textures } from "./gpu-textures";
import type { Renderer, Target } from "./renderer-contract";
import type { Sprites } from "./sprites";

const CHANNEL = 255;
const ONE_PIXEL = 1;
const ORIGIN = 0;
const OVERVIEW = 0;
const OPAQUE = 1;
const FALLBACK: Color = [ORIGIN, ORIGIN, ORIGIN, OPAQUE];

interface Parts {
  readonly gpu: Gpu;
  readonly pipelines: Pipelines;
  readonly textures: Textures;
  readonly blank: GPUBindGroup;
  readonly cells: GPUBuffer;
  readonly accent: Color;
}

const parseColor = (css: string): Color =>
  Option.match(Option.fromNullishOr(new OffscreenCanvas(ONE_PIXEL, ONE_PIXEL).getContext("2d")), {
    onNone: () => FALLBACK,
    onSome: (context) => {
      context.fillStyle = css;
      context.fillRect(ORIGIN, ORIGIN, ONE_PIXEL, ONE_PIXEL);
      const [red = ORIGIN, green = ORIGIN, blue = ORIGIN, alpha = CHANNEL] = context.getImageData(
        ORIGIN,
        ORIGIN,
        ONE_PIXEL,
        ONE_PIXEL,
      ).data;
      const opacity = alpha / CHANNEL;
      return [
        (red / CHANNEL) * opacity,
        (green / CHANNEL) * opacity,
        (blue / CHANNEL) * opacity,
        opacity,
      ];
    },
  });

const blankGroup = (gpu: Gpu, pipelines: Pipelines): GPUBindGroup =>
  drawGroup({
    device: gpu.device,
    pipelines,
    texture: gpu.device.createTexture({
      size: [ONE_PIXEL, ONE_PIXEL],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING,
    }),
  });

const partsOf = (gpu: Gpu, target: Readonly<Target & { accent: string }>): Parts => {
  const pipelines = createPipelines(gpu);
  return {
    gpu,
    pipelines,
    textures: createTextures({ device: gpu.device, pipelines, onReady: target.onReady }),
    blank: blankGroup(gpu, pipelines),
    cells: cellsBuffer({ device: gpu.device, cells: target.cells }),
    accent: parseColor(target.accent),
  };
};

const overviewImage = (sprites: Sprites): Option.Option<HTMLImageElement> =>
  sprites.block({ sheet: OVERVIEW, column: ORIGIN, row: ORIGIN, request: true });

const bindMask = (parts: Parts, sprites: Sprites): Effect.Effect<Bound> =>
  Effect.gen(function* bind() {
    const mask = yield* parts.textures.upload(sprites.mask);
    yield* pipe(
      overviewImage(sprites),
      Option.toArray,
      Array.map(parts.textures.ensure),
      Effect.all,
    );
    return {
      ...parts,
      frameGroup: frameGroup({
        device: parts.gpu.device,
        pipelines: parts.pipelines,
        mask,
        cells: parts.cells,
      }),
    };
  });

const rendererOf = (parts: Parts): Renderer => {
  let bound = Option.none<Bound>();
  let number = ORIGIN;
  return {
    draw: (frame) => {
      number += ONE_PIXEL;
      if (Option.isSome(bound)) {
        drawGpuFrame({ bound: bound.value, frame: { ...frame, number } });
      }
    },
    animating: (now) => (scene) => isIntro({ scene, now }),
    prepare: (sprites) =>
      Effect.map(bindMask(parts, sprites), (ready) => {
        bound = Option.some(ready);
      }),
  };
};

const createGpuRenderer = (
  target: Readonly<Target & { accent: string }>,
): Effect.Effect<Option.Option<Renderer>> =>
  Effect.map(
    acquireGpu(target.canvas),
    Option.map((gpu) => rendererOf(partsOf(gpu, target))),
  );

export { createGpuRenderer };

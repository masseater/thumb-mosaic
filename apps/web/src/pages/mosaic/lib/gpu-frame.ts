import { Array, Option, pipe } from "effect";

import { CELL_HEIGHT, CELL_WIDTH } from "./camera";
import type { Gpu } from "./gpu-device";
import { MAX_DRAWS, SLOT_BYTES } from "./gpu-pipelines";
import type { Pipelines } from "./gpu-pipelines";
import { INTRO_MS } from "./gpu-shader";
import type { Textures, Uploaded } from "./gpu-textures";
import { overview, planImages, planOutlines } from "./plan";
import type { Item, Outline, Source, Span } from "./plan";
import type { Scene } from "./scene";

const FLOATS_PER_SLOT = SLOT_BYTES / Float32Array.BYTES_PER_ELEMENT;
const RADIUS_OF_DIAGONAL = 0.75;
const OPAQUE = 1;
const NONE = 0;
const SINGLE = 1;
const QUAD_VERTICES = 6;
const HOVER_LIGHT = 0.95;

type Color = readonly [number, number, number, number];

interface Draw {
  readonly pipeline: GPURenderPipeline;
  readonly group: GPUBindGroup;
  readonly span: Span;
  readonly color: Color;
  readonly width: number;
  readonly instances: number;
}

interface GpuFrame extends Source {
  readonly now: number;
  readonly number: number;
}

interface Bound {
  readonly gpu: Gpu;
  readonly pipelines: Pipelines;
  readonly textures: Textures;
  readonly frameGroup: GPUBindGroup;
  readonly blank: GPUBindGroup;
  readonly accent: Color;
}

const CLEAR: Color = [NONE, NONE, NONE, NONE];
const HOVER_COLOR: Color = [HOVER_LIGHT, HOVER_LIGHT, HOVER_LIGHT, HOVER_LIGHT];

const writeFrame = ({ gpu, pipelines }: Bound, { scene, now }: GpuFrame): void => {
  const { camera, viewport, grid } = scene;
  const radius = Math.hypot(viewport.width, viewport.height) * RADIUS_OF_DIAGONAL;
  const data = Float32Array.of(
    camera.scale,
    camera.left,
    camera.top,
    scene.ratio,
    viewport.width,
    viewport.height,
    now - scene.reveal,
    radius,
    grid.cols,
    grid.rows,
    CELL_WIDTH,
    CELL_HEIGHT,
  );
  gpu.device.queue.writeBuffer(pipelines.frameBuffer, NONE, data);
};

const textured =
  (bound: Bound, frame: GpuFrame) =>
  (item: Item): Option.Option<Readonly<{ item: Item; uploaded: Uploaded }>> =>
    Option.map(bound.textures.get(item.image, frame.number), (uploaded) => ({ item, uploaded }));

const imageDraws = (bound: Bound, frame: GpuFrame): readonly Draw[] =>
  pipe(
    planImages(frame),
    Array.map(textured(bound, frame)),
    Array.getSomes,
    Array.map(({ item, uploaded }): Draw => ({
      pipeline: bound.pipelines.quad,
      group: uploaded.group,
      span: item.span,
      color: CLEAR,
      width: NONE,
      instances: SINGLE,
    })),
  );

const introDraws = (bound: Bound, frame: GpuFrame): readonly Draw[] =>
  pipe(
    overview(frame),
    Option.flatMap(textured(bound, frame)),
    Option.map(({ item, uploaded }): Draw => ({
      pipeline: bound.pipelines.intro,
      group: uploaded.group,
      span: item.span,
      color: CLEAR,
      width: NONE,
      instances: frame.scene.cells.length,
    })),
    Option.toArray,
  );

const outlineColor = (bound: Bound, outline: Outline): Color => {
  if (outline.kind === "hover") {
    return HOVER_COLOR;
  }
  return bound.accent;
};

const outlineDraw =
  (bound: Bound) =>
  (outline: Outline): Draw => ({
    pipeline: bound.pipelines.outline,
    group: bound.blank,
    span: outline.span,
    color: outlineColor(bound, outline),
    width: outline.width,
    instances: SINGLE,
  });

const isIntro = ({ scene, now }: Readonly<{ scene: Scene; now: number }>): boolean =>
  now < scene.reveal + INTRO_MS;

const mosaicDraws = (bound: Bound, frame: GpuFrame): readonly Draw[] => {
  if (isIntro(frame)) {
    return introDraws(bound, frame);
  }
  return imageDraws(bound, frame);
};

const drawsOf = (bound: Bound, frame: GpuFrame): readonly Draw[] => {
  const mosaic = mosaicDraws(bound, frame);
  const outlines = pipe(planOutlines(frame.scene), Array.map(outlineDraw(bound)));
  return Array.take([...mosaic, ...outlines], MAX_DRAWS);
};

const writeDraws = ({ gpu, pipelines }: Bound, draws: readonly Draw[]): void => {
  const data = new Float32Array(Math.max(SINGLE, draws.length) * FLOATS_PER_SLOT);
  for (const [index, draw] of draws.entries()) {
    const { col, row, cols, rows } = draw.span;
    data.set(
      [col, row, cols, rows, ...draw.color, NONE, draw.width, OPAQUE, NONE],
      index * FLOATS_PER_SLOT,
    );
  }
  gpu.device.queue.writeBuffer(pipelines.drawBuffer, NONE, data);
};

const encode = (bound: Bound, draws: readonly Draw[]): void => {
  const { device, context } = bound.gpu;
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: [...CLEAR],
      },
    ],
  });
  pass.setBindGroup(NONE, bound.frameGroup);
  for (const [index, draw] of draws.entries()) {
    pass.setPipeline(draw.pipeline);
    pass.setBindGroup(SINGLE, draw.group, [index * SLOT_BYTES]);
    pass.draw(QUAD_VERTICES, draw.instances);
  }
  pass.end();
  device.queue.submit([encoder.finish()]);
};

const drawGpuFrame = ({ bound, frame }: Readonly<{ bound: Bound; frame: GpuFrame }>): void => {
  const draws = drawsOf(bound, frame);
  writeFrame(bound, frame);
  writeDraws(bound, draws);
  encode(bound, draws);
  bound.textures.sweep(frame.number);
};

export type { Bound, Color };
export { drawGpuFrame, isIntro };

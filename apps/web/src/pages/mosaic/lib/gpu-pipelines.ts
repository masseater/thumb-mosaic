import { Number as Num } from "effect";

import type { Gpu } from "./gpu-device";
import { SHADER } from "./gpu-shader";

const SLOT_BYTES = 256;
const MAX_DRAWS = 1024;
const FRAME_BYTES = 64;
const FRAME_BINDING = 0;
const SAMPLER_BINDING = 1;
const CELLS_BINDING = 2;
const DRAW_BINDING = 0;
const SOURCE_BINDING = 1;
const START = 0;
const BLEND: GPUBlendState = {
  color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
};

interface Pipelines {
  readonly quad: GPURenderPipeline;
  readonly intro: GPURenderPipeline;
  readonly outline: GPURenderPipeline;
  readonly frameLayout: GPUBindGroupLayout;
  readonly drawLayout: GPUBindGroupLayout;
  readonly sampler: GPUSampler;
  readonly frameBuffer: GPUBuffer;
  readonly drawBuffer: GPUBuffer;
}

const bothStages = (): number => Num.sumAll([GPUShaderStage.VERTEX, GPUShaderStage.FRAGMENT]);

const frameLayoutOf = (device: GPUDevice): GPUBindGroupLayout =>
  device.createBindGroupLayout({
    entries: [
      { binding: FRAME_BINDING, visibility: bothStages(), buffer: { type: "uniform" } },
      {
        binding: SAMPLER_BINDING,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: "filtering" },
      },
      {
        binding: CELLS_BINDING,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
    ],
  });

const drawLayoutOf = (device: GPUDevice): GPUBindGroupLayout =>
  device.createBindGroupLayout({
    entries: [
      {
        binding: DRAW_BINDING,
        visibility: bothStages(),
        buffer: { type: "uniform", hasDynamicOffset: true },
      },
      {
        binding: SOURCE_BINDING,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "float" },
      },
    ],
  });

const pipelineOf =
  ({ device, format }: Gpu, layout: GPUPipelineLayout) =>
  (entries: Readonly<{ vertex: string; fragment: string }>): GPURenderPipeline => {
    const module = device.createShaderModule({ code: SHADER });
    return device.createRenderPipeline({
      layout,
      vertex: { module, entryPoint: entries.vertex },
      fragment: { module, entryPoint: entries.fragment, targets: [{ format, blend: BLEND }] },
      primitive: { topology: "triangle-list" },
    });
  };

const bufferOf = (device: GPUDevice, size: number): GPUBuffer =>
  device.createBuffer({
    size,
    usage: Num.sumAll([GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]),
  });

const createPipelines = (gpu: Gpu): Pipelines => {
  const { device } = gpu;
  const frameLayout = frameLayoutOf(device);
  const drawLayout = drawLayoutOf(device);
  const pipeline = pipelineOf(
    gpu,
    device.createPipelineLayout({ bindGroupLayouts: [frameLayout, drawLayout] }),
  );
  return {
    quad: pipeline({ vertex: "vs_quad", fragment: "fs_image" }),
    intro: pipeline({ vertex: "vs_intro", fragment: "fs_image" }),
    outline: pipeline({ vertex: "vs_quad", fragment: "fs_outline" }),
    frameLayout,
    drawLayout,
    sampler: device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    }),
    frameBuffer: bufferOf(device, FRAME_BYTES),
    drawBuffer: bufferOf(device, SLOT_BYTES * MAX_DRAWS),
  };
};

const drawGroup = ({
  device,
  pipelines,
  texture,
}: Readonly<{ device: GPUDevice; pipelines: Pipelines; texture: GPUTexture }>): GPUBindGroup =>
  device.createBindGroup({
    layout: pipelines.drawLayout,
    entries: [
      { binding: DRAW_BINDING, resource: { buffer: pipelines.drawBuffer, size: SLOT_BYTES } },
      { binding: SOURCE_BINDING, resource: texture.createView() },
    ],
  });

const cellsBuffer = ({
  device,
  cells,
}: Readonly<{ device: GPUDevice; cells: readonly number[] }>): GPUBuffer => {
  const data = Uint32Array.from(cells);
  const buffer = device.createBuffer({
    size: Math.max(data.byteLength, Uint32Array.BYTES_PER_ELEMENT),
    usage: Num.sumAll([GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST]),
  });
  device.queue.writeBuffer(buffer, START, data);
  return buffer;
};

const frameGroup = ({
  device,
  pipelines,
  cells,
}: Readonly<{
  device: GPUDevice;
  pipelines: Pipelines;
  cells: GPUBuffer;
}>): GPUBindGroup =>
  device.createBindGroup({
    layout: pipelines.frameLayout,
    entries: [
      { binding: FRAME_BINDING, resource: { buffer: pipelines.frameBuffer } },
      { binding: SAMPLER_BINDING, resource: pipelines.sampler },
      { binding: CELLS_BINDING, resource: { buffer: cells } },
    ],
  });

export type { Pipelines };
export { MAX_DRAWS, SLOT_BYTES, cellsBuffer, createPipelines, drawGroup, frameGroup };

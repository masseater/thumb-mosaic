import { Effect, Option } from "effect";

interface Gpu {
  readonly device: GPUDevice;
  readonly context: GPUCanvasContext;
  readonly format: GPUTextureFormat;
}

const requestDevice = (): Effect.Effect<Option.Option<GPUDevice>> =>
  Effect.gen(function* request() {
    if (!("gpu" in navigator)) {
      return Option.none();
    }
    const adapter = yield* Effect.tryPromise(() => navigator.gpu.requestAdapter());
    if (adapter === null) {
      return Option.none();
    }
    return Option.some(yield* Effect.tryPromise(() => adapter.requestDevice()));
  }).pipe(Effect.orElseSucceed(() => Option.none()));

const configure = (canvas: HTMLCanvasElement, device: GPUDevice): Option.Option<Gpu> =>
  Option.map(Option.fromNullishOr(canvas.getContext("webgpu")), (context) => {
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "premultiplied" });
    return { device, context, format };
  });

const acquireGpu = (canvas: HTMLCanvasElement): Effect.Effect<Option.Option<Gpu>> =>
  Effect.map(
    requestDevice(),
    Option.flatMap((device) => configure(canvas, device)),
  ).pipe(Effect.withSpan("mosaic.gpu.acquire"));

export type { Gpu };
export { acquireGpu };

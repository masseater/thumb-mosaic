import { Array, Effect, MutableHashMap, Number as Num, Option, Order, pipe } from "effect";

import { drawGroup } from "./gpu-pipelines";
import type { Pipelines } from "./gpu-pipelines";

const MAX_MIP_LEVELS = 4;
const TEXTURE_LIMIT = 160;
const SMALLEST = 1;
const HALVING = 2;
const FIRST = 0;
const UNUSED = -1;

interface Uploaded {
  readonly texture: GPUTexture;
  readonly group: GPUBindGroup;
}

type Slot =
  | Readonly<{ status: "pending" }>
  | Readonly<{ status: "ready"; uploaded: Uploaded; used: number }>;

interface Slots {
  readonly get: (image: HTMLImageElement) => Option.Option<Slot>;
  readonly set: (image: HTMLImageElement, slot: Slot) => void;
  readonly remove: (image: HTMLImageElement) => void;
  readonly entries: () => readonly (readonly [HTMLImageElement, Slot])[];
  readonly size: () => number;
}

type Usage = readonly [HTMLImageElement, number];

interface Textures {
  readonly get: (image: HTMLImageElement, frame: number) => Option.Option<Uploaded>;
  readonly ensure: (image: HTMLImageElement) => Effect.Effect<void>;
  readonly sweep: (frame: number) => void;
}

interface Context {
  readonly device: GPUDevice;
  readonly pipelines: Pipelines;
  readonly onReady: () => void;
}

interface Level {
  readonly image: HTMLImageElement;
  readonly texture: GPUTexture;
  readonly level: number;
}

const levelSize = (size: number, level: number): number =>
  Math.max(SMALLEST, Math.floor(size / HALVING ** level));

const mipCount = (image: HTMLImageElement): number => {
  const shorter = Math.min(image.naturalWidth, image.naturalHeight);
  return Math.min(MAX_MIP_LEVELS, Math.floor(Math.log2(shorter)) + SMALLEST);
};

const resized = ({ image, level }: Level): Effect.Effect<ImageBitmap> =>
  Effect.promise(() =>
    createImageBitmap(image, {
      resizeWidth: levelSize(image.naturalWidth, level),
      resizeHeight: levelSize(image.naturalHeight, level),
      resizeQuality: "high",
    }),
  );

const copyLevel =
  (device: GPUDevice) =>
  (at: Level): Effect.Effect<void> =>
    Effect.map(resized(at), (bitmap) => {
      device.queue.copyExternalImageToTexture(
        { source: bitmap },
        { texture: at.texture, mipLevel: at.level, premultipliedAlpha: true },
        [bitmap.width, bitmap.height],
      );
      bitmap.close();
    });

const textureFor = (device: GPUDevice, image: HTMLImageElement): GPUTexture =>
  device.createTexture({
    size: [image.naturalWidth, image.naturalHeight],
    format: "rgba8unorm",
    mipLevelCount: mipCount(image),
    usage: Num.sumAll([
      GPUTextureUsage.TEXTURE_BINDING,
      GPUTextureUsage.COPY_DST,
      GPUTextureUsage.RENDER_ATTACHMENT,
    ]),
  });

const uploadImage =
  (device: GPUDevice) =>
  (image: HTMLImageElement): Effect.Effect<GPUTexture> => {
    const texture = textureFor(device, image);
    return pipe(
      Array.range(FIRST, texture.mipLevelCount - SMALLEST),
      Array.map((level) => copyLevel(device)({ image, texture, level })),
      Effect.all,
      Effect.as(texture),
      Effect.withSpan("mosaic.gpu.upload", { attributes: { width: image.naturalWidth } }),
    );
  };

const register =
  (context: Context, slots: Slots) =>
  (image: HTMLImageElement): Effect.Effect<void> =>
    Effect.map(uploadImage(context.device)(image), (texture) => {
      const group = drawGroup({ device: context.device, pipelines: context.pipelines, texture });
      slots.set(image, {
        status: "ready",
        uploaded: { texture, group },
        used: UNUSED,
      });
      context.onReady();
    });

const byUse = Order.mapInput(Order.Number, (usage: Usage) => usage[SMALLEST]);

const evictable = (slots: Slots, frame: number): readonly Usage[] =>
  pipe(
    slots.entries(),
    Array.flatMap(([image, slot]): readonly Usage[] => {
      if (slot.status === "ready" && slot.used < frame) {
        return [[image, slot.used]];
      }
      return [];
    }),
    Array.sortWith((usage: Usage) => usage, byUse),
  );

const destroy = (slots: Slots, image: HTMLImageElement): void => {
  const slot = slots.get(image);
  if (Option.isSome(slot) && slot.value.status === "ready") {
    slot.value.uploaded.texture.destroy();
  }
  slots.remove(image);
};

const evict = (slots: Slots, frame: number): void => {
  const candidates = evictable(slots, frame);
  for (const [image] of Array.take(candidates, slots.size() - TEXTURE_LIMIT)) {
    destroy(slots, image);
  }
};

const lookup =
  (context: Context, slots: Slots) =>
  (image: HTMLImageElement, frame: number): Option.Option<Uploaded> =>
    Option.match(slots.get(image), {
      onNone: () => {
        slots.set(image, { status: "pending" });
        Effect.runFork(register(context, slots)(image));
        return Option.none();
      },
      onSome: (slot) => {
        if (slot.status === "pending") {
          return Option.none();
        }
        slots.set(image, { ...slot, used: frame });
        return Option.some(slot.uploaded);
      },
    });

const createSlots = (): Slots => {
  const map = MutableHashMap.empty<string, readonly [HTMLImageElement, Slot]>();
  return {
    get: (image) => Option.map(MutableHashMap.get(map, image.src), ([, slot]) => slot),
    set: (image, slot) => {
      MutableHashMap.set(map, image.src, [image, slot]);
    },
    remove: (image) => {
      MutableHashMap.remove(map, image.src);
    },
    entries: () => Array.fromIterable(MutableHashMap.values(map)),
    size: () => MutableHashMap.size(map),
  };
};

const createTextures = (context: Context): Textures => {
  const slots = createSlots();
  return {
    get: lookup(context, slots),
    ensure: register(context, slots),
    sweep: (frame) => {
      if (slots.size() > TEXTURE_LIMIT) {
        evict(slots, frame);
      }
    },
  };
};

export type { Textures, Uploaded };
export { createTextures };

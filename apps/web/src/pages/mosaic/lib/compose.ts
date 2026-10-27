import { Array, Effect, Option, pipe } from "effect";

import type { Mosaic } from "#/pages/mosaic/api/queries";

import { variantFile, variantOf } from "./files";
import type { Visit } from "./files";

type Level = Mosaic["levels"][number];
type Sources = readonly (readonly [number, HTMLImageElement])[];

interface BlockSpec {
  readonly visit: Visit;
  readonly level: Level;
  readonly column: number;
  readonly row: number;
  readonly file: string;
}

interface Member {
  readonly left: number;
  readonly top: number;
  readonly variant: number;
}

const PNG = "image/png";
const EMPTY = 0;

const memberOf =
  ({ visit, level, column, row }: BlockSpec) =>
  (cell: number, index: number): Option.Option<Member> => {
    const col = cell % visit.mosaic.cols;
    const line = Math.floor(cell / visit.mosaic.cols);
    const inside =
      Math.floor(col / level.block) === column && Math.floor(line / level.block) === row;
    return Option.some({
      left: (col % level.block) * level.tw,
      top: (line % level.block) * level.th,
      variant: variantOf({ visit, index }),
    }).pipe(Option.filter(() => inside));
  };

const membersOf = (spec: BlockSpec): readonly Member[] =>
  pipe(spec.visit.mosaic.cells, Array.map(memberOf(spec)), Array.getSomes);

const loaded = (url: string): Effect.Effect<HTMLImageElement> =>
  Effect.suspend(() => {
    const image = new Image();
    image.src = url;
    return Effect.ignore(Effect.tryPromise(() => image.decode())).pipe(Effect.as(image));
  });

const sourceOf =
  (spec: BlockSpec) =>
  (variant: number): Effect.Effect<readonly [number, HTMLImageElement]> =>
    loaded(variantFile(spec.visit)(variant, spec.file)).pipe(
      Effect.map((image) => [variant, image] as const),
    );

const sourcesOf = (spec: BlockSpec, members: readonly Member[]): Effect.Effect<Sources> => {
  const variants = Array.dedupe(
    pipe(
      members,
      Array.map((member) => member.variant),
    ),
  );
  return pipe(variants, Effect.forEach(sourceOf(spec), { concurrency: "unbounded" }));
};

const sizeOf = (sources: Sources): Readonly<{ width: number; height: number }> =>
  pipe(
    Array.head(sources),
    Option.match({
      onNone: () => ({ width: EMPTY, height: EMPTY }),
      onSome: ([, image]) => ({ width: image.naturalWidth, height: image.naturalHeight }),
    }),
  );

const paint = ({
  level,
  members,
  sources,
}: Readonly<{ level: Level; members: readonly Member[]; sources: Sources }>): OffscreenCanvas => {
  const { width, height } = sizeOf(sources);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  const images = new Map(sources);
  for (const { left, top, variant } of members) {
    const source = images.get(variant);
    if (context !== null && source instanceof HTMLImageElement) {
      context.drawImage(source, left, top, level.tw, level.th, left, top, level.tw, level.th);
    }
  }
  return canvas;
};

const composeBlock = (spec: BlockSpec): Effect.Effect<string> =>
  Effect.gen(function* compose() {
    const members = membersOf(spec);
    const sources = yield* sourcesOf(spec, members);
    const canvas = paint({ level: spec.level, members, sources });
    const blob = yield* Effect.promise(() => canvas.convertToBlob({ type: PNG }));
    return URL.createObjectURL(blob);
  }).pipe(Effect.withSpan("mosaic.compose", { attributes: { file: spec.file } }));

export { composeBlock };

import { slugPath, versionPath } from "@thumb-mosaic/mosaic";
import { Array, Option, pipe } from "effect";

import type { Mosaic } from "#/pages/mosaic/api/queries";
import { BASE_PATH } from "#/shared/config";

const FIRST = 0;
const BLOCK_FILE = 2;
const MISSING = "";

interface Visit {
  readonly slug: string;
  readonly mosaic: Mosaic;
  readonly seed: number;
  readonly choice: readonly number[];
}

const variantOf = ({ visit, index }: Readonly<{ visit: Visit; index: number }>): number =>
  Option.getOrElse(Array.get(visit.choice, index), () => FIRST);

const variantBase = ({
  slug,
  mosaic,
  variant,
}: Readonly<Pick<Visit, "slug" | "mosaic"> & { variant: number }>): string =>
  pipe(
    Array.get(mosaic.variants, variant),
    Option.match({
      onNone: () => MISSING,
      onSome: ({ version }) => `${BASE_PATH}/${versionPath({ slug, variant, version })}`,
    }),
  );

const variantFile =
  (visit: Pick<Visit, "slug" | "mosaic">) =>
  (variant: number, file: string): string =>
    `${variantBase({ ...visit, variant })}/${file}`;

interface TileCrop {
  readonly url: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const tileCrop = ({
  visit,
  index,
}: Readonly<{ visit: Visit; index: number }>): Option.Option<TileCrop> =>
  Option.gen(function* crop() {
    const { cols, cells, levels } = visit.mosaic;
    const level = yield* Array.last(levels);
    const cell = yield* Array.get(cells, index);
    const column = cell % cols;
    const line = Math.floor(cell / cols);
    const blockColumn = Math.floor(column / level.block);
    const blockRow = Math.floor(line / level.block);
    const block = yield* Array.findFirst(
      level.blocks,
      ([left, top]) => left === blockColumn && top === blockRow,
    );
    return {
      url: variantFile(visit)(variantOf({ visit, index }), block[BLOCK_FILE]),
      left: (column % level.block) * level.tw,
      top: (line % level.block) * level.th,
      width: level.tw,
      height: level.th,
    };
  });

const slugFile = ({ slug, file }: Readonly<{ slug: string; file: string }>): string =>
  `${BASE_PATH}/${slugPath(slug)}/${file}`;

const mosaicTitle = (slug: string): string => `${slug}.mosaic`;

export type { TileCrop, Visit };
export { mosaicTitle, slugFile, tileCrop, variantFile, variantOf };

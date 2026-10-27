import { slugPath, versionPath } from "@thumb-mosaic/mosaic";
import { Array, Option, pipe } from "effect";

import type { Mosaic } from "#/pages/mosaic/api/queries";
import { BASE_PATH } from "#/shared/config";

const FIRST = 0;
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

const tileImage = ({ visit, index }: Readonly<{ visit: Visit; index: number }>): string =>
  variantFile(visit)(variantOf({ visit, index }), `${visit.mosaic.tile.dir}/${index}.jpg`);

const slugFile = ({ slug, file }: Readonly<{ slug: string; file: string }>): string =>
  `${BASE_PATH}/${slugPath(slug)}/${file}`;

export type { Visit };
export { slugFile, tileImage, variantFile, variantOf };

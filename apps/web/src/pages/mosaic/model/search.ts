import { Option } from "effect";

import { seedOf } from "#/shared/lib/seed";

interface MosaicSearch {
  readonly seed?: number;
}

const mosaicSearch = (search: Readonly<Record<string, unknown>>): MosaicSearch =>
  Option.match(seedOf(search), {
    onNone: (): MosaicSearch => ({}),
    onSome: (seed): MosaicSearch => ({ seed }),
  });

export { mosaicSearch };

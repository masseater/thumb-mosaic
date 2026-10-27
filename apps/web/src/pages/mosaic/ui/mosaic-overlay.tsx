import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Mosaic } from "#/pages/mosaic/lib/sprites";
import { useTiles } from "#/pages/mosaic/model/tiles";
import { useSelection } from "#/pages/mosaic/model/viewer";

import { MosaicCredit } from "./mosaic-credit";
import { MosaicToolbar } from "./mosaic-toolbar";
import { TileCard } from "./tile-card";

const MosaicOverlay = ({
  mosaic,
  filesBase,
}: Readonly<{ mosaic: Mosaic; filesBase: string }>): ReactNode => {
  const tiles = useTiles();
  const selected = pipe(
    useSelection(),
    Option.flatMap((index) =>
      pipe(
        Array.get(tiles, index),
        Option.map((tile) => ({ index, tile })),
      ),
    ),
  );
  return (
    <>
      <MosaicToolbar />
      <MosaicCredit credit={mosaic.credit} />
      {Option.isSome(selected) && (
        <TileCard
          tile={selected.value.tile}
          image={`${filesBase}/${mosaic.tile.dir}/${selected.value.index}.jpg`}
          size={mosaic.tile}
        />
      )}
    </>
  );
};

export { MosaicOverlay };

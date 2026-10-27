import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { filesBase } from "#/pages/mosaic/lib/files";
import type { Mosaic } from "#/pages/mosaic/lib/sprites";
import { useTiles } from "#/pages/mosaic/model/tiles";
import { useSelection } from "#/pages/mosaic/model/viewer";

import { MosaicCanvas } from "./mosaic-canvas";
import { MosaicCredit } from "./mosaic-credit";
import { MosaicToolbar } from "./mosaic-toolbar";
import { TileCard } from "./tile-card";

const MosaicView = ({ mosaic, slug }: Readonly<{ mosaic: Mosaic; slug: string }>): ReactNode => {
  const base = filesBase({ slug, version: mosaic.version });
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
      <MosaicCanvas mosaic={mosaic} filesBase={base} />
      <MosaicToolbar slug={slug} />
      <MosaicCredit credit={mosaic.credit} />
      {Option.isSome(selected) && (
        <TileCard
          tile={selected.value.tile}
          image={`${base}/${mosaic.tile.dir}/${selected.value.index}.jpg`}
          size={mosaic.tile}
        />
      )}
    </>
  );
};

export { MosaicView };

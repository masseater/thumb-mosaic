import { Option } from "effect";
import type { ReactNode } from "react";

import type { Mosaic } from "#/pages/mosaic/api/queries";
import { useTile } from "#/pages/mosaic/model/tiles";
import { useArrival, useSelection } from "#/pages/mosaic/model/viewer";

import { MosaicCredit } from "./mosaic-credit";
import { MosaicToolbar } from "./mosaic-toolbar";
import { TileCard } from "./tile-card";

const MosaicOverlay = ({
  mosaic,
  filesBase,
  slug,
}: Readonly<{ mosaic: Mosaic; filesBase: string; slug: string }>): ReactNode => {
  const selection = useSelection();
  const selected = Option.all({ index: selection, tile: useTile(selection) });
  const arrived = useArrival() === "arrived";
  return (
    <>
      {arrived && <MosaicToolbar />}
      {arrived && <MosaicCredit slug={slug} />}
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

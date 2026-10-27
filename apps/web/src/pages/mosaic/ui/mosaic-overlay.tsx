import { Option } from "effect";
import type { ReactNode } from "react";

import { tileImage } from "#/pages/mosaic/lib/files";
import type { Visit } from "#/pages/mosaic/lib/files";
import { useTile } from "#/pages/mosaic/model/tiles";
import { useArrival, useSelection } from "#/pages/mosaic/model/viewer";

import { MosaicCredit } from "./mosaic-credit";
import { MosaicToolbar } from "./mosaic-toolbar";
import { TileCard } from "./tile-card";

const MosaicOverlay = ({ visit }: Readonly<{ visit: Visit }>): ReactNode => {
  const selection = useSelection();
  const selected = Option.all({ index: selection, tile: useTile(selection) });
  const arrived = useArrival() === "arrived";
  return (
    <>
      {arrived && <MosaicToolbar />}
      {arrived && <MosaicCredit slug={visit.slug} seed={visit.seed} />}
      {Option.isSome(selected) && (
        <TileCard
          tile={selected.value.tile}
          image={tileImage({ visit, index: selected.value.index })}
          size={visit.mosaic.tile}
        />
      )}
    </>
  );
};

export { MosaicOverlay };

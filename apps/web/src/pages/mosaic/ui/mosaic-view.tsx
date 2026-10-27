import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { filesBase } from "#/pages/mosaic/lib/files";
import type { Mosaic } from "#/pages/mosaic/lib/sprites";
import { useSelection, useViewerStatus } from "#/pages/mosaic/model/viewer";

import { MosaicCanvas } from "./mosaic-canvas";
import { MosaicCredit } from "./mosaic-credit";
import { MosaicStatus } from "./mosaic-status";
import { MosaicToolbar } from "./mosaic-toolbar";
import { TileCard } from "./tile-card";

const LOADING = "サムネイルを読み込んでいます";

const MosaicView = ({ mosaic, slug }: Readonly<{ mosaic: Mosaic; slug: string }>): ReactNode => {
  const status = useViewerStatus();
  const base = filesBase({ slug, version: mosaic.version });
  const selected = pipe(
    useSelection(),
    Option.flatMap((index) =>
      pipe(
        Array.get(mosaic.tiles, index),
        Option.map((tile) => ({ index, tile })),
      ),
    ),
  );
  return (
    <>
      <MosaicCanvas mosaic={mosaic} filesBase={base} />
      {status !== "ready" && <MosaicStatus message={LOADING} />}
      <MosaicToolbar mosaic={mosaic} slug={slug} />
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

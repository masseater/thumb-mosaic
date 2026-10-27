import type { ReactNode } from "react";

import type { TileList } from "#/pages/mosaic/api/queries";
import type { TileCrop as Crop } from "#/pages/mosaic/lib/files";

import { TileActions } from "./tile-actions";
import { TileCrop } from "./tile-crop";
import { TileText } from "./tile-text";

const TileCard = ({
  tile,
  crop,
}: Readonly<{
  tile: TileList[number];
  crop: Crop;
}>): ReactNode => {
  const [, name, artist, url, service] = tile;
  return (
    <aside className="bg-background/90 absolute right-4 bottom-4 left-4 flex flex-col gap-3 rounded-lg border p-4 shadow-lg backdrop-blur sm:left-auto sm:w-80">
      <TileCrop crop={crop} />
      <TileText name={name} artist={artist} />
      <TileActions url={url} service={service} />
    </aside>
  );
};

export { TileCard };

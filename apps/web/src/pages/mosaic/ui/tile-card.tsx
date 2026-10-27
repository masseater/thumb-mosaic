import type { ReactNode } from "react";

import type { TileList, Mosaic } from "#/pages/mosaic/api/queries";

import { TileActions } from "./tile-actions";
import { TileText } from "./tile-text";

const TileCard = ({
  tile,
  image,
  size,
}: Readonly<{
  tile: TileList[number];
  image: string;
  size: Mosaic["tile"];
}>): ReactNode => {
  const [, name, artist, url, service] = tile;
  return (
    <aside className="bg-background/90 absolute right-4 bottom-4 left-4 flex flex-col gap-3 rounded-lg border p-4 shadow-lg backdrop-blur sm:left-auto sm:w-80">
      <img
        src={image}
        alt=""
        width={size.width}
        height={size.height}
        className="aspect-video w-full rounded-md object-cover"
      />
      <TileText name={name} artist={artist} />
      <TileActions url={url} service={service} />
    </aside>
  );
};

export { TileCard };

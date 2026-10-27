import type { Tile } from "@thumb-mosaic/mosaic";
import { Array, Order, pipe } from "effect";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { CreditItem } from "./credit-item";

type Entry = typeof Tile.Type;

const collator = new Intl.Collator("ja-JP");

const SAME = 0;

const japanese = Order.make<string>((left, right) =>
  Order.Number(collator.compare(left, right), SAME),
);

const ARTIST = 2;
const NAME = 1;

const byArtistThenName = Order.combine(
  Order.mapInput(japanese, (entry: Entry) => entry[ARTIST]),
  Order.mapInput(japanese, (entry: Entry) => entry[NAME]),
);

const CreditsList = ({ tiles }: Readonly<{ tiles: readonly Entry[] }>): ReactNode => {
  const sorted = useMemo(() => Array.sort(tiles, byArtistThenName), [tiles]);
  return (
    <ol className="flex flex-col divide-y">
      {pipe(
        sorted,
        Array.map(([cell, name, artist, url, service]) => (
          <CreditItem key={cell} name={name} artist={artist} url={url} service={service} />
        )),
      )}
    </ol>
  );
};

export { CreditsList };

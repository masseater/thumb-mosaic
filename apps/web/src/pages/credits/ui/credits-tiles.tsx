import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { tilesQuery } from "#/entities/mosaic";
import type { Mosaic } from "#/entities/mosaic";

import { CreditsContent } from "./credits-content";
import { CreditsMessage } from "./credits-message";

const CreditsTiles = ({ mosaic, slug }: Readonly<{ mosaic: Mosaic; slug: string }>): ReactNode => {
  const query = useQuery(tilesQuery({ slug, version: mosaic.version, tiles: mosaic.tiles }));
  if (query.status === "success") {
    return <CreditsContent mosaic={mosaic} tiles={query.data} slug={slug} />;
  }
  return <CreditsMessage status={query.status} />;
};

export { CreditsTiles };

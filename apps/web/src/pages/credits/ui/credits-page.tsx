import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { mosaicQuery } from "#/entities/mosaic";

import { CreditsMessage } from "./credits-message";
import { CreditsTiles } from "./credits-tiles";

const route = getRouteApi("/$slug_/credits");

const CreditsPage = (): ReactNode => {
  const { slug } = route.useParams();
  const query = useQuery(mosaicQuery(slug));
  if (query.status === "success") {
    return <CreditsTiles mosaic={query.data} slug={slug} />;
  }
  return <CreditsMessage status={query.status} />;
};

export { CreditsPage };

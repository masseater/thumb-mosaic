import { getRouteApi } from "@tanstack/react-router";
import { Option } from "effect";
import type { ReactNode } from "react";

import { MosaicCredit } from "./mosaic-credit";
import { MosaicLoading } from "./mosaic-loading";

const route = getRouteApi("/$slug");

const MosaicPending = (): ReactNode => {
  const { slug } = route.useParams();
  const { seed } = route.useSearch();
  return (
    <main className="bg-background fixed inset-0 overflow-hidden">
      <MosaicLoading />
      <MosaicCredit slug={slug} seed={Option.fromUndefinedOr(seed)} />
    </main>
  );
};

export { MosaicPending };

import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Option } from "effect";
import type { ReactNode } from "react";

import { mosaicQuery } from "#/pages/mosaic/api/queries";

import { MosaicCredit } from "./mosaic-credit";
import { MosaicLoading } from "./mosaic-loading";
import { MosaicStatus } from "./mosaic-status";
import { MosaicView } from "./mosaic-view";
import { SeedUrl } from "./seed-url";

const FAILED = "モザイクを読み込めませんでした";

const route = getRouteApi("/$slug");

const MosaicPage = (): ReactNode => {
  const { slug } = route.useParams();
  const { seed, choice } = route.useLoaderData();
  const query = useQuery(mosaicQuery(slug));
  return (
    <main className="bg-background fixed inset-0 overflow-hidden">
      <SeedUrl seed={seed} />
      {query.status === "pending" && <MosaicLoading />}
      {query.status === "error" && <MosaicStatus message={FAILED} />}
      {query.status === "success" && (
        <MosaicView slug={slug} seed={seed} choice={choice} mosaic={query.data} />
      )}
      <MosaicCredit slug={slug} seed={Option.some(seed)} />
    </main>
  );
};

export { MosaicPage };

import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { mosaicQuery } from "#/entities/mosaic";

import { MosaicStatus } from "./mosaic-status";
import { MosaicView } from "./mosaic-view";

const LOADING = "サムネイルを読み込んでいます";
const FAILED = "モザイクを読み込めませんでした";

const route = getRouteApi("/$slug");

const MosaicPage = (): ReactNode => {
  const { slug } = route.useParams();
  const query = useQuery(mosaicQuery(slug));
  return (
    <main className="bg-background fixed inset-0 overflow-hidden">
      {query.status === "pending" && <MosaicStatus message={LOADING} />}
      {query.status === "error" && <MosaicStatus message={FAILED} />}
      {query.status === "success" && <MosaicView mosaic={query.data} slug={slug} />}
    </main>
  );
};

export { MosaicPage };

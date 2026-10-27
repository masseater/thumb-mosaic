import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { mosaicQuery } from "#/entities/mosaic";

import { CreditsHeader } from "./credits-header";
import { CreditsList } from "./credits-list";
import { CreditsSources } from "./credits-sources";

const LOADING = "一覧を読み込んでいます";
const FAILED = "一覧を読み込めませんでした";

const route = getRouteApi("/$slug_/credits");

const CreditsPage = (): ReactNode => {
  const { slug } = route.useParams();
  const query = useQuery(mosaicQuery(slug));
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:p-8">
      {query.status === "pending" && <p className="text-muted-foreground text-sm">{LOADING}</p>}
      {query.status === "error" && <p className="text-muted-foreground text-sm">{FAILED}</p>}
      {query.status === "success" && <CreditsHeader mosaic={query.data} slug={slug} />}
      {query.status === "success" && <CreditsSources />}
      {query.status === "success" && <CreditsList tiles={query.data.tiles} />}
    </main>
  );
};

export { CreditsPage };

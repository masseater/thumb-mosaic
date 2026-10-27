import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { mosaicQuery } from "#/entities/mosaic";

import { CreditsContent } from "./credits-content";

const MESSAGES = {
  pending: "一覧を読み込んでいます",
  error: "一覧を読み込めませんでした",
} as const;

const route = getRouteApi("/$slug_/credits");

const CreditsPage = (): ReactNode => {
  const { slug } = route.useParams();
  const query = useQuery(mosaicQuery(slug));
  if (query.status === "success") {
    return <CreditsContent mosaic={query.data} slug={slug} />;
  }
  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-8">
      <p className="text-muted-foreground text-sm">{MESSAGES[query.status]}</p>
    </main>
  );
};

export { CreditsPage };

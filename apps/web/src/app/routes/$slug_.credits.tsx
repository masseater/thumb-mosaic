import { createFileRoute } from "@tanstack/react-router";

import { CreditsPage, bundledTiles, creditsSearch } from "#/pages/credits";

const Route = createFileRoute("/$slug_/credits")({
  validateSearch: creditsSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) => bundledTiles({ data: { slug: params.slug, seed: deps.seed } }),
  component: CreditsPage,
});

export { Route };

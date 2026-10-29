import { createFileRoute } from "@tanstack/react-router";

import { CreditsPage, creditedTiles, creditsSearch } from "#/pages/credits";

const Route = createFileRoute("/$slug_/credits")({
  ssr: false,
  validateSearch: creditsSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) => creditedTiles({ slug: params.slug, seed: deps.seed }),
  component: CreditsPage,
});

export { Route };

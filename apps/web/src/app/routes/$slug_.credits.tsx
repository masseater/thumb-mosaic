import { createFileRoute } from "@tanstack/react-router";

import { CreditsPage, bundledTiles } from "#/pages/credits";

const Route = createFileRoute("/$slug_/credits")({
  loader: ({ params }) => bundledTiles({ data: params.slug }),
  component: CreditsPage,
});

export { Route };

import { createFileRoute } from "@tanstack/react-router";

import { CreditsPage } from "#/pages/credits";

const Route = createFileRoute("/$slug_/credits")({
  component: CreditsPage,
});

export { Route };

import { createFileRoute } from "@tanstack/react-router";

import { MosaicPage } from "#/pages/mosaic";

const Route = createFileRoute("/$slug")({
  component: MosaicPage,
});

export { Route };

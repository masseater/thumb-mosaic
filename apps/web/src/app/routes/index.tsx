import { createFileRoute } from "@tanstack/react-router";

import { GalleryPage } from "#/pages/gallery";

const Route = createFileRoute("/")({
  component: GalleryPage,
});

export { Route };

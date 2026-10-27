import { createFileRoute } from "@tanstack/react-router";

import { MosaicPage, loadMosaic, mosaicHead } from "#/pages/mosaic";

const Route = createFileRoute("/$slug")({
  loader: ({ context, params }) =>
    loadMosaic({ queryClient: context.queryClient, slug: params.slug }),
  head: ({ loaderData }) => mosaicHead(loaderData),
  component: MosaicPage,
});

export { Route };

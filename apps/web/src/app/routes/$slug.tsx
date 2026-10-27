import { createFileRoute } from "@tanstack/react-router";

import { MosaicPage, loadMosaic, mosaicHead, mosaicSearch } from "#/pages/mosaic";
import { seedOf } from "#/shared/lib/seed";

const Route = createFileRoute("/$slug")({
  validateSearch: mosaicSearch,
  shouldReload: false,
  loader: ({ context, params, location }) =>
    loadMosaic({
      queryClient: context.queryClient,
      slug: params.slug,
      seed: seedOf(location.search),
    }),
  head: ({ loaderData }) => mosaicHead(loaderData),
  component: MosaicPage,
});

export { Route };

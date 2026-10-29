import { createFileRoute } from "@tanstack/react-router";

import {
  MosaicLoading,
  MosaicPage,
  bundledPreview,
  loadMosaic,
  mosaicHead,
  mosaicSearch,
} from "#/pages/mosaic";
import { seedOf } from "#/shared/lib/seed";

const Route = createFileRoute("/$slug")({
  validateSearch: mosaicSearch,
  ssr: false,
  shouldReload: false,
  loader: ({ context, params, location }) =>
    loadMosaic({
      queryClient: context.queryClient,
      slug: params.slug,
      seed: seedOf(location.search),
    }),
  head: ({ params, loaderData }) => mosaicHead(loaderData ?? bundledPreview(params.slug)),
  pendingComponent: MosaicLoading,
  component: MosaicPage,
});

export { Route };

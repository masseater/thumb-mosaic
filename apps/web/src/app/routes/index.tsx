import { createFileRoute } from "@tanstack/react-router";
import { CHARACTERS } from "@thumb-mosaic/mosaic";
import { Array, Option, pipe } from "effect";

import { GalleryPage, galleryHead } from "#/pages/gallery";
import { bundledPreview } from "#/pages/mosaic";

const Route = createFileRoute("/")({
  head: () =>
    galleryHead(
      pipe(
        Array.head(CHARACTERS),
        Option.flatMap(({ slug }) => bundledPreview(slug).card),
      ),
    ),
  component: GalleryPage,
});

export { Route };

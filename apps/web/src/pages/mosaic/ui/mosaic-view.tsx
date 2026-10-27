import type { ReactNode } from "react";

import type { Mosaic } from "#/pages/mosaic/api/queries";
import { filesBase } from "#/pages/mosaic/lib/files";
import { useViewerStatus } from "#/pages/mosaic/model/viewer";

import { MosaicCanvas } from "./mosaic-canvas";
import { MosaicLoading } from "./mosaic-loading";
import { MosaicOverlay } from "./mosaic-overlay";

const MosaicView = ({ mosaic, slug }: Readonly<{ mosaic: Mosaic; slug: string }>): ReactNode => {
  const base = filesBase({ slug, version: mosaic.version });
  const ready = useViewerStatus() === "ready";
  return (
    <>
      <MosaicCanvas mosaic={mosaic} filesBase={base} />
      {ready && <MosaicOverlay mosaic={mosaic} filesBase={base} slug={slug} />}
      {!ready && <MosaicLoading />}
    </>
  );
};

export { MosaicView };

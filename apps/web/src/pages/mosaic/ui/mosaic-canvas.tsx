import type { ReactNode } from "react";
import { useCallback } from "react";

import type { Visit } from "#/pages/mosaic/lib/files";
import { mountViewer } from "#/pages/mosaic/lib/viewer";
import { useViewerStore } from "#/pages/mosaic/model/viewer";

const LABEL =
  "モザイクアート。ドラッグで移動、ホイールかピンチで拡大、サムネイルを押すと動画の情報が出ます";

const MosaicCanvas = ({ visit }: Readonly<{ visit: Visit }>): ReactNode => {
  const store = useViewerStore();
  const attach = useCallback(
    (canvas: HTMLCanvasElement): (() => void) => mountViewer({ canvas, visit, store }),
    [visit, store],
  );
  return (
    <canvas
      ref={attach}
      aria-label={LABEL}
      className="absolute inset-0 size-full cursor-grab touch-none active:cursor-grabbing"
    />
  );
};

export { MosaicCanvas };

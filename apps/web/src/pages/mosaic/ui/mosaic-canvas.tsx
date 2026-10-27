import type { ReactNode } from "react";
import { useCallback } from "react";

import type { Mosaic } from "#/pages/mosaic/lib/sprites";
import { mountViewer } from "#/pages/mosaic/lib/viewer";
import { useViewerStore } from "#/pages/mosaic/model/viewer";

const LABEL =
  "モザイクアート。ドラッグで移動、ホイールかピンチで拡大、サムネイルを押すと動画の情報が出ます";

const MosaicCanvas = ({
  mosaic,
  filesBase,
}: Readonly<{ mosaic: Mosaic; filesBase: string }>): ReactNode => {
  const store = useViewerStore();
  const attach = useCallback(
    (canvas: HTMLCanvasElement): (() => void) => mountViewer({ canvas, mosaic, filesBase, store }),
    [mosaic, filesBase, store],
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

import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { HEIGHT, LoadingCell, WIDTH } from "./loading-cell";

const LABEL = "読み込み中";
const SIDE = 3;
const GAP = 3;
const STEP_SECONDS = 0.12;
const VIEW_BOX = `0 0 ${SIDE * (WIDTH + GAP) - GAP} ${SIDE * (HEIGHT + GAP) - GAP}`;

const cells = Array.makeBy(SIDE * SIDE, (index) => ({
  index,
  left: (index % SIDE) * (WIDTH + GAP),
  top: Math.floor(index / SIDE) * (HEIGHT + GAP),
  delay: `${((index % SIDE) + Math.floor(index / SIDE)) * STEP_SECONDS}s`,
}));

const MosaicLoading = (): ReactNode => (
  <output aria-label={LABEL} className="absolute inset-0 grid place-items-center">
    <svg viewBox={VIEW_BOX} className="text-primary w-20" aria-hidden="true">
      {pipe(
        cells,
        Array.map((cell) => (
          <LoadingCell key={cell.index} left={cell.left} top={cell.top} delay={cell.delay} />
        )),
      )}
    </svg>
  </output>
);

export { MosaicLoading };

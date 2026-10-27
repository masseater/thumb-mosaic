import type { ReactNode } from "react";

const WIDTH = 16;
const HEIGHT = 9;
const RADIUS = 1;
const DIM = 0.15;
const PULSE = "0.15;1;0.15";
const DURATION = "1.2s";

const LoadingCell = ({
  left,
  top,
  delay,
}: Readonly<{ left: number; top: number; delay: string }>): ReactNode => (
  <rect
    x={left}
    y={top}
    width={WIDTH}
    height={HEIGHT}
    rx={RADIUS}
    fill="currentColor"
    opacity={DIM}
  >
    <animate
      attributeName="opacity"
      values={PULSE}
      dur={DURATION}
      begin={delay}
      repeatCount="indefinite"
    />
  </rect>
);

export { HEIGHT, LoadingCell, WIDTH };

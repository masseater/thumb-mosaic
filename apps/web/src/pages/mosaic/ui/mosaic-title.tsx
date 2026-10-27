import type { ReactNode } from "react";

const LOCALE = "ja-JP";

const MosaicTitle = ({
  character,
  count,
}: Readonly<{ character: string; count: number }>): ReactNode => (
  <div className="bg-background/90 flex flex-col rounded-lg border px-4 py-2 backdrop-blur">
    <h1 className="text-lg font-bold">{`${character}のモザイクアート`}</h1>
    <p className="text-muted-foreground text-xs">
      {`${count.toLocaleString(LOCALE)} 本の動画のサムネイルを 1 枚ずつ使っています`}
    </p>
  </div>
);

export { MosaicTitle };

import type { ReactNode } from "react";

const TileText = ({ name, artist }: Readonly<{ name: string; artist: string }>): ReactNode => (
  <div className="flex flex-col gap-1">
    <h2 className="text-base leading-snug font-bold">{name}</h2>
    <p className="text-muted-foreground text-sm">{artist}</p>
  </div>
);

export { TileText };

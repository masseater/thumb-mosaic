import type { ReactNode } from "react";

const THUMBNAILS = "サムネイルは各動画の投稿者のものです";

const MosaicCredit = ({ credit }: Readonly<{ credit: string }>): ReactNode => (
  <footer className="bg-background/80 text-muted-foreground absolute bottom-4 left-4 hidden rounded-md px-3 py-1 text-xs backdrop-blur sm:block">
    {`${credit}・${THUMBNAILS}`}
  </footer>
);

export { MosaicCredit };

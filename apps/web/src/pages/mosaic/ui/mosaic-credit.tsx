import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";

const THUMBNAILS = "サムネイルは各動画の投稿者のものです";
const LIST = "使った動画の一覧";

const MosaicCredit = ({ credit, slug }: Readonly<{ credit: string; slug: string }>): ReactNode => {
  const params = useMemo(() => ({ slug }), [slug]);
  return (
    <footer className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 text-muted-foreground absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-3 text-center text-xs duration-700 ease-out">
      <span>{credit}</span>
      <span>{THUMBNAILS}</span>
      <Link to="/$slug/credits" params={params} className="underline underline-offset-2">
        {LIST}
      </Link>
    </footer>
  );
};

export { MosaicCredit };

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { THUMBNAIL_RIGHTS } from "#/shared/config";

const CREDITS = "クレジット";

const MosaicCredit = ({ slug }: Readonly<{ slug: string }>): ReactNode => {
  const params = useMemo(() => ({ slug }), [slug]);
  return (
    <footer className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 text-muted-foreground absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-3 text-center text-xs duration-700 ease-out">
      <span>{THUMBNAIL_RIGHTS}</span>
      <Link to="/$slug/credits" params={params} className="underline underline-offset-2">
        {CREDITS}
      </Link>
    </footer>
  );
};

export { MosaicCredit };

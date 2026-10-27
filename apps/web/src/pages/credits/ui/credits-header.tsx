import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";

import type { Mosaic } from "#/entities/mosaic";

const LOCALE = "ja-JP";
const BACK = "モザイクアートに戻る";
const THUMBNAILS = "サムネイルの権利は各動画の投稿者にあります";

const CreditsHeader = ({ mosaic, slug }: Readonly<{ mosaic: Mosaic; slug: string }>): ReactNode => {
  const params = useMemo(() => ({ slug }), [slug]);
  return (
    <header className="flex flex-col gap-2">
      <Link to="/$slug" params={params} className="text-muted-foreground text-sm underline">
        {BACK}
      </Link>
      <h1 className="text-2xl font-bold">{`使った動画 ${mosaic.cells.length.toLocaleString(LOCALE)} 本`}</h1>
      <p className="text-muted-foreground text-sm">{THUMBNAILS}</p>
      <p className="text-muted-foreground text-sm">{mosaic.credit}</p>
    </header>
  );
};

export { CreditsHeader };

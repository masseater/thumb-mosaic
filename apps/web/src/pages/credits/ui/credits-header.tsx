import { Link } from "@tanstack/react-router";
import type { PublishedMosaic } from "@thumb-mosaic/mosaic";
import type { ReactNode } from "react";
import { useMemo } from "react";

const LOCALE = "ja-JP";
const BACK = "モザイクアートに戻る";
const THUMBNAILS = "サムネイルの権利は各動画の投稿者にあります。";

const CreditsHeader = ({
  mosaic,
  slug,
}: Readonly<{ mosaic: typeof PublishedMosaic.Type; slug: string }>): ReactNode => {
  const params = useMemo(() => ({ slug }), [slug]);
  return (
    <header className="flex flex-col gap-2">
      <Link to="/$slug" params={params} className="text-muted-foreground text-sm underline">
        {BACK}
      </Link>
      <h1 className="text-2xl font-bold">{`${mosaic.character}のモザイクアートに使った動画`}</h1>
      <p className="text-muted-foreground text-sm">
        {`${mosaic.tiles.length.toLocaleString(LOCALE)} 本の動画のサムネイルを使っています。${THUMBNAILS}`}
      </p>
      <p className="text-muted-foreground text-sm">{mosaic.credit}</p>
    </header>
  );
};

export { CreditsHeader };

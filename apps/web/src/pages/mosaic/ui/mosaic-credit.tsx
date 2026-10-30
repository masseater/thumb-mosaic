import { Option } from "effect";
import type { ReactNode } from "react";

import { SOURCE_URL, THUMBNAIL_RIGHTS } from "#/shared/config";

import { CREDITS, CreditsLink } from "./credits-link";

const SOURCE = "ソースコード";

const MosaicCredit = ({
  slug,
  seed,
}: Readonly<{ slug: string; seed: Option.Option<number> }>): ReactNode => (
  <footer className="text-muted-foreground pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-3 text-center text-xs">
    <span className="pointer-events-auto">{THUMBNAIL_RIGHTS}</span>
    {Option.isSome(seed) && <CreditsLink slug={slug} seed={seed.value} />}
    {Option.isNone(seed) && <span className="pointer-events-auto">{CREDITS}</span>}
    <a
      href={SOURCE_URL}
      target="_blank"
      rel="noreferrer"
      className="pointer-events-auto underline underline-offset-2"
    >
      {SOURCE}
    </a>
  </footer>
);

export { MosaicCredit };

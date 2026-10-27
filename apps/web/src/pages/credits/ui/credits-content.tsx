import type { ReactNode } from "react";

import type { Mosaic, TileList } from "#/entities/mosaic";

import { CreditsHeader } from "./credits-header";
import { CreditsList } from "./credits-list";
import { CreditsSources } from "./credits-sources";

const CreditsContent = ({
  mosaic,
  tiles,
  slug,
}: Readonly<{ mosaic: Mosaic; tiles: TileList; slug: string }>): ReactNode => (
  <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:p-8">
    <CreditsHeader mosaic={mosaic} slug={slug} />
    <CreditsSources />
    <CreditsList tiles={tiles} />
  </main>
);

export { CreditsContent };

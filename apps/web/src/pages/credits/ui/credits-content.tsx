import type { PublishedMosaic } from "@thumb-mosaic/mosaic";
import type { ReactNode } from "react";

import { CreditsHeader } from "./credits-header";
import { CreditsList } from "./credits-list";
import { CreditsSources } from "./credits-sources";

const CreditsContent = ({
  mosaic,
  slug,
}: Readonly<{ mosaic: typeof PublishedMosaic.Type; slug: string }>): ReactNode => (
  <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:p-8">
    <CreditsHeader mosaic={mosaic} slug={slug} />
    <CreditsSources />
    <CreditsList tiles={mosaic.tiles} />
  </main>
);

export { CreditsContent };

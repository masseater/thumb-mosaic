import type { ReactNode } from "react";

import { MosaicCredit } from "./mosaic-credit";
import { MosaicSwitcher } from "./mosaic-switcher";
import { MosaicToolbar } from "./mosaic-toolbar";

const MosaicChrome = ({ slug, seed }: Readonly<{ slug: string; seed: number }>): ReactNode => (
  <>
    <MosaicToolbar slug={slug} seed={seed} />
    <MosaicCredit slug={slug} seed={seed} />
    <MosaicSwitcher />
  </>
);

export { MosaicChrome };

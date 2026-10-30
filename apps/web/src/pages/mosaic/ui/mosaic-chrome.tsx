import type { ReactNode } from "react";

import { MosaicSwitcher } from "./mosaic-switcher";
import { MosaicToolbar } from "./mosaic-toolbar";

const MosaicChrome = ({ slug, seed }: Readonly<{ slug: string; seed: number }>): ReactNode => (
  <>
    <MosaicToolbar slug={slug} seed={seed} />
    <MosaicSwitcher />
  </>
);

export { MosaicChrome };

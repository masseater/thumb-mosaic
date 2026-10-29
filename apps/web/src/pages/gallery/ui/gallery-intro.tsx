import type { ReactNode } from "react";

import { GALLERY_TITLE } from "#/pages/gallery/model/title";

const GalleryIntro = (): ReactNode => (
  <header className="flex flex-col gap-2">
    <h1 className="text-2xl font-bold">{GALLERY_TITLE}</h1>
  </header>
);

export { GalleryIntro };

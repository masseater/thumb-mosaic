import type { ReactNode } from "react";

const TITLE = "サムネイルのモザイクアート";

const GalleryIntro = (): ReactNode => (
  <header className="flex flex-col gap-2">
    <h1 className="text-2xl font-bold">{TITLE}</h1>
  </header>
);

export { GalleryIntro };

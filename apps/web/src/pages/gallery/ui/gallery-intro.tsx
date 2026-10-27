import type { ReactNode } from "react";

const TITLE = "サムネイルのモザイクアート";
const LEAD =
  "キャラクターを使った動画のサムネイルを 1 枚ずつ並べて、そのキャラクターの絵を描いています。";

const GalleryIntro = (): ReactNode => (
  <header className="flex flex-col gap-2">
    <h1 className="text-2xl font-bold">{TITLE}</h1>
    <p className="text-muted-foreground text-sm">{LEAD}</p>
  </header>
);

export { GalleryIntro };

import type { ReactNode } from "react";

import { SourceRow } from "./source-row";
import { VocaDbRow } from "./vocadb-row";

const HEADING = "データの出どころ";
const YOUTUBE = "YouTube のサムネイル";
const YOUTUBE_HOST = "i.ytimg.com";
const NICONICO = "ニコニコのサムネイル";
const NICONICO_HOSTS = "動画ページの画像、nicovideo.cdn.nimg.jp";

const CreditsSources = (): ReactNode => (
  <section className="flex flex-col gap-2 text-sm">
    <h2 className="font-bold">{HEADING}</h2>
    <dl className="text-muted-foreground flex flex-col gap-1">
      <VocaDbRow />
      <SourceRow term={YOUTUBE}>{YOUTUBE_HOST}</SourceRow>
      <SourceRow term={NICONICO}>{NICONICO_HOSTS}</SourceRow>
    </dl>
  </section>
);

export { CreditsSources };

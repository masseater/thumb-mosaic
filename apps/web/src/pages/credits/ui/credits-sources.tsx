import type { ReactNode } from "react";

const HEADING = "データの出どころ";
const SONGS = "曲名・作者・動画の一覧は ";
const VOCADB_NAME = "VocaDB";
const SONGS_AFTER = " の API から取得しています。";
const YOUTUBE = "YouTube のサムネイルは YouTube の画像サーバー（i.ytimg.com）から取得しています。";
const NICONICO =
  "ニコニコ動画のサムネイルは、動画ページに載っている画像と、ニコニコのサムネイル画像サーバーから取得しています。";
const VOCADB = "https://vocadb.net/";

const CreditsSources = (): ReactNode => (
  <section className="flex flex-col gap-1 text-sm">
    <h2 className="font-bold">{HEADING}</h2>
    <p className="text-muted-foreground">
      {SONGS}
      <a href={VOCADB} target="_blank" rel="noreferrer" className="underline">
        {VOCADB_NAME}
      </a>
      {SONGS_AFTER}
    </p>
    <p className="text-muted-foreground">{YOUTUBE}</p>
    <p className="text-muted-foreground">{NICONICO}</p>
  </section>
);

export { CreditsSources };

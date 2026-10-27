import type { ReactNode } from "react";

import { SourceRow } from "./source-row";

const SONGS = "曲と動画";
const VOCADB_NAME = "VocaDB";
const VOCADB = "https://vocadb.net/";
const API = " API";

const VocaDbRow = (): ReactNode => (
  <SourceRow term={SONGS}>
    <a href={VOCADB} target="_blank" rel="noreferrer" className="underline">
      {VOCADB_NAME}
    </a>
    {API}
  </SourceRow>
);

export { VocaDbRow };

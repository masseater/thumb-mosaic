import { FILES_DIR } from "@thumb-mosaic/mosaic";
import { Array as Arr, Record as Rec, pipe } from "effect";

import { BASE_PATH } from "./base-path.ts";
import { ASSET_CACHE_CONTROL, SECURITY_HEADERS } from "./src/shared/config/security-headers.ts";

type PageHeaders = Readonly<{ path: string; headers: Readonly<Record<string, string>> }>;

const headerLines = (headers: Readonly<Record<string, string>>): readonly string[] =>
  pipe(
    Rec.toEntries(headers),
    Arr.map(([name, value]) => `  ${name}: ${value}`),
  );

const detachLines = (headers: Readonly<Record<string, string>>): readonly string[] =>
  pipe(
    Rec.keys(headers),
    Arr.map((name) => `  ! ${name}`),
  );

const pageRule = ({ path, headers }: PageHeaders): readonly string[] => [
  path,
  ...detachLines(headers),
  ...headerLines(headers),
];

const assetHeaders = ({
  documentHeaders,
  pages,
}: Readonly<{
  documentHeaders: Readonly<Record<string, string>>;
  pages: readonly PageHeaders[];
}>): string =>
  pipe(
    [
      "/*",
      ...headerLines(SECURITY_HEADERS),
      ...headerLines(documentHeaders),
      ...pipe(pages, Arr.flatMap(pageRule)),
      `${BASE_PATH}/assets/*`,
      `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
      `${BASE_PATH}/${FILES_DIR}/:slug/:version/*`,
      `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
      "",
    ],
    Arr.join("\n"),
  );

const ASSET_HEADERS = assetHeaders({ documentHeaders: {}, pages: [] });

export type { PageHeaders };
export { ASSET_HEADERS, assetHeaders };

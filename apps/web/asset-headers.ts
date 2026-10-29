import { FILES_DIR } from "@thumb-mosaic/mosaic";
import { Array as Arr, Record as Rec, pipe } from "effect";

import { BASE_PATH } from "./base-path.ts";
import { ASSET_CACHE_CONTROL, SECURITY_HEADERS } from "./src/shared/config/security-headers.ts";

const headerLines = (headers: Readonly<Record<string, string>>): readonly string[] =>
  pipe(
    Rec.toEntries(headers),
    Arr.map(([name, value]) => `  ${name}: ${value}`),
  );

const assetHeaders = (documentHeaders: Readonly<Record<string, string>>): string =>
  pipe(
    [
      "/*",
      ...headerLines(SECURITY_HEADERS),
      ...headerLines(documentHeaders),
      `${BASE_PATH}/assets/*`,
      `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
      `${BASE_PATH}/${FILES_DIR}/:slug/:version/*`,
      `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
      "",
    ],
    Arr.join("\n"),
  );

const ASSET_HEADERS = assetHeaders({});

export { ASSET_HEADERS, assetHeaders };

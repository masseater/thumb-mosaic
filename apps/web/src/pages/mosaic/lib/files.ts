import { objectKey } from "@thumb-mosaic/mosaic";
import { String, pipe } from "effect";

import { BASE_PATH } from "#/shared/config";

const filesBase = ({ slug, version }: Readonly<{ slug: string; version: string }>): string =>
  pipe(
    `${BASE_PATH}/api/mosaics/${objectKey({ slug, version, file: "" })}`,
    String.replace(/\/$/u, ""),
  );

export { filesBase };

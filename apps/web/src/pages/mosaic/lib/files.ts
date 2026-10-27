import { versionPath } from "@thumb-mosaic/mosaic";

import { BASE_PATH } from "#/shared/config";

const filesBase = ({ slug, version }: Readonly<{ slug: string; version: string }>): string =>
  `${BASE_PATH}/${versionPath({ slug, version })}`;

export { filesBase };

import { versionPath } from "@thumb-mosaic/mosaic";

import type { Mosaic } from "#/pages/mosaic/api/queries";
import { BASE_PATH } from "#/shared/config";

const filesBase = ({ slug, mosaic }: Readonly<{ slug: string; mosaic: Mosaic }>): string =>
  `${BASE_PATH}/${versionPath({ slug, variant: mosaic.variant, version: mosaic.version })}`;

export { filesBase };

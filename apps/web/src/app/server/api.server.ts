import { mosaicRoutes } from "#/pages/mosaic/index.server";
import { createRouter } from "#/shared/api/index.server";

export const api = createRouter("").use(mosaicRoutes);

import { createIsomorphicFn } from "@tanstack/react-start";
import { PublishedMosaic, manifestPath } from "@thumb-mosaic/mosaic";
import type { VariantRef } from "@thumb-mosaic/mosaic";
import { Option, Record, Schema } from "effect";

import type { Mosaic } from "./queries";

const PUBLIC = "../../../../public";

const decode = Schema.decodeUnknownOption(PublishedMosaic);

const bundledMosaic = createIsomorphicFn()
  .server((ref: VariantRef): Option.Option<Mosaic> =>
    Option.flatMap(
      Record.get(
        import.meta.glob<unknown>("../../../../public/files/*/*.json", {
          eager: true,
          import: "default",
        }),
        `${PUBLIC}/${manifestPath(ref)}`,
      ),
      decode,
    ),
  )
  .client((): Option.Option<Mosaic> => Option.none());

export { bundledMosaic };

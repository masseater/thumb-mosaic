import { createIsomorphicFn } from "@tanstack/react-start";
import { PublishedMosaic, manifestPath } from "@thumb-mosaic/mosaic";
import { Option, Record, Schema } from "effect";

type Mosaic = typeof PublishedMosaic.Type;

const PUBLIC = "../../../../public";

const decode = Schema.decodeUnknownOption(PublishedMosaic);

const bundledMosaic = createIsomorphicFn()
  .server((slug: string): Option.Option<Mosaic> =>
    Option.flatMap(
      Record.get(
        import.meta.glob<unknown>("../../../../public/files/*.json", {
          eager: true,
          import: "default",
        }),
        `${PUBLIC}/${manifestPath(slug)}`,
      ),
      decode,
    ),
  )
  .client((): Option.Option<Mosaic> => Option.none());

export { bundledMosaic };

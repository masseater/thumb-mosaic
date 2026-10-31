import { createIsomorphicFn } from "@tanstack/react-start";
import { Candidates, PublishedMosaic, manifestPath, slugPath } from "@thumb-mosaic/mosaic";
import { Option, Record, Schema } from "effect";

import type { CandidateList, Mosaic } from "./queries";

const PUBLIC = "../../../../public";

const decodeMosaic = Schema.decodeUnknownOption(PublishedMosaic);
const decodeCandidates = Schema.decodeUnknownOption(Candidates);

const bundledMosaic = createIsomorphicFn()
  .server((slug: string): Option.Option<Mosaic> =>
    Option.flatMap(
      Record.get(
        import.meta.glob<unknown>("../../../../public/files/*/manifest.json", {
          eager: true,
          import: "default",
        }),
        `${PUBLIC}/${manifestPath(slug)}`,
      ),
      decodeMosaic,
    ),
  )
  .client((): Option.Option<Mosaic> => Option.none());

const bundledCandidates = createIsomorphicFn()
  .server((slug: string, mosaic: Mosaic): Option.Option<CandidateList> =>
    Option.flatMap(
      Record.get(
        import.meta.glob<unknown>("../../../../public/files/*/candidates.json", {
          eager: true,
          import: "default",
        }),
        `${PUBLIC}/${slugPath(slug)}/${mosaic.candidates}`,
      ),
      decodeCandidates,
    ),
  )
  .client((): Option.Option<CandidateList> => Option.none());

export { bundledCandidates, bundledMosaic };

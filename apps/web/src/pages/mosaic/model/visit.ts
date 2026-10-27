import type { QueryClient } from "@tanstack/react-query";
import { assignVariants } from "@thumb-mosaic/mosaic";
import { Effect, Option, Random } from "effect";

import { bundledCandidates, bundledMosaic } from "#/pages/mosaic/api/bundled";
import { candidatesQuery, mosaicQuery } from "#/pages/mosaic/api/queries";
import type { CandidateList, Mosaic, Query } from "#/pages/mosaic/api/queries";

interface Assignment {
  readonly seed: number;
  readonly choice: readonly number[];
}

interface Loaded extends Assignment {
  readonly mosaic: Option.Option<Mosaic>;
}

interface Load {
  readonly queryClient: QueryClient;
  readonly slug: string;
}

interface VisitLoad extends Load {
  readonly seed: Option.Option<number>;
}

const NO_CANDIDATES: CandidateList = [];
const NO_CHOICE: readonly number[] = [];

const fetched = <Value>({
  queryClient,
  query,
}: Readonly<{ queryClient: QueryClient; query: Query<Value> }>): Effect.Effect<
  Option.Option<Value>
> => Effect.option(Effect.tryPromise(() => queryClient.query({ ...query, staleTime: "static" })));

const loadMosaic = ({ queryClient, slug }: Load): Effect.Effect<Option.Option<Mosaic>> =>
  Option.match(bundledMosaic(slug), {
    onNone: () => fetched({ queryClient, query: mosaicQuery(slug) }),
    onSome: (mosaic) => {
      queryClient.setQueryData(mosaicQuery(slug).queryKey, mosaic);
      return Effect.succeedSome(mosaic);
    },
  });

const loadCandidates = ({
  queryClient,
  slug,
  mosaic,
}: Load & { readonly mosaic: Mosaic }): Effect.Effect<CandidateList> =>
  Option.match(bundledCandidates(slug, mosaic), {
    onNone: () =>
      fetched({ queryClient, query: candidatesQuery({ slug, mosaic }) }).pipe(
        Effect.map(Option.getOrElse(() => NO_CANDIDATES)),
      ),
    onSome: Effect.succeed,
  });

const choiceOf = ({
  load,
  mosaic,
  seed,
}: Readonly<{ load: Load; mosaic: Option.Option<Mosaic>; seed: number }>): Effect.Effect<
  readonly number[]
> =>
  Option.match(mosaic, {
    onNone: () => Effect.succeed(NO_CHOICE),
    onSome: (found) =>
      loadCandidates({ ...load, mosaic: found }).pipe(
        Effect.flatMap((candidates) => assignVariants({ candidates, seed })),
      ),
  });

const loadVisit = ({ seed: given, ...load }: VisitLoad): Effect.Effect<Loaded> =>
  Effect.gen(function* visit() {
    const seed = yield* Option.match(given, {
      onNone: () => Random.nextInt,
      onSome: Effect.succeed,
    });
    const mosaic = yield* loadMosaic(load);
    const choice = yield* choiceOf({ load, mosaic, seed });
    return { seed, choice, mosaic };
  });

export type { Assignment, Loaded };
export { loadVisit };

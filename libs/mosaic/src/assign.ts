import { Array, Effect, Option, Random, pipe } from "effect";

import type { Candidates as CandidatesSchema } from "./mosaic.ts";

type Options = readonly (readonly number[])[];
type Owner = (cell: number) => Option.Option<number>;

const FIRST = 0;
const NEXT = 1;

const shuffledOptions = (candidates: typeof CandidatesSchema.Type): Effect.Effect<Options> =>
  pipe(
    candidates,
    Effect.forEach((options) => Random.shuffle(Array.dedupe(options))),
  );

const matchAll = (options: Options, order: readonly number[]): Owner => {
  const owner = new Map<number, number>();
  const seen = new Map<number, number>();
  const augment = (cell: number, stamp: number): boolean => {
    const claim = (thumbnail: number): boolean => {
      if (seen.get(thumbnail) === stamp) {
        return false;
      }
      seen.set(thumbnail, stamp);
      const free = Option.match(Option.fromNullishOr(owner.get(thumbnail)), {
        onNone: () => true,
        onSome: (holder) => augment(holder, stamp),
      });
      if (free) {
        owner.set(thumbnail, cell);
      }
      return free;
    };
    return pipe(
      options[cell] ?? [],
      Array.some((thumbnail) => claim(thumbnail)),
    );
  };
  for (const [stamp, cell] of order.entries()) {
    augment(cell, stamp);
  }
  const byCell = new Map(
    Array.map(Array.fromIterable(owner), ([thumbnail, cell]) => [cell, thumbnail]),
  );
  return (cell) => Option.fromNullishOr(byCell.get(cell));
};

const choiceOf =
  (matched: Owner) =>
  (options: readonly number[], cell: number): number =>
    pipe(
      options,
      Array.findFirstIndex((thumbnail) => Option.contains(matched(cell), thumbnail)),
      Option.getOrElse(() => FIRST),
    );

const assignVariants = ({
  candidates,
  seed,
}: Readonly<{ candidates: typeof CandidatesSchema.Type; seed: number }>): Effect.Effect<
  readonly number[]
> =>
  Effect.gen(function* assign() {
    const order = yield* Random.shuffle(Array.range(FIRST, candidates.length - NEXT));
    const options = yield* shuffledOptions(candidates);
    const matched = matchAll(options, order);
    return pipe(candidates, Array.map(choiceOf(matched)));
  }).pipe(Random.withSeed(seed));

export { assignVariants };

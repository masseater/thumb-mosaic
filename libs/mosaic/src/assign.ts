import { Array, Effect, Function, Option, Order, Random, pipe } from "effect";

import type { Candidates as CandidatesSchema } from "./mosaic.ts";

interface Edge {
  readonly cell: number;
  readonly thumbnail: number;
  readonly score: number;
}

type Options = readonly (readonly Edge[])[];
type Owner = (cell: number) => Option.Option<number>;

const TEMPERATURE = 40;
const BAN_RATE = 0.5;
const BAN_PENALTY = 1_000_000;
const NO_PENALTY = 0;
const FIRST = 0;
const NEXT = 1;

const byScore = (edges: readonly Edge[]): readonly Edge[] =>
  pipe(
    edges,
    Array.sortWith((edge: Edge) => edge.score, Order.Number),
  );

const gumbel = pipe(
  Random.next,
  Effect.map((uniform) => -Math.log(-Math.log(Math.max(uniform, Number.EPSILON)))),
);

const thumbnailCount = (candidates: typeof CandidatesSchema.Type): number =>
  pipe(
    candidates,
    Array.flatten,
    Array.map(([thumbnail]) => thumbnail + NEXT),
    Option.liftPredicate(Array.isArrayNonEmpty),
    Option.map(Array.max(Order.Number)),
    Option.getOrElse(() => FIRST),
  );

const banPenalties = (count: number): Effect.Effect<readonly number[]> =>
  Effect.forEach(Array.makeBy(count, Function.identity), () =>
    Random.next.pipe(Effect.map((draw) => Number(draw < BAN_RATE) * BAN_PENALTY)),
  );

const scoredOptions = (candidates: typeof CandidatesSchema.Type): Effect.Effect<Options> =>
  Effect.flatMap(banPenalties(thumbnailCount(candidates)), (penalties) =>
    pipe(
      candidates,
      Effect.forEach((options, cell) =>
        pipe(
          options,
          Effect.forEach(([thumbnail, error]) =>
            pipe(
              gumbel,
              Effect.map((noise) => ({
                cell,
                thumbnail,
                score: error + (penalties[thumbnail] ?? NO_PENALTY) - TEMPERATURE * noise,
              })),
            ),
          ),
          Effect.map(byScore),
        ),
      ),
    ),
  );

const greedy = (options: Options): Map<number, number> => {
  const owner = new Map<number, number>();
  const placed = new Set<number>();
  for (const edge of byScore(Array.flatten(options))) {
    if (!placed.has(edge.cell) && !owner.has(edge.thumbnail)) {
      owner.set(edge.thumbnail, edge.cell);
      placed.add(edge.cell);
    }
  }
  return owner;
};

const matchAll = (options: Options): Owner => {
  const owner = greedy(options);
  const seen = new Map<number, number>();
  const augment = (cell: number, stamp: number): boolean => {
    const claim = ({ thumbnail }: Edge): boolean => {
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
      Array.some((edge) => claim(edge)),
    );
  };
  const placed = new Set(owner.values());
  const unplaced = Array.filter(
    Array.range(FIRST, options.length - NEXT),
    (cell) => !placed.has(cell),
  );
  for (const [stamp, cell] of unplaced.entries()) {
    augment(cell, stamp);
  }
  const byCell = new Map(
    Array.map(Array.fromIterable(owner), ([thumbnail, cell]) => [cell, thumbnail]),
  );
  return (cell) => Option.fromNullishOr(byCell.get(cell));
};

const choiceOf =
  (matched: Owner) =>
  (options: (typeof CandidatesSchema.Type)[number], cell: number): number =>
    pipe(
      options,
      Array.findFirstIndex(([thumbnail]) => Option.contains(matched(cell), thumbnail)),
      Option.getOrElse(() => FIRST),
    );

const assignVariants = ({
  candidates,
  seed,
}: Readonly<{ candidates: typeof CandidatesSchema.Type; seed: number }>): Effect.Effect<
  readonly number[]
> =>
  pipe(
    scoredOptions(candidates),
    Effect.map((options) => {
      const matched = matchAll(options);
      return pipe(candidates, Array.map(choiceOf(matched)));
    }),
    Random.withSeed(seed),
  );

const assignedTiles = <Tile>(
  choice: readonly number[],
  lists: readonly (readonly Tile[])[],
): readonly Tile[] =>
  pipe(
    choice,
    Array.map((variant, index) =>
      pipe(
        Array.get(lists, variant),
        Option.flatMap((list) => Array.get(list, index)),
      ),
    ),
    Array.getSomes,
  );

export { assignVariants, assignedTiles };

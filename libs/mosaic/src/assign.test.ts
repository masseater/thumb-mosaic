import { Array, Effect, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { assignVariants } from "./assign.ts";

const CELLS = 6;
const VARIANTS = 3;
const SEED = 7;

const CANDIDATES = Array.makeBy(CELLS, (cell) =>
  Array.makeBy(VARIANTS, (variant) => (cell + variant) % CELLS),
);

const thumbnailsOf = (choice: readonly number[]): readonly Option.Option<number>[] =>
  pipe(
    choice,
    Array.map((variant, cell) =>
      pipe(Array.get(CANDIDATES, cell), Option.flatMap(Array.get(variant))),
    ),
  );

const assigned = (): Effect.Effect<readonly number[]> =>
  assignVariants({ candidates: CANDIDATES, seed: SEED });

const distinctThumbnails = (choice: readonly number[]): number =>
  new Set(Array.getSomes(thumbnailsOf(choice))).size;

const sameChoice = ([first, second]: readonly [readonly number[], readonly number[]]): boolean =>
  pipe(
    Array.zip(first, second),
    Array.every(([left, right]) => left === right),
  );

const distinct = Effect.runPromise(assigned().pipe(Effect.map(distinctThumbnails)));
const repeatable = Effect.runPromise(
  Effect.all([assigned(), assigned()]).pipe(Effect.map(sameChoice)),
);

describe("assignVariants", () => {
  it("uses each thumbnail once", () => expect(distinct).resolves.toBe(CELLS));

  it("returns the same choice for the same seed", () => expect(repeatable).resolves.toBe(true));
});

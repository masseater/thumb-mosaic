import { Array, Effect, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { assignVariants, assignedTiles } from "./assign.ts";

const CELLS = 6;
const VARIANTS = 3;
const SEED = 7;
const POOR_FIT = 10_000;
const BEST = 0;

const CANDIDATES = Array.makeBy(CELLS, (cell) =>
  Array.makeBy(VARIANTS, (variant): readonly [number, number] => [
    (cell + variant) % CELLS,
    variant * POOR_FIT,
  ]),
);

const SPARE_CANDIDATES = Array.makeBy(CELLS, (cell) =>
  Array.makeBy(VARIANTS, (variant): readonly [number, number] => [
    cell * VARIANTS + variant,
    variant * POOR_FIT,
  ]),
);

const thumbnailsOf = (choice: readonly number[]): readonly Option.Option<number>[] =>
  pipe(
    choice,
    Array.map((variant, cell) =>
      pipe(
        Array.get(CANDIDATES, cell),
        Option.flatMap(Array.get(variant)),
        Option.map(([thumbnail]) => thumbnail),
      ),
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
const allBest = (choice: readonly number[]): boolean =>
  pipe(
    choice,
    Array.every((variant) => variant === BEST),
  );
const bestFit = Effect.runPromise(
  assignVariants({ candidates: SPARE_CANDIDATES, seed: SEED }).pipe(Effect.map(allBest)),
);
const repeatable = Effect.runPromise(
  Effect.all([assigned(), assigned()]).pipe(Effect.map(sameChoice)),
);

describe("assignVariants", () => {
  it("uses each thumbnail once", () => expect(distinct).resolves.toBe(CELLS));

  it("sets aside some of the best fits for each seed", () => expect(bestFit).resolves.toBe(false));

  it("returns the same choice for the same seed", () => expect(repeatable).resolves.toBe(true));
});

const FIRST_VARIANT = 0;
const SECOND_VARIANT = 1;
const MISSING_VARIANT = 2;

describe("assignedTiles", () => {
  it("takes each cell's tile from the variant chosen for it", () => {
    expect(
      assignedTiles({
        choice: [SECOND_VARIANT, FIRST_VARIANT, SECOND_VARIANT],
        lists: [
          ["a0", "b0", "c0"],
          ["a1", "b1", "c1"],
        ],
      }),
    ).toStrictEqual(["a1", "b0", "c1"]);
  });

  it("skips cells whose variant has no tile", () => {
    expect(assignedTiles({ choice: [MISSING_VARIANT, FIRST_VARIANT], lists: [["a0", "b0"]] })).toStrictEqual(["b0"]);
  });
});

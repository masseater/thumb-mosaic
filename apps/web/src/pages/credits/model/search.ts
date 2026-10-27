import { Option } from "effect";

import { seedOf } from "#/shared/lib/seed";

const DEFAULT_SEED = 0;

const creditsSearch = (search: Readonly<Record<string, unknown>>): Readonly<{ seed: number }> => ({
  seed: Option.getOrElse(seedOf(search), () => DEFAULT_SEED),
});

export { creditsSearch };

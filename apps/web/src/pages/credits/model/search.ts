import { Option, Schema } from "effect";

const DEFAULT_SEED = 0;

const decodeSeed = Schema.decodeUnknownOption(Schema.Int);

const creditsSearch = (search: Readonly<Record<string, unknown>>): Readonly<{ seed: number }> => ({
  seed: Option.getOrElse(decodeSeed(search["seed"]), () => DEFAULT_SEED),
});

export { creditsSearch };

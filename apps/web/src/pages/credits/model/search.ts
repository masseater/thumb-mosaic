import { Option, Schema } from "effect";

const FIRST_VARIANT = 0;

const decodeVariant = Schema.decodeUnknownOption(Schema.Int);

const creditsSearch = (
  search: Readonly<Record<string, unknown>>,
): Readonly<{ variant: number }> => ({
  variant: Option.getOrElse(decodeVariant(search["variant"]), () => FIRST_VARIANT),
});

export { creditsSearch };

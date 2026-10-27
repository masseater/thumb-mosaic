import type { Option } from "effect";
import { Schema } from "effect";

const decodeSeed = Schema.decodeUnknownOption(Schema.Int);

const seedOf = (search: Readonly<Record<string, unknown>>): Option.Option<number> =>
  decodeSeed(search["seed"]);

export { seedOf };

import { Schema } from "effect";

const Level = Schema.Struct({
  tw: Schema.Int,
  th: Schema.Int,
  block: Schema.Int,
  blocks: Schema.Array(Schema.Tuple([Schema.Int, Schema.Int, Schema.String])),
});

const Tile = Schema.Tuple([Schema.Int, Schema.String, Schema.String, Schema.String, Schema.String]);

const Tiles = Schema.Array(Tile);

const PublishedMosaic = Schema.Struct({
  character: Schema.String,
  credit: Schema.String,
  cols: Schema.Int,
  rows: Schema.Int,
  variants: Schema.Array(Schema.Struct({ version: Schema.String, meanDelta: Schema.Finite })),
  levels: Schema.Array(Level),
  tile: Schema.Struct({ width: Schema.Int, height: Schema.Int }),
  cells: Schema.Array(Schema.Int),
  og: Schema.String,
  tiles: Schema.String,
  candidates: Schema.String,
  chunk: Schema.Struct({ size: Schema.Int, dir: Schema.String }),
});

const Candidates = Schema.Array(Schema.Array(Schema.Tuple([Schema.Int, Schema.Int])));

export { Candidates, PublishedMosaic, Tile, Tiles };

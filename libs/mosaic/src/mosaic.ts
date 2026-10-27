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
  pool: Schema.Int,
  meanDelta: Schema.Finite,
  variant: Schema.Int,
  version: Schema.String,
  levels: Schema.Array(Level),
  tile: Schema.Struct({ width: Schema.Int, height: Schema.Int, dir: Schema.String }),
  cells: Schema.Array(Schema.Int),
  og: Schema.String,
  tiles: Schema.String,
  chunk: Schema.Struct({ size: Schema.Int, dir: Schema.String }),
});

export { PublishedMosaic, Tile, Tiles };

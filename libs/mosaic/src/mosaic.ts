import { Schema } from "effect";

const Level = Schema.Struct({
  tw: Schema.Int,
  th: Schema.Int,
  perRow: Schema.Int,
  perAtlas: Schema.Int,
  files: Schema.Array(Schema.String),
});

const Tile = Schema.Tuple([Schema.Int, Schema.String, Schema.String, Schema.String, Schema.String]);

const Mosaic = Schema.Struct({
  character: Schema.String,
  credit: Schema.String,
  cols: Schema.Int,
  rows: Schema.Int,
  pool: Schema.Int,
  meanDelta: Schema.Finite,
  levels: Schema.Array(Level),
  tile: Schema.Struct({ width: Schema.Int, height: Schema.Int, dir: Schema.String }),
  tiles: Schema.Array(Tile),
});

const PublishedMosaic = Schema.Struct({ ...Mosaic.fields, version: Schema.String });

export { Mosaic, PublishedMosaic, Tile };

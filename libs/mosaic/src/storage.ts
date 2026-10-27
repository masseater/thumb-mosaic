const MOSAIC_BUCKET = "thumb-mosaic-tiles";

const manifestKey = (slug: string): string => `${slug}/meta.json`;

const objectKey = ({
  slug,
  version,
  file,
}: Readonly<{ slug: string; version: string; file: string }>): string =>
  `${slug}/${version}/${file}`;

export { MOSAIC_BUCKET, manifestKey, objectKey };

const FILES_DIR = "files";

const ORIGINALS_BUCKET = "thumb-mosaic-originals";

const ORIGINAL_TYPE = "image/jpeg";

interface VariantRef {
  readonly slug: string;
  readonly variant: number;
  readonly version: string;
}

const manifestPath = (slug: string): string => `${FILES_DIR}/${slug}.json`;

const slugPath = (slug: string): string => `${FILES_DIR}/${slug}`;

const versionPath = ({ slug, variant, version }: VariantRef): string =>
  `${slugPath(slug)}/${variant}/${version}`;

export type { VariantRef };
export { FILES_DIR, ORIGINAL_TYPE, ORIGINALS_BUCKET, manifestPath, slugPath, versionPath };

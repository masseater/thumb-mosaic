const FILES_DIR = "files";

interface VariantRef {
  readonly slug: string;
  readonly variant: number;
  readonly version: string;
}

const slugPath = (slug: string): string => `${FILES_DIR}/${slug}`;

const manifestPath = (slug: string): string => `${slugPath(slug)}/manifest.json`;

const versionPath = ({ slug, variant, version }: VariantRef): string =>
  `${slugPath(slug)}/${variant}/${version}`;

export type { VariantRef };
export { FILES_DIR, manifestPath, slugPath, versionPath };

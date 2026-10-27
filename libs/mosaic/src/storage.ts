const FILES_DIR = "files";

interface VariantRef {
  readonly slug: string;
  readonly variant: number;
}

const manifestPath = ({ slug, variant }: VariantRef): string =>
  `${FILES_DIR}/${slug}/${variant}.json`;

const versionPath = ({
  slug,
  variant,
  version,
}: VariantRef & { readonly version: string }): string =>
  `${FILES_DIR}/${slug}/${variant}/${version}`;

export type { VariantRef };
export { FILES_DIR, manifestPath, versionPath };

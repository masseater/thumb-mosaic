const FILES_DIR = "files";

const manifestPath = (slug: string): string => `${FILES_DIR}/${slug}.json`;

const versionPath = ({ slug, version }: Readonly<{ slug: string; version: string }>): string =>
  `${FILES_DIR}/${slug}/${version}`;

export { FILES_DIR, manifestPath, versionPath };

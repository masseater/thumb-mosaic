import { siBluesky, siX } from "simple-icons";

import { BASE_PATH, SITE_ORIGIN } from "#/shared/config";

interface ShareTarget {
  readonly name: string;
  readonly path: string;
  readonly href: (text: string) => string;
}

const SHARE_TARGETS: readonly ShareTarget[] = [
  {
    name: siX.title,
    path: siX.path,
    href: (text) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`,
  },
  {
    name: siBluesky.title,
    path: siBluesky.path,
    href: (text) => `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`,
  },
];

const shareText = ({ slug, seed }: Readonly<{ slug: string; seed: number }>): string =>
  `${slug}.mosaic ${SITE_ORIGIN}${BASE_PATH}/${slug}?seed=${seed}`;

export type { ShareTarget };
export { SHARE_TARGETS, shareText };

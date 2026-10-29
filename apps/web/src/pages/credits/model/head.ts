import { Option, pipe } from "effect";

import { BASE_PATH, SITE_ORIGIN } from "#/shared/config";
import { optionalCardMeta } from "#/shared/lib/card";
import type { Card, Meta } from "#/shared/lib/card";

const creditsCard = (slug: string, mosaic: Card): Card => ({
  title: `${mosaic.title} のクレジット`,
  description: `${mosaic.title} に使用したサムネイルの動画と作者の一覧`,
  image: mosaic.image,
  url: `${SITE_ORIGIN}${BASE_PATH}/${slug}/credits`,
});

const creditsHead = ({
  slug,
  mosaic,
}: Readonly<{ slug: string; mosaic: Option.Option<Card> }>): Readonly<{ meta: Meta[] }> => ({
  meta: optionalCardMeta(
    pipe(
      mosaic,
      Option.map((card) => creditsCard(slug, card)),
    ),
  ),
});

export { creditsHead };

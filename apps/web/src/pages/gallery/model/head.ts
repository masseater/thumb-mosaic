import { Option, pipe } from "effect";

import { BASE_PATH, SITE_ORIGIN } from "#/shared/config";
import { optionalCardMeta } from "#/shared/lib/card";
import type { Card, Meta } from "#/shared/lib/card";

import { GALLERY_TITLE } from "./title";

const galleryCard = (cover: Card): Card => ({
  title: GALLERY_TITLE,
  description:
    "キャラクターの公式イラストを、そのキャラクターを使った動画のサムネイルだけで組んだモザイクアート",
  image: cover.image,
  url: `${SITE_ORIGIN}${BASE_PATH}/`,
});

const galleryHead = (cover: Option.Option<Card>): Readonly<{ meta: Meta[] }> => ({
  meta: optionalCardMeta(pipe(cover, Option.map(galleryCard))),
});

export { galleryHead };

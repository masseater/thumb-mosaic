import { Option, Record } from "effect";
import type { ReactNode } from "react";
import { siNiconico, siYoutube } from "simple-icons";
import type { SimpleIcon } from "simple-icons";

import { Button } from "#/shared/ui/button";

const ICONS: Readonly<Record<string, SimpleIcon>> = {
  YouTube: siYoutube,
  ニコニコ: siNiconico,
};

const iconOf = (service: string): ReactNode =>
  Option.match(Record.get(ICONS, service), {
    onNone: () => service,
    onSome: (icon) => (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path d={icon.path} fill={`#${icon.hex}`} />
      </svg>
    ),
  });

const ServiceLink = ({ url, service }: Readonly<{ url: string; service: string }>): ReactNode => (
  <Button asChild variant="outline" size="icon">
    <a href={url} target="_blank" rel="noreferrer" aria-label={`${service}で見る`}>
      {iconOf(service)}
    </a>
  </Button>
);

export { ServiceLink };

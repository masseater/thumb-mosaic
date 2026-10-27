import { Option, Record } from "effect";
import type { ReactNode } from "react";
import { siNiconico, siYoutube } from "simple-icons";
import type { SimpleIcon } from "simple-icons";

const ICONS: Readonly<Record<string, SimpleIcon>> = {
  YouTube: siYoutube,
  ニコニコ: siNiconico,
};

const SIZES = { small: "size-4", medium: "size-5" } as const;

const ServiceIcon = ({
  service,
  size,
}: Readonly<{ service: string; size: keyof typeof SIZES }>): ReactNode =>
  Option.match(Record.get(ICONS, service), {
    onNone: () => service,
    onSome: (icon) => (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={SIZES[size]}>
        <path d={icon.path} fill={`#${icon.hex}`} />
      </svg>
    ),
  });

export { ServiceIcon };

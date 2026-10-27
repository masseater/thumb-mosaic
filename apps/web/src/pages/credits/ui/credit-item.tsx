import type { ReactNode } from "react";

interface CreditItemProps {
  readonly name: string;
  readonly artist: string;
  readonly url: string;
  readonly service: string;
}

const CreditItem = ({ name, artist, url, service }: CreditItemProps): ReactNode => (
  <li className="flex flex-col py-2 text-sm sm:flex-row sm:items-baseline sm:gap-3">
    <a href={url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
      {name}
    </a>
    <span className="text-muted-foreground flex gap-3">
      <span>{artist}</span>
      <span>{service}</span>
    </span>
  </li>
);

export { CreditItem };

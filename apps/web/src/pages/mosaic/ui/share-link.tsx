import type { ReactNode } from "react";

import { Button } from "#/shared/ui/button";

import { ShareIcon } from "./share-icon";

const ShareLink = ({
  name,
  path,
  href,
}: Readonly<{ name: string; path: string; href: string }>): ReactNode => (
  <Button asChild variant="outline" size="icon">
    <a href={href} target="_blank" rel="noreferrer" aria-label={`${name}で共有`}>
      <ShareIcon path={path} />
    </a>
  </Button>
);

export { ShareLink };

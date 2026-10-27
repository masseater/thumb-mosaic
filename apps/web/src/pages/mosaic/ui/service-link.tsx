import type { ReactNode } from "react";

import { Button } from "#/shared/ui/button";
import { ServiceIcon } from "#/shared/ui/service-icon";

const ServiceLink = ({ url, service }: Readonly<{ url: string; service: string }>): ReactNode => (
  <Button asChild variant="outline" size="icon">
    <a href={url} target="_blank" rel="noreferrer" aria-label={`${service}で見る`}>
      <ServiceIcon service={service} size="medium" />
    </a>
  </Button>
);

export { ServiceLink };

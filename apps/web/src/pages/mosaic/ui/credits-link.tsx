import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { Button } from "#/shared/ui/button";

const LABEL = "使った動画";

const CreditsLink = ({ slug }: Readonly<{ slug: string }>): ReactNode => {
  const params = useMemo(() => ({ slug }), [slug]);
  return (
    <Button variant="outline" asChild>
      <Link to="/$slug/credits" params={params}>
        {LABEL}
      </Link>
    </Button>
  );
};

export { CreditsLink };

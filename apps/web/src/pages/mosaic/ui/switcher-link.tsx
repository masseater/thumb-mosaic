import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";

const ACTIVE_OPTIONS = { includeSearch: false };

const SwitcherLink = ({ slug }: Readonly<{ slug: string }>): ReactNode => {
  const params = useMemo(() => ({ slug }), [slug]);
  return (
    <Link
      to="/$slug"
      params={params}
      activeOptions={ACTIVE_OPTIONS}
      reloadDocument
      className="data-[status=active]:text-foreground underline underline-offset-2 data-[status=active]:font-medium data-[status=active]:no-underline"
    >
      {slug}
    </Link>
  );
};

export { SwitcherLink };

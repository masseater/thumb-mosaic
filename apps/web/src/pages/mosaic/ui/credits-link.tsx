import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";

const CREDITS = "クレジット";

const CreditsLink = ({ slug, seed }: Readonly<{ slug: string; seed: number }>): ReactNode => {
  const params = useMemo(() => ({ slug }), [slug]);
  const search = useMemo(() => ({ seed }), [seed]);
  return (
    <Link
      to="/$slug/credits"
      params={params}
      search={search}
      className="pointer-events-auto underline underline-offset-2"
    >
      {CREDITS}
    </Link>
  );
};

export { CREDITS, CreditsLink };

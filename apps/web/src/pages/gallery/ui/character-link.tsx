import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";

const CharacterLink = ({ slug, name }: Readonly<{ slug: string; name: string }>): ReactNode => {
  const params = useMemo(() => ({ slug }), [slug]);
  return (
    <li>
      <Link
        to="/$slug"
        params={params}
        className="hover:bg-accent block rounded-lg border p-4 font-medium"
      >
        {name}
      </Link>
    </li>
  );
};

export { CharacterLink };

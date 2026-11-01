import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";

const ACTIVE_OPTIONS = { includeSearch: false };
const NEAREST: ScrollIntoViewOptions = { block: "nearest", inline: "center" };

const revealWhen =
  (current: boolean) =>
  (element: HTMLAnchorElement | null): void => {
    if (current && element !== null) {
      element.scrollIntoView(NEAREST);
    }
  };

const SwitcherLink = ({
  slug,
  current,
}: Readonly<{ slug: string; current: boolean }>): ReactNode => {
  const params = useMemo(() => ({ slug }), [slug]);
  const reveal = useMemo(() => revealWhen(current), [current]);
  return (
    <Link
      ref={reveal}
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

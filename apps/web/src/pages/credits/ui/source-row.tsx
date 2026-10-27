import type { ReactNode } from "react";

const SourceRow = ({
  term,
  children,
}: Readonly<{ term: string; children: ReactNode }>): ReactNode => (
  <div className="flex flex-col sm:flex-row sm:gap-4">
    <dt className="sm:w-40 sm:shrink-0">{term}</dt>
    <dd>{children}</dd>
  </div>
);

export { SourceRow };

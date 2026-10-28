import type { ReactNode } from "react";

const ShareIcon = ({ path }: Readonly<{ path: string }>): ReactNode => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
    <path d={path} fill="currentColor" />
  </svg>
);

export { ShareIcon };

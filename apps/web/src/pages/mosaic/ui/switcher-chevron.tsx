import type { ReactNode } from "react";

const SwitcherChevron = (): ReactNode => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="size-3 transition-transform group-open:rotate-180"
  >
    <path d="M7 14l5-5 5 5z" fill="currentColor" />
  </svg>
);

export { SwitcherChevron };

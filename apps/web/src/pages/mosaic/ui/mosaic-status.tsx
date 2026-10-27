import type { ReactNode } from "react";

const MosaicStatus = ({ message }: Readonly<{ message: string }>): ReactNode => (
  <p className="text-muted-foreground absolute inset-0 grid animate-pulse place-items-center text-sm">
    {message}
  </p>
);

export { MosaicStatus };

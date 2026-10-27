import { Navigate, getRouteApi } from "@tanstack/react-router";
import { Option } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

const route = getRouteApi("/$slug");

const SeedUrl = ({ seed }: Readonly<{ seed: number }>): ReactNode => {
  const current = route.useSearch({ select: (search) => Option.fromNullishOr(search.seed) });
  const search = useMemo(() => ({ seed }), [seed]);
  return Option.isNone(current) && <Navigate from="/$slug" to="." search={search} replace />;
};

export { SeedUrl };

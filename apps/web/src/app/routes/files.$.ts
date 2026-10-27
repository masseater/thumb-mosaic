import { createFileRoute } from "@tanstack/react-router";

import { original } from "#/app/server/originals.server";

const Route = createFileRoute("/files/$")({
  server: { handlers: { GET: original } },
});

export { Route };

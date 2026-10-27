import { Effect } from "effect";
import type { ReactNode } from "react";
import { useCallback } from "react";

import { replayIntro } from "#/pages/mosaic/lib/viewer";
import { useViewerStore } from "#/pages/mosaic/model/viewer";
import { Button } from "#/shared/ui/button";

const LABEL = "もう一度集める";

const ReplayButton = (): ReactNode => {
  const store = useViewerStore();
  const replay = useCallback(() => {
    Effect.runFork(replayIntro(store));
  }, [store]);
  return (
    <Button variant="outline" onClick={replay}>
      {LABEL}
    </Button>
  );
};

export { ReplayButton };

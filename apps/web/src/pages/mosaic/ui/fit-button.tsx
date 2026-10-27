import type { MouseEventHandler, ReactNode } from "react";
import { useCallback } from "react";

import { flyHome } from "#/pages/mosaic/lib/scene";
import { useViewerStore } from "#/pages/mosaic/model/viewer";
import { Button } from "#/shared/ui/button";

const LABEL = "全体を表示";

const FitButton = (): ReactNode => {
  const store = useViewerStore();
  const fit = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      store.step(flyHome(event.timeStamp));
    },
    [store],
  );
  return (
    <Button variant="outline" onClick={fit}>
      {LABEL}
    </Button>
  );
};

export { FitButton };

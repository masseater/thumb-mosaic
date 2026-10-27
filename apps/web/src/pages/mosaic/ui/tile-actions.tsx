import { Option } from "effect";
import type { ReactNode } from "react";
import { useCallback } from "react";

import { select } from "#/pages/mosaic/lib/scene";
import { useViewerStore } from "#/pages/mosaic/model/viewer";
import { Button } from "#/shared/ui/button";

import { ServiceLink } from "./service-link";

const CLOSE = "閉じる";

const TileActions = ({ url, service }: Readonly<{ url: string; service: string }>): ReactNode => {
  const store = useViewerStore();
  const close = useCallback(() => {
    store.step(select(Option.none()));
  }, [store]);
  return (
    <div className="flex gap-2">
      <ServiceLink url={url} service={service} />
      <Button variant="outline" onClick={close}>
        {CLOSE}
      </Button>
    </div>
  );
};

export { TileActions };

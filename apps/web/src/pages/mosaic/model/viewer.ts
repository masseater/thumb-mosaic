import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { Atom } from "effect/reactivity";
import { use, useMemo } from "react";

import type { Scene, Step } from "#/pages/mosaic/lib/scene";

type Viewer = Readonly<{ status: "empty" }> | Readonly<{ status: "ready"; scene: Scene }>;

interface ViewerStore {
  readonly read: () => Viewer;
  readonly write: (viewer: Viewer) => void;
  readonly step: (step: Step) => void;
}

const viewerAtom = Atom.keepAlive(Atom.make<Viewer>({ status: "empty" }));

const selectionAtom = Atom.make((get) => {
  const viewer = get(viewerAtom);
  if (viewer.status === "ready") {
    return viewer.scene.selection;
  }
  return Option.none<number>();
});

const searchAtom = Atom.make("");

const onScene =
  (step: Step) =>
  (viewer: Viewer): Viewer => {
    if (viewer.status === "ready") {
      return { status: "ready", scene: step(viewer.scene) };
    }
    return viewer;
  };

const useSelection = (): Option.Option<number> => useAtomValue(selectionAtom);

const useViewerStore = (): ViewerStore => {
  const registry = use(RegistryContext);
  return useMemo(
    (): ViewerStore => ({
      read: () => registry.get(viewerAtom),
      write: (viewer) => {
        registry.set(viewerAtom, viewer);
      },
      step: (step) => {
        registry.update(viewerAtom, onScene(step));
      },
    }),
    [registry],
  );
};

const useSearch = (): string => useAtomValue(searchAtom);

const useSetSearch = (): ((query: string) => void) => useAtomSet(searchAtom);

export type { Viewer, ViewerStore };
export { useSearch, useSelection, useSetSearch, useViewerStore };

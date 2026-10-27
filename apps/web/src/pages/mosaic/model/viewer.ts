import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { Atom } from "effect/reactivity";
import { use, useMemo } from "react";

import type { Scene, Step } from "#/pages/mosaic/lib/scene";

type Viewer =
  | Readonly<{ status: "empty" }>
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; scene: Scene }>;

type Arrival = "pending" | "arrived";

interface ViewerStore {
  readonly read: () => Viewer;
  readonly write: (viewer: Viewer) => void;
  readonly step: (step: Step) => void;
  readonly arrive: () => void;
}

const viewerAtom = Atom.keepAlive(Atom.make<Viewer>({ status: "empty" }));

const selectionAtom = Atom.make((get) => {
  const viewer = get(viewerAtom);
  if (viewer.status === "ready") {
    return viewer.scene.selection;
  }
  return Option.none<number>();
});

const statusAtom = Atom.make((get): Viewer["status"] => get(viewerAtom).status);

const searchAtom = Atom.make("");

const arrivalAtom = Atom.keepAlive(Atom.make<Arrival>("pending"));

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
        registry.set(arrivalAtom, "pending");
      },
      arrive: () => {
        if (registry.get(arrivalAtom) === "pending") {
          registry.set(arrivalAtom, "arrived");
        }
      },
      step: (step) => {
        registry.update(viewerAtom, onScene(step));
      },
    }),
    [registry],
  );
};

const useViewerStatus = (): Viewer["status"] => useAtomValue(statusAtom);

const useArrival = (): Arrival => useAtomValue(arrivalAtom);

const useSearch = (): string => useAtomValue(searchAtom);

const useSetSearch = (): ((query: string) => void) => useAtomSet(searchAtom);

export type { Viewer, ViewerStore };
export { useArrival, useSearch, useSelection, useSetSearch, useViewerStatus, useViewerStore };

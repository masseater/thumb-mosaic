import { Function, Option, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { TileCrop as Crop } from "#/pages/mosaic/lib/files";

const ORIGIN = 0;

const TileCrop = ({ crop }: Readonly<{ crop: Crop }>): ReactNode => {
  const { url, left, top, width, height } = crop;
  const draw = useCallback(
    (canvas: HTMLCanvasElement | null): (() => void) =>
      pipe(
        Option.fromNullishOr(canvas),
        Option.flatMap((element) => Option.fromNullishOr(element.getContext("2d"))),
        Option.match({
          onNone: () => Function.constVoid,
          onSome: (context) => {
            const image = new Image();
            const paint = (): void => {
              context.drawImage(image, left, top, width, height, ORIGIN, ORIGIN, width, height);
            };
            image.addEventListener("load", paint);
            image.src = url;
            return () => {
              image.removeEventListener("load", paint);
            };
          },
        }),
      ),
    [url, left, top, width, height],
  );
  return (
    <canvas
      ref={draw}
      width={width}
      height={height}
      className="bg-muted aspect-video w-full rounded-md"
    />
  );
};

export { TileCrop };

import { Array, Match } from "effect";

import type { Camera } from "./camera";
import { FLIGHT_MS as LANDING_MS } from "./intro";
import type { Flight } from "./intro";
import type { Scene, Step } from "./scene";
import { STILL, settle } from "./scene";

const FLIGHT_MS = 900;
const DONE = 1;
const HALF = 0.5;
const EASE_IN = 4;
const EASE_OUT_BASE = -2;
const EASE_OUT_OFFSET = 2;
const CUBIC = 3;
const HALVES = 2;
const NO_DELAY = 0;

const easeInOut = (progress: number): number => {
  if (progress < HALF) {
    return EASE_IN * progress ** CUBIC;
  }
  return DONE - (EASE_OUT_BASE * progress + EASE_OUT_OFFSET) ** CUBIC / HALVES;
};

const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;

const between = (
  { from, to }: Readonly<{ from: Camera; to: Camera }>,
  scene: Scene,
  amount: number,
): Camera => {
  const scale = Math.exp(lerp(Math.log(from.scale), Math.log(to.scale), amount));
  const centerX = scene.viewport.width * HALF;
  const centerY = scene.viewport.height * HALF;
  const worldX = lerp((centerX - from.left) / from.scale, (centerX - to.left) / to.scale, amount);
  const worldY = lerp((centerY - from.top) / from.scale, (centerY - to.top) / to.scale, amount);
  return { scale, left: centerX - worldX * scale, top: centerY - worldY * scale };
};

const introLength = (flights: readonly Flight[]): number => {
  let longest = NO_DELAY;
  for (const flight of flights) {
    longest = Math.max(longest, flight.delay);
  }
  return longest + LANDING_MS;
};

const advance =
  (now: number): Step =>
  (scene) =>
    Match.value(scene.motion).pipe(
      Match.discriminatorsExhaustive("status")({
        still: () => scene,
        intro: ({ start, flights }) => {
          if (Array.isReadonlyArrayEmpty(flights) || now - start >= introLength(flights)) {
            return { ...scene, motion: STILL };
          }
          return scene;
        },
        flying: ({ start, from, to }) => {
          const progress = (now - start) / FLIGHT_MS;
          if (progress >= DONE) {
            return settle(to)(scene);
          }
          return { ...scene, camera: between({ from, to }, scene, easeInOut(progress)) };
        },
      }),
    );

export { advance };

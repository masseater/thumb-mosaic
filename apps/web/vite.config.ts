import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { CHARACTERS } from "@thumb-mosaic/mosaic";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { Array as Arr, Option, pipe } from "effect";
import { defineConfig } from "vite-plus";

import { BASE_PATH } from "./base-path.ts";
import { SEARCH_INDEX_ORIGIN } from "./src/shared/config/search.ts";

const SITEMAP_FILE = "sitemap.xml";

const characterPages = pipe(
  CHARACTERS,
  Arr.flatMap(({ slug }) => [{ path: `/${slug}` }, { path: `/${slug}/credits` }]),
);

export default defineConfig({
  base: `${BASE_PATH}/`,
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      { extends: true, test: { name: "app", include: ["src/**/*.test.{ts,tsx}"] } },
      { extends: false, test: { name: "alchemy", include: ["*.test.ts"] } },
    ],
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/app",
      rsc: { enabled: true },
      prerender: { enabled: true, crawlLinks: false, autoSubfolderIndex: false },
      pages: [{ path: "/" }, ...characterPages],
      spa: {
        enabled: true,
        maskPath: "/404",
        prerender: { outputPath: "/404", crawlLinks: false },
      },
      sitemap: Option.match(SEARCH_INDEX_ORIGIN, {
        onNone: () => ({ enabled: false }),
        onSome: (host) => ({ host, outputPath: SITEMAP_FILE }),
      }),
    }),
    rsc(),
    viteReact(),
  ],
});

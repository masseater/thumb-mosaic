import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      upload: {
        command: "node src/main.ts",
        cache: false,
      },
    },
  },
});

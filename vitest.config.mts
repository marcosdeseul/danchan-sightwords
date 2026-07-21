import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentOptions: {
      jsdom: {
        url: "http://localhost/",
      },
    },
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/App.tsx",
        "src/app/**/*.{ts,tsx}",
        "src/api.ts",
        "src/game.ts",
        "src/phraseForest.ts",
        "src/PhraseForestWorld.tsx",
        "src/TreasureRewardReveal.tsx",
      ],
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});

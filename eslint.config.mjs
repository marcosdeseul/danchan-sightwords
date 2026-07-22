import tsParser from "@typescript-eslint/parser";

const MAX_LOGICAL_LINES = 500;

export default [
  {
    ignores: [
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "storybook-static/**",
      "src/**/*.test.*",
      "src/**/*.stories.*",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}", "server/**/*.js"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "max-lines": [
        "error",
        {
          max: MAX_LOGICAL_LINES,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
];

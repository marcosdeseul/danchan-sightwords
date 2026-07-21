import tsParser from "@typescript-eslint/parser";

const MAX_LOGICAL_LINES = 1600;

export default [
  {
    ignores: [
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "storybook-static/**",
    ],
  },
  {
    files: ["**/*.{cjs,js,mjs,ts,tsx}"],
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

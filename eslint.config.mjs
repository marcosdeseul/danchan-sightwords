import tsParser from "@typescript-eslint/parser";

const MAX_LOGICAL_LINES = 500;

export default [
  {
    files: ["src/**/*.{ts,tsx}", "server/**/*.js"],
    ignores: ["src/**/*.test.*", "src/**/*.stories.*"],
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

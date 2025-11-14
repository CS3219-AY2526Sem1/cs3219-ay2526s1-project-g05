// eslint.config.mjs
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import globals from "globals";

export default [
  // core JS rules
  js.configs.recommended,

  // turn off stylistic rules that clash with Prettier
  eslintConfigPrettier,

  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    ignores: ["node_modules/**"],
    rules: {
      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          // ignore unused function params that start with _
          args: "all",
          argsIgnorePattern: "^_",
          // ignore unused catch(error) if it matches the pattern
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

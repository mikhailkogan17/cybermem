const tseslint = require("typescript-eslint");
const js = require("@eslint/js");

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "e2e/**/*.ts"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-var-requires": "off",
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
    ignores: ["dist/**", "templates/**"],
  },
);

// @ts-check

const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
   eslint.configs.recommended,
   ...tseslint.configs.recommended,
   {
      rules: {
         // Allow for my hacky 'const enum Vars'
         "@typescript-eslint/no-duplicate-enum-values": "off",
         "@typescript-eslint/consistent-type-assertions": "warn"
      }
   }
);
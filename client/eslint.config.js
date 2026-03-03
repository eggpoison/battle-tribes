import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default defineConfig([
   {
      ignores: ["node_modules/"]
   },

   {
      files: ["src/**/*.{ts,tsx}"],
      extends: [
         js.configs.recommended,
         ...tseslint.configs.strictTypeChecked, 
         ...tseslint.configs.stylisticTypeChecked
      ],
      languageOptions: {
         parser: tseslint.parser,
         parserOptions: {
            project: true,
            tsconfigRootDir: import.meta.dirname,
         },
         globals: {
            ...globals.browser
         },
      },
      rules: {
         "semi": ["error", "always"],
         "@typescript-eslint/explicit-function-return-type": "warn",
         "@typescript-eslint/no-unused-vars": "warn", // Downgrade unused variables to warnings instead of errors
         "@typescript-eslint/restrict-plus-operands": "off", // Turn this off because [number + string] is often useful and optimal
         "@typescript-eslint/prefer-literal-enum-member": "off", // Let me do my const enum shenanigans!!!
         "@typescript-eslint/prefer-includes": "off", // indexOf is faster than includes!
         "@typescript-eslint/array-type": ["error", {default: "generic", readonly: "generic"}], // Use ReadonlyArray<T> instead of readonly T[], and Array<T> instead of T[]
         "@typescript-eslint/no-non-null-assertion": "off", // This is often extrememly useful, e.g. gl.createBuffer()!
         "@typescript-eslint/restrict-template-expressions": "off" // Let me use numbers inside templates!!
      },
   },
]);
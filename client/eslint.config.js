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
         "@typescript-eslint/restrict-plus-operands": "off", // Turn this off because ( number + string ) is often useful and optimal
         "@typescript-eslint/prefer-literal-enum-member": "off", // Let me do my const enum shenanigans!!!
         "@typescript-eslint/prefer-includes": "off", // indexOf is faster than includes!
         "@typescript-eslint/array-type": ["error", {default: "generic", readonly: "generic"}], // Use ReadonlyArray<T> instead of readonly T[], and Array<T> instead of T[]
         "@typescript-eslint/no-non-null-assertion": "off", // This is extrememly useful everywhere, e.g. "ComponentArray.getComponent(entity)!"
         "@typescript-eslint/restrict-template-expressions": "off", // Let me use numbers inside string templates!!
         "semi": "off", // Semicolons don't belong on the end of arrow functions.
         "@typescript-eslint/prefer-nullish-coalescing": "off", // i use || not ??
         "@typescript-eslint/no-unsafe-enum-comparison": "off", // lets me do math with enums n const enums
         "@typescript-eslint/no-dynamic-delete": "warn", // Downgrade to a warning cuz its most of the time suboptimal, but also a more long-term fix most of the time
         "@typescript-eslint/prefer-for-of": "off", // For of is often slower
         "@typescript-eslint/prefer-optional-chain": "off", // Explicitly typing it is more performant
         "@typescript-eslint/no-duplicate-enum-values": "off" // CONST ENUMS!!!
      },
   },
]);
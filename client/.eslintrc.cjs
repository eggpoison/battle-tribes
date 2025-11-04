// .eslintrc.cjs
module.exports = {
  // Tells ESLint that this is the root of the project and it shouldn't look for config files in parent directories.
  root: true,

  // Specifies the parser ESLint should use. We use the TypeScript parser.
  parser: '@typescript-eslint/parser',

  // Defines the environments your code will run in. This adds global variables for each environment.
  env: {
    browser: true, // Browser global variables (e.g., `window`, `document`)
    es2021: true,  // Adds all ECMAScript 2021 globals and sets `ecmaVersion` to 12.
    node: true,    // Node.js global variables and scoping.
  },

  // A list of plugins to use. Plugins can provide rules, parsers, processors, etc.
  plugins: [
    '@typescript-eslint', // Plugin for TypeScript-specific rules
    'svelte',             // Plugin for Svelte-specific rules and processing
  ],

  // Extends pre-configured sets of rules. Order can matter.
  extends: [
    'eslint:recommended',                        // Base recommended rules from ESLint
    'plugin:@typescript-eslint/recommended',     // Recommended rules from the TypeScript plugin
    'plugin:svelte/recommended',                 // Recommended rules for Svelte
  ],

  // Fine-tune parsing options.
  parserOptions: {
    sourceType: 'module', // Allows for the use of imports
    ecmaVersion: 'latest', // Use the latest ECMAScript standard
  },

  // Overrides for specific file types. This is crucial for Svelte.
  overrides: [
    {
      files: ['*.svelte'], // Target all .svelte files
      // For Svelte files, we need to use the Svelte parser, not the TS parser.
      // The Svelte parser will then call the TS parser for the script block.
      parser: 'svelte-eslint-parser',
      // The Svelte parser needs to know which parser to use for the <script> block.
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  ],

  // Custom rules. You can override or add rules here.
  rules: {
    // Example: Turn off a rule you don't agree with.
    // '@typescript-eslint/no-explicit-any': 'off',
    
    // Example: Enforce a rule and set its severity to "warn" instead of "error".
    // 'svelte/no-unused-svelte-ignore': 'warn',
  },
};
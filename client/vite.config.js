import { defineConfig } from 'vite'
import TextureAtlasStitchingPlugin from "./tools/vite-plugin-texture-atlas";
import InlineConstEnumPlugin from "unplugin-inline-const-enum/vite";

// 🎯 TEMPORARY DIAGNOSTIC HACK
// Delete or comment this out once you find the broken file!
import glob from 'fast-glob';
import fs from 'fs';
import { babelParse } from 'ast-kit';

try {
   const checkFiles = glob.sync('{client/src,shared/src}/**/*.{ts,cts,mts}', { cwd: '..' });
   for (const file of checkFiles) {
      const fullPath = path.resolve('..', file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      try {
         // Force Babel to use the TypeScript plugin during this health check
         babelParse(content, fullPath, {
            plugins: ['typescript', 'decorators-legacy', 'classProperties']
         });
      } catch (err) {
         console.log(`\n🚨 ACTUAL CULPRIT FOUND: ${fullPath}`);
         console.log(`Parser Error: ${err.message}\n`);
      }
   }
} catch (e) {}
// -------------------------------------------------------------

const inlineConstEnumPlugin = InlineConstEnumPlugin({
   sourceDir: "..",
   sourcePattern: "{client/src,shared/src}/**/*.{ts,cts,mts}",
   tsConfig: "./tsconfig.json"
});
inlineConstEnumPlugin.apply = undefined;

export default defineConfig(env => {
   return {
      plugins: [
         TextureAtlasStitchingPlugin(),
         // @INCOMPLETE don't think this is working for the Settings object in the shared project. check if its correctly const-enum'ing when its gone
         inlineConstEnumPlugin
      ],
      define: {
         __DEV__: env.command === "serve"
      },
      build: {
         commonjsOptions: { transformMixedEsModules: true }
      },

      server: {
         fs: {
            // @HACK to get shitting shared project working
            // @SQUEAM: remove when no longer have shared project
            // Allow serving files from one level up from the project root.
            // This is necessary if your linked library is in a sibling directory.
            // e.g., ../my-shared-library
            // Adjust the path based on where your library is located.
            allow: [".", "../shared"],
         },
      },
   };
});
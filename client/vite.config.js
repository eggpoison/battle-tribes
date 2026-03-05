import { defineConfig } from 'vite'
import path from 'path';
import InlineConstEnumPlugin from "unplugin-inline-const-enum/vite";

export default defineConfig({
   plugins: [
      // @INCOMPLETE don't think this is working for the Settings object in the shared project. check if its correctly const-enum'ing when its gone
      InlineConstEnumPlugin({
         sourceDir: "./src",
         tsConfig: "./tsconfig.json",
      }),
   ],
   build: {
      commonjsOptions: { transformMixedEsModules: true }
   },

   // @HACK to get shitting shared project working
   resolve: {
      alias: {
         'webgl-test-shared': path.resolve(__dirname, '../shared/src')
      },
      preserveSymlinks: false // force resolution through alias, not the symlink
   },

   server: {
      fs: {
         // @SQUEAM: remove when no longer have shared project
         // Allow serving files from one level up from the project root.
         // This is necessary if your linked library is in a sibling directory.
         // e.g., ../my-shared-library
         // Adjust the path based on where your library is located.
         allow: ['..'],
      },
   },
})
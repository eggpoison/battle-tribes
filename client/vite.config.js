import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
   plugins: [svelte({
      preprocess: vitePreprocess({ script: true })
   })],
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
         // Allow serving files from one level up from the project root.
         // This is necessary if your linked library is in a sibling directory.
         // e.g., ../my-shared-library
         // Adjust the path based on where your library is located.
         allow: ['..'],
      },
   },
})
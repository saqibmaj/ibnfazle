import {fileURLToPath} from 'node:url'
import baseConfig from '../../astro.config.mjs'

export default {
  ...baseConfig,
  vite: {
    plugins: [{
      name: 'local-sanity-fixtures',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === '@sanity/client' && importer?.replaceAll('\\', '/').endsWith('/src/lib/sanity.ts')) {
          return fileURLToPath(new URL('./sanity-client.ts', import.meta.url))
        }
      },
    }],
  },
}

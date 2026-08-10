// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// Custom domain on GitHub Pages: set `site`, leave `base` unset (defaults to `/`).
export default defineConfig({
  site: 'https://ibnfazle.com',
  trailingSlash: 'never',
  output: 'static',
  redirects: {
    '/library': '/',
    '/page/1': '/',
  },
  integrations: [
    sitemap({
      // Exclude non-canonical / non-HTML build artifacts from the sitemap.
      filter(page) {
        const {pathname} = new URL(page)

        if (pathname.startsWith('/og/')) return false
        if (pathname === '/404' || pathname === '/404.html') return false
        if (pathname === '/library' || pathname === '/page/1') return false
        if (/\/page\/1$/.test(pathname)) return false

        return true
      },
      // Keep XML lean — this site has no news/video/i18n sitemap data.
      namespaces: {
        news: false,
        xhtml: false,
        image: false,
        video: false,
      },
    }),
  ],
});

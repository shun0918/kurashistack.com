import type { APIRoute } from 'astro';

// サイトの URL は astro.config.mjs の site だけに書く
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site)}\n`);

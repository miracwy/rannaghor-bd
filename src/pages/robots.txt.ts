import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
export const GET: APIRoute = async () => {
  const bindings = env as unknown as Record<string, string | undefined>;
  const siteUrl = (bindings.SITE_URL || 'https://rannaghorbd.example').replace(/\/$/, '');
  const body = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { publicSupabase } from '../lib/recipes';
import { demoRecipes } from '../lib/demo-recipes';

export const GET: APIRoute = async () => {
  const bindings = env as unknown as Record<string, string | undefined>;
  const siteUrl = (bindings.SITE_URL || 'https://rannaghorbd.example').replace(/\/$/, '');
  const staticPaths = ['', '/recipes/'];
  const recipeUrls: { slug: string; updated_at?: string | null }[] = [];
  const client = publicSupabase();
  if (client) {
    for (let offset = 0; offset < 20000; offset += 1000) {
      const { data, error } = await client.from('recipes').select('slug,updated_at').eq('status', 'published').order('updated_at', { ascending: false }).range(offset, offset + 999);
      if (error || !data?.length) break;
      recipeUrls.push(...data);
      if (data.length < 1000) break;
    }
  } else {
    recipeUrls.push(...demoRecipes.map((recipe) => ({ slug: recipe.slug })));
  }
  const urls: { loc: string; lastmod?: string }[] = [
    ...staticPaths.map((path) => ({ loc: `${siteUrl}${path}` })),
    ...recipeUrls.map((recipe) => ({ loc: `${siteUrl}/recipes/${encodeURIComponent(recipe.slug)}/`, lastmod: recipe.updated_at || undefined })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((item) => `<url><loc>${item.loc.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</loc>${item.lastmod ? `<lastmod>${new Date(item.lastmod).toISOString()}</lastmod>` : ''}</url>`).join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
};

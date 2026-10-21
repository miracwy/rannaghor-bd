import { createClient } from '@supabase/supabase-js';
import { env } from 'cloudflare:workers';
import { demoRecipes } from './demo-recipes';
import type { Recipe } from './types';

const bindings = env as unknown as Record<string, string | undefined>;
const url = bindings.SUPABASE_URL;
const anonKey = bindings.SUPABASE_ANON_KEY;

export function hasDatabaseConfig() {
  return Boolean(url && anonKey && !url.includes('YOUR_PROJECT'));
}

export function publicSupabase() {
  if (!hasDatabaseConfig()) return null;
  return createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getPublishedRecipes(limit = 12): Promise<Recipe[]> {
  const client = publicSupabase();
  if (!client) return demoRecipes.slice(0, limit);
  const { data, error } = await client.from('recipes').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(limit);
  if (error) {
    console.error('Unable to load recipes:', error.message);
    return [];
  }
  return (data as Recipe[] | null) ?? [];
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const client = publicSupabase();
  if (!client) return demoRecipes.find((recipe) => recipe.slug === slug) ?? null;
  const { data, error } = await client.from('recipes').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
  if (error) console.error('Unable to load recipe:', error.message);
  return (data as Recipe | null) ?? null;
}

export async function searchRecipes(query: string, category = '', page = 1, pageSize = 24): Promise<{ recipes: Recipe[]; total: number }> {
  const client = publicSupabase();
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(60, Math.max(1, Math.floor(pageSize)));
  if (!client) {
    const q = query.trim().toLowerCase();
    const filtered = demoRecipes.filter((r) => {
      const matchQuery = !q || `${r.title_bn} ${r.title_en ?? ''} ${r.category ?? ''} ${r.cuisine ?? ''}`.toLowerCase().includes(q);
      const matchCategory = !category || r.cuisine === category || r.category === category;
      return matchQuery && matchCategory;
    });
    const start = (safePage - 1) * safeSize;
    return { recipes: filtered.slice(start, start + safeSize), total: filtered.length };
  }
  let request = client.from('recipes').select('*', { count: 'exact' }).eq('status', 'published').order('created_at', { ascending: false });
  if (query.trim()) request = request.or(`title_bn.ilike.%${query.trim()}%,title_en.ilike.%${query.trim()}%,description_bn.ilike.%${query.trim()}%`);
  if (category) request = request.or(`cuisine.eq.${category},category.eq.${category}`);
  const start = (safePage - 1) * safeSize;
  const { data, error, count } = await request.range(start, start + safeSize - 1);
  if (error) {
    console.error('Recipe search failed:', error.message);
    return { recipes: [], total: 0 };
  }
  return { recipes: (data as Recipe[] | null) ?? [], total: count ?? 0 };
}

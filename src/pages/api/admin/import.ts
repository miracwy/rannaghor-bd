import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { env } from 'cloudflare:workers';

const bindings = env as unknown as Record<string, string | undefined>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const requiredString = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get('content-type')?.includes('application/json') !== true) return json({ error: 'Content-Type must be application/json.' }, 415);
  const bearer = request.headers.get('authorization') || '';
  const token = bearer.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: 'Admin session token is required.' }, 401);
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = bindings;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Server-side Supabase secrets are not configured.' }, 503);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData.user) return json({ error: 'Your session is invalid or expired. Please log in again.' }, 401);
  if (userData.user.app_metadata?.role !== 'admin') return json({ error: 'Admin role required.' }, 403);

  let body: { recipes?: unknown; publish?: unknown };
  try { body = await request.json() as { recipes?: unknown; publish?: unknown }; }
  catch { return json({ error: 'Malformed JSON request.' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'JSON body must be an object.' }, 400);
  if (!Array.isArray(body.recipes) || body.recipes.length < 1 || body.recipes.length > 50) return json({ error: 'Send between 1 and 50 recipes per batch.' }, 400);

  const publish = body.publish === true;
  const normalized: Record<string, unknown>[] = [];
  for (let i = 0; i < body.recipes.length; i += 1) {
    const item = body.recipes[i] as Record<string, unknown>;
    if (!item || !requiredString(item.title_bn) || !requiredString(item.slug) || !requiredString(item.license_name)) {
      return json({ error: `Recipe ${i + 1} must include title_bn, slug, and license_name.` }, 422);
    }
    if (!/^[a-z0-9-]{2,150}$/.test(String(item.slug))) return json({ error: `Recipe ${i + 1} has an invalid slug.` }, 422);
    if (String(item.license_name).toLowerCase().includes('confirm rights before publishing')) return json({ error: `Recipe ${i + 1} still contains the template license placeholder.` }, 422);
    if (!Array.isArray(item.ingredients) || !item.ingredients.length || !Array.isArray(item.instructions) || !item.instructions.length) {
      return json({ error: `Recipe ${i + 1} must include ingredients and instructions arrays.` }, 422);
    }
    for (const key of ['source_url', 'license_url', 'image_url']) {
      const value = item[key];
      if (value != null && value !== '' && (typeof value !== 'string' || !/^https:\/\//i.test(value))) {
        return json({ error: `Recipe ${i + 1}: ${key} must be an HTTPS URL when supplied.` }, 422);
      }
    }
    normalized.push({
      title_bn: String(item.title_bn).trim().slice(0, 180), title_en: requiredString(item.title_en) ? String(item.title_en).trim().slice(0, 180) : null,
      slug: String(item.slug), description_bn: requiredString(item.description_bn) ? String(item.description_bn).trim().slice(0, 3000) : null,
      ingredients: item.ingredients, instructions: item.instructions,
      prep_time_minutes: typeof item.prep_time_minutes === 'number' ? Math.max(0, Math.min(10080, Math.floor(item.prep_time_minutes))) : null,
      cook_time_minutes: typeof item.cook_time_minutes === 'number' ? Math.max(0, Math.min(10080, Math.floor(item.cook_time_minutes))) : null,
      servings: typeof item.servings === 'number' ? Math.max(1, Math.min(1000, Math.floor(item.servings))) : null,
      difficulty: requiredString(item.difficulty) ? String(item.difficulty).slice(0, 40) : 'সহজ',
      cuisine: requiredString(item.cuisine) ? String(item.cuisine).slice(0, 80) : null,
      category: requiredString(item.category) ? String(item.category).slice(0, 100) : null,
      image_url: requiredString(item.image_url) ? String(item.image_url) : null,
      source_url: requiredString(item.source_url) ? String(item.source_url) : null,
      license_name: String(item.license_name).trim().slice(0, 180),
      license_url: requiredString(item.license_url) ? String(item.license_url) : null,
      attribution: requiredString(item.attribution) ? String(item.attribution).trim().slice(0, 500) : null,
      status: publish ? 'published' : 'draft',
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await adminClient.from('recipes').upsert(normalized, { onConflict: 'slug' }).select('id,slug');
  if (error) {
    console.error('Recipe batch import failed:', error.message);
    return json({ error: 'Supabase could not save this batch.', details: error.message }, 500);
  }
  return json({ imported: data?.length ?? normalized.length, publish, message: 'Batch imported successfully.' });
};

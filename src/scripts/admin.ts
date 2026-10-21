import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

type ImportRecord = Record<string, unknown>;
const root = document.getElementById('admin-root') as HTMLElement | null;
const supabaseUrl = root?.dataset.supabaseUrl || '';
const supabaseAnonKey = root?.dataset.supabaseAnonKey || '';
const configNotice = document.getElementById('config-notice');
const loginPanel = document.getElementById('login-panel');
const adminConsole = document.getElementById('admin-console');
const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
const recipeForm = document.getElementById('recipe-form') as HTMLFormElement | null;
const importFileInput = document.getElementById('import-file') as HTMLInputElement | null;
const importButton = document.getElementById('start-import') as HTMLButtonElement | null;
const cancelButton = document.getElementById('cancel-import') as HTMLButtonElement | null;
const importLog = document.getElementById('import-log') as HTMLPreElement | null;
let supabase: SupabaseClient | null = null;
let cancelRequested = false;

function showMessage(id: string, message: string, kind: 'success' | 'error') {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.className = `status-message show ${kind}`;
}

function clearMessage(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = '';
    element.className = 'status-message';
  }
}

function fieldValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value.trim() || '';
}

function linesToArray(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function safeSlug(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150);
}

function setAuthView(user: { email?: string; app_metadata?: Record<string, unknown> } | null) {
  const isAdmin = Boolean(user && user.app_metadata?.role === 'admin');
  loginPanel?.classList.toggle('hidden', isAdmin);
  adminConsole?.classList.toggle('hidden', !isAdmin);
  if (user && !isAdmin) {
    loginPanel?.classList.remove('hidden');
    adminConsole?.classList.add('hidden');
    showMessage('login-message', 'এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই। Supabase Auth-এ app_metadata.role = "admin" সেট করুন।', 'error');
  }
  const emailText = document.getElementById('session-email');
  if (emailText) emailText.textContent = user?.email ? `লগইন: ${user.email}` : '';
}

async function refreshStats() {
  if (!supabase) return;
  const [published, drafts] = await Promise.all([
    supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
  ]);
  const publishedCount = document.getElementById('published-count');
  const draftCount = document.getElementById('draft-count');
  if (publishedCount) publishedCount.textContent = published.error ? '—' : String(published.count ?? 0);
  if (draftCount) draftCount.textContent = drafts.error ? '—' : String(drafts.count ?? 0);
}

async function loadRecipeList() {
  const list = document.getElementById('recipe-list');
  if (!list || !supabase) return;
  list.replaceChildren();
  const loading = document.createElement('p');
  loading.className = 'site-note'; loading.textContent = 'রেসিপি লোড হচ্ছে…'; list.append(loading);
  const { data, error } = await supabase.from('recipes').select('id,title_bn,slug,status,cuisine,updated_at').order('updated_at', { ascending: false }).limit(100);
  list.replaceChildren();
  if (error) {
    const message = document.createElement('p'); message.className = 'site-note'; message.textContent = `রেসিপি লোড করা যায়নি: ${error.message}`; list.append(message); return;
  }
  if (!data?.length) {
    const empty = document.createElement('p'); empty.className = 'site-note'; empty.textContent = 'এখনো কোনো রেসিপি নেই। নতুন রেসিপি যোগ করুন অথবা CSV/JSON ইমপোর্ট করুন।'; list.append(empty); return;
  }
  for (const item of data) {
    const row = document.createElement('div'); row.className = 'recipe-admin-row';
    const info = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = item.title_bn || '(নাম নেই)';
    const status = document.createElement('span'); status.className = `status-chip ${item.status === 'published' ? 'published' : ''}`; status.textContent = item.status === 'published' ? 'প্রকাশিত' : 'খসড়া'; title.append(status);
    const meta = document.createElement('small'); meta.textContent = `/${item.slug}/ · ${item.cuisine || 'ধরন নেই'} · ${item.updated_at ? new Date(item.updated_at).toLocaleDateString('bn-BD') : ''}`;
    info.append(title, meta);
    const actions = document.createElement('div'); actions.className = 'recipe-admin-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'mini-action'; edit.textContent = 'এডিট'; edit.addEventListener('click', () => { void editRecipe(String(item.id)); });
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'mini-action'; toggle.textContent = item.status === 'published' ? 'খসড়া করুন' : 'প্রকাশ করুন'; toggle.addEventListener('click', () => { void toggleRecipeStatus(String(item.id), item.status === 'published' ? 'draft' : 'published'); });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'mini-action danger'; remove.textContent = 'মুছুন'; remove.addEventListener('click', () => { void deleteRecipe(String(item.id), String(item.title_bn || 'এই রেসিপি')); });
    actions.append(edit, toggle, remove); row.append(info, actions); list.append(row);
  }
}

async function editRecipe(id: string) {
  if (!supabase) return;
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
  if (error || !data) return showMessage('library-message', `রেসিপি খোলা যায়নি: ${error?.message || 'রেকর্ড পাওয়া যায়নি'}`, 'error');
  const value = data as Record<string, unknown>;
  const put = (field: string, val: unknown) => { const element = document.getElementById(field) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null; if (element) element.value = val == null ? '' : String(val); };
  put('editing_id', value.id); put('editing_status', value.status || 'draft'); put('title_bn', value.title_bn); put('title_en', value.title_en); put('slug', value.slug);
  put('description_bn', value.description_bn); put('cuisine', value.cuisine || 'বাংলাদেশি'); put('category', value.category); put('image_url', value.image_url);
  put('prep_time_minutes', value.prep_time_minutes ?? 0); put('cook_time_minutes', value.cook_time_minutes ?? 0); put('servings', value.servings ?? 1); put('difficulty', value.difficulty || 'সহজ');
  const toLines = (items: unknown) => Array.isArray(items) ? items.map((item) => { if (typeof item === 'string') return item; if (item && typeof item === 'object') { const value = item as Record<string, unknown>; return [value.quantity, value.name ?? value.text].filter(Boolean).join(' '); } return String(item); }).join('\n') : '';
  put('ingredients', toLines(value.ingredients)); put('instructions', toLines(value.instructions)); put('license_name', value.license_name); put('source_url', value.source_url); put('license_url', value.license_url); put('attribution', value.attribution);
  slugManuallyEdited = true;
  const submit = recipeForm?.querySelector('button[type="submit"]'); if (submit) submit.textContent = 'পরিবর্তন সংরক্ষণ করুন ↗';
  showMessage('recipe-message', 'এডিট মোড: পরিবর্তন করে সংরক্ষণ করুন।', 'success');
  document.getElementById('add-recipe')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function toggleRecipeStatus(id: string, status: 'draft' | 'published') {
  if (!supabase) return;
  const { error } = await supabase.from('recipes').update({ status }).eq('id', id);
  if (error) showMessage('library-message', `স্ট্যাটাস পরিবর্তন হয়নি: ${error.message}`, 'error');
  else { showMessage('library-message', status === 'published' ? 'রেসিপি প্রকাশিত হয়েছে।' : 'রেসিপি খসড়া করা হয়েছে।', 'success'); await refreshStats(); await loadRecipeList(); }
}

async function deleteRecipe(id: string, title: string) {
  if (!supabase || !window.confirm(`“${title}” মুছে ফেলবেন? এই কাজটি ফিরিয়ে আনা যাবে না।`)) return;
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) showMessage('library-message', `মুছতে সমস্যা: ${error.message}`, 'error');
  else { showMessage('library-message', 'রেসিপি মুছে ফেলা হয়েছে।', 'success'); await refreshStats(); await loadRecipeList(); }
}

function parseMaybeArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const result: unknown = JSON.parse(trimmed);
      if (Array.isArray(result)) return result;
    } catch { /* Interpret malformed JSON as simple delimited text below. */ }
  }
  return trimmed.split('|').map((item) => item.trim()).filter(Boolean);
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.min(Math.floor(number), 10080) : null;
}

function normalizeRecord(input: ImportRecord, index: number, publish: boolean): ImportRecord {
  const titleBn = String(input.title_bn ?? input.title ?? input.name_bn ?? '').trim();
  const titleEn = String(input.title_en ?? input.name_en ?? '').trim();
  const slug = String(input.slug || safeSlug(titleEn)).trim();
  const licenseName = String(input.license_name ?? input.license ?? '').trim();
  return {
    title_bn: titleBn,
    title_en: titleEn || null,
    slug,
    description_bn: String(input.description_bn ?? input.description ?? '').trim() || null,
    ingredients: parseMaybeArray(input.ingredients),
    instructions: parseMaybeArray(input.instructions ?? input.steps),
    prep_time_minutes: numberOrNull(input.prep_time_minutes ?? input.prep_time),
    cook_time_minutes: numberOrNull(input.cook_time_minutes ?? input.cook_time),
    servings: numberOrNull(input.servings),
    difficulty: String(input.difficulty ?? 'সহজ').trim() || 'সহজ',
    cuisine: String(input.cuisine ?? '').trim() || null,
    category: String(input.category ?? '').trim() || null,
    image_url: String(input.image_url ?? '').trim() || null,
    source_url: String(input.source_url ?? '').trim() || null,
    license_name: licenseName,
    license_url: String(input.license_url ?? '').trim() || null,
    attribution: String(input.attribution ?? '').trim() || null,
    status: publish ? 'published' : 'draft',
  };
}

async function getRowsFromFile(file: File): Promise<ImportRecord[]> {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.json')) {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as ImportRecord[];
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { recipes?: unknown }).recipes)) return (parsed as { recipes: ImportRecord[] }).recipes;
    throw new Error('JSON ফাইলে একটি array অথবা { "recipes": [...] } অবজেক্ট থাকতে হবে।');
  }
  return new Promise((resolve, reject) => {
    Papa.parse<ImportRecord>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, ''),
      complete: (result) => {
        if (result.errors.length) reject(new Error(`CSV পড়তে সমস্যা: ${result.errors.slice(0, 3).map((e) => e.message).join('; ')}`));
        else resolve(result.data);
      },
      error: (error: Error) => reject(error),
    });
  });
}

function appendLog(message: string) {
  if (!importLog) return;
  importLog.classList.remove('hidden');
  importLog.textContent += `${new Date().toLocaleTimeString()} — ${message}\n`;
  importLog.scrollTop = importLog.scrollHeight;
}

if (!supabaseUrl || !supabaseAnonKey) {
  if (configNotice) configNotice.textContent = 'Supabase সংযোগের সেটিংস এখনো যোগ করা হয়নি। README-তে বলা মতো .dev.vars ও Supabase SQL সেটআপ করুন; সাইটের ডেমো পেজ দেখা যাবে, তবে অ্যাডমিন লগইন কাজ করবে না।';
} else {
  configNotice?.classList.add('hidden');
  supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  void supabase.auth.getSession().then(async ({ data }: { data: any }) => {
    const user = data.session?.user ?? null;
    setAuthView(user);
    if (user?.app_metadata?.role === 'admin') { await refreshStats(); await loadRecipeList(); }
  });
  supabase.auth.onAuthStateChange((_event: string, session: any) => {
    setAuthView(session?.user ?? null);
    if (session?.user?.app_metadata?.role === 'admin') { void refreshStats(); void loadRecipeList(); }
  });
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage('login-message');
  if (!supabase) return showMessage('login-message', 'Supabase সেটিংস যোগ করা হয়নি।', 'error');
  const email = fieldValue('admin-email');
  const password = fieldValue('admin-password');
  const button = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;
  if (button) button.disabled = true;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (button) button.disabled = false;
  if (error) return showMessage('login-message', `লগইন ব্যর্থ: ${error.message}`, 'error');
  if (data.user?.app_metadata?.role !== 'admin') {
    await supabase.auth.signOut();
    return showMessage('login-message', 'এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।', 'error');
  }
  showMessage('login-message', 'সফলভাবে লগইন হয়েছে।', 'success');
  await refreshStats();
});

document.getElementById('sign-out')?.addEventListener('click', async () => {
  await supabase?.auth.signOut();
  setAuthView(null);
});

const titleBnField = document.getElementById('title_bn') as HTMLInputElement | null;
const titleEnField = document.getElementById('title_en') as HTMLInputElement | null;
const slugField = document.getElementById('slug') as HTMLInputElement | null;
let slugManuallyEdited = false;
slugField?.addEventListener('input', () => { slugManuallyEdited = true; });
titleEnField?.addEventListener('input', () => {
  if (slugField && !slugManuallyEdited) slugField.value = safeSlug(titleEnField.value);
});
titleBnField?.addEventListener('input', () => {
  if (slugField && !slugField.value && !titleEnField?.value) slugField.value = safeSlug(titleBnField.value);
});

recipeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage('recipe-message');
  if (!supabase) return showMessage('recipe-message', 'Supabase সংযোগ করা নেই।', 'error');
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user || user.app_metadata?.role !== 'admin') return showMessage('recipe-message', 'এই কাজের জন্য অ্যাডমিন লগইন দরকার।', 'error');
  const ingredients = linesToArray(fieldValue('ingredients'));
  const instructions = linesToArray(fieldValue('instructions'));
  if (!ingredients.length || !instructions.length) return showMessage('recipe-message', 'উপকরণ ও রান্নার ধাপ যোগ করুন।', 'error');
  const record = normalizeRecord({
    title_bn: fieldValue('title_bn'), title_en: fieldValue('title_en'), slug: fieldValue('slug'), description_bn: fieldValue('description_bn'),
    ingredients, instructions, cuisine: fieldValue('cuisine'), category: fieldValue('category'), image_url: fieldValue('image_url'),
    prep_time_minutes: fieldValue('prep_time_minutes'), cook_time_minutes: fieldValue('cook_time_minutes'), servings: fieldValue('servings'),
    difficulty: fieldValue('difficulty'), license_name: fieldValue('license_name'), source_url: fieldValue('source_url'), license_url: fieldValue('license_url'), attribution: fieldValue('attribution'),
  }, 0, false);
  const button = recipeForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;
  if (button) button.disabled = true;
  const editingId = fieldValue('editing_id');
  const currentStatus = fieldValue('editing_status') === 'published' ? 'published' : 'draft';
  record.status = editingId ? currentStatus : 'draft';
  const result = editingId
    ? await supabase.from('recipes').update(record).eq('id', editingId)
    : await supabase.from('recipes').insert(record);
  if (button) button.disabled = false;
  if (result.error) return showMessage('recipe-message', `সংরক্ষণ ব্যর্থ: ${result.error.message}`, 'error');
  showMessage('recipe-message', editingId ? 'রেসিপির পরিবর্তন সংরক্ষণ হয়েছে।' : 'রেসিপি খসড়া হিসেবে সংরক্ষণ হয়েছে।', 'success');
  recipeForm.reset();
  const editingIdField = document.getElementById('editing_id') as HTMLInputElement | null; if (editingIdField) editingIdField.value = '';
  const editingStatusField = document.getElementById('editing_status') as HTMLInputElement | null; if (editingStatusField) editingStatusField.value = 'draft';
  if (button) button.textContent = 'খসড়া সংরক্ষণ করুন ↗';
  slugManuallyEdited = false;
  await refreshStats(); await loadRecipeList();
});

document.getElementById('refresh-recipes')?.addEventListener('click', () => { void refreshStats(); void loadRecipeList(); });
recipeForm?.addEventListener('reset', () => { window.setTimeout(() => { const id = document.getElementById('editing_id') as HTMLInputElement | null; const status = document.getElementById('editing_status') as HTMLInputElement | null; if (id) id.value = ''; if (status) status.value = 'draft'; slugManuallyEdited = false; const button = recipeForm?.querySelector('button[type="submit"]'); if (button) button.textContent = 'খসড়া সংরক্ষণ করুন ↗'; clearMessage('recipe-message'); }, 0); });

let importBusy = false;
cancelButton?.addEventListener('click', () => { cancelRequested = true; appendLog('বর্তমান ব্যাচ শেষ হলে ইমপোর্ট থামানো হবে।'); });
importButton?.addEventListener('click', async () => {
  clearMessage('import-message');
  if (importBusy) return;
  if (!supabase) return showMessage('import-message', 'Supabase সংযোগ করা নেই।', 'error');
  const file = importFileInput?.files?.[0];
  if (!file) return showMessage('import-message', 'প্রথমে একটি CSV বা JSON ফাইল নির্বাচন করুন।', 'error');
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session || session.user.app_metadata?.role !== 'admin') return showMessage('import-message', 'বাল্ক ইমপোর্টের জন্য অ্যাডমিন লগইন দরকার।', 'error');
  importBusy = true; cancelRequested = false;
  importButton.disabled = true; if (cancelButton) cancelButton.disabled = false;
  if (importLog) importLog.textContent = '';
  try {
    const rows = await getRowsFromFile(file);
    if (!rows.length) throw new Error('ফাইলটিতে কোনো রেসিপি পাওয়া যায়নি।');
    const publish = Boolean((document.getElementById('publish-after-import') as HTMLInputElement | null)?.checked);
    const normalized = rows.map((row, index) => normalizeRecord(row, index, publish));
    const errors: string[] = [];
    const seenSlugs = new Set<string>();
    normalized.forEach((row, index) => {
      if (!row.title_bn) errors.push(`সারি ${index + 2}: title_bn আবশ্যক`);
      if (!row.slug || !/^[a-z0-9-]{2,150}$/.test(String(row.slug))) errors.push(`সারি ${index + 2}: অনন্য slug আবশ্যক; ইংরেজি lowercase, সংখ্যা ও হাইফেন ব্যবহার করুন`);
      else if (seenSlugs.has(String(row.slug))) errors.push(`সারি ${index + 2}: ফাইলের মধ্যে একই slug একাধিকবার আছে: ${String(row.slug)}`);
      else seenSlugs.add(String(row.slug));
      if (!String(row.license_name || '').trim()) errors.push(`সারি ${index + 2}: license_name আবশ্যক`);
      if (String(row.license_name || '').toLowerCase().includes('confirm rights before publishing')) errors.push(`সারি ${index + 2}: sample placeholder license বদলান`);
      if (!Array.isArray(row.ingredients) || !row.ingredients.length) errors.push(`সারি ${index + 2}: ingredients ফাঁকা`);
      if (!Array.isArray(row.instructions) || !row.instructions.length) errors.push(`সারি ${index + 2}: instructions ফাঁকা`);
      if (index >= 100000) errors.push('ফাইলের রেসিপি সংখ্যা ১০০,০০০-এর বেশি; একাধিক ফাইলে ভাগ করুন');
    });
    if (errors.length) throw new Error(`ইমপোর্টের আগে ${errors.length}টি সমস্যা ঠিক করুন। প্রথম কয়েকটি:\n${errors.slice(0, 8).join('\n')}`);
    appendLog(`মোট ${normalized.length}টি রেসিপি প্রস্তুত। ব্যাচ আকার: ৫০।`);
    let completed = 0;
    for (let i = 0; i < normalized.length; i += 50) {
      if (cancelRequested) break;
      const batch = normalized.slice(i, i + 50);
      const response = await fetch('/api/admin/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ recipes: batch, publish }),
      });
      const result = await response.json().catch(() => ({})) as { imported?: number; error?: string; details?: string };
      if (!response.ok) throw new Error(result.error || result.details || `Batch ${Math.floor(i / 50) + 1} ব্যর্থ (HTTP ${response.status})`);
      completed += Number(result.imported ?? batch.length);
      appendLog(`ব্যাচ ${Math.floor(i / 50) + 1}: ${completed}/${normalized.length}টি সংরক্ষিত`);
    }
    if (cancelRequested) showMessage('import-message', `ইমপোর্ট থামানো হয়েছে। ${completed}টি রেসিপি সংরক্ষিত হয়েছে; বাকিগুলো পরে আবার ইমপোর্ট করুন।`, 'success');
    else showMessage('import-message', `সফল! ${completed}টি রেসিপি ${publish ? 'প্রকাশিত' : 'খসড়া হিসেবে'} ইমপোর্ট হয়েছে।`, 'success');
    await refreshStats();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'অজানা একটি সমস্যা হয়েছে।';
    appendLog(`ত্রুটি: ${message}`);
    showMessage('import-message', message, 'error');
  } finally {
    importBusy = false; importButton.disabled = false; if (cancelButton) cancelButton.disabled = true;
  }
});

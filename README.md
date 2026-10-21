# Rannaghor BD — বাংলা রেসিপি প্ল্যাটফর্ম

একটি কোডিং-ভিত্তিক রেসিপি ওয়েবসাইটের starter project: বাংলা হোমপেজ, রেসিপির তালিকা ও ডিটেইল পেজ, Supabase ডেটাবেস সংযোগ, লগইন-ভিত্তিক অ্যাডমিন UI, CSV/JSON bulk import, এবং মৌলিক SEO (`Recipe` JSON-LD, sitemap ও robots.txt)।

> **গুরুত্বপূর্ণ:** এটি প্রথম কার্যকর starter build, সম্পূর্ণভাবে deploy করা production site নয়। এতে মাত্র কয়েকটি UI demonstration recipe আছে, ১০,০০০টি লাইসেন্স যাচাইকৃত রেসিপি নেই। ছবির URL-গুলো design demo-র জন্য external image links। production launch-এর আগে এগুলো ও সব sample recipe বদলাতে/অনুমতি যাচাই করতে হবে।

## প্রযুক্তি

- Astro SSR + TypeScript
- Cloudflare Workers adapter
- Supabase Postgres + Supabase Auth
- GitHub-এ source control
- Vanilla CSS responsive design (প্রাথমিক ভার্সনে অতিরিক্ত UI framework দরকার নেই)

Cloudflare adapter ও বর্তমান Astro deployment guide অনুযায়ী Workers-এ server-rendered routes deploy করা যায়। Supabase free tier দিয়ে prototype শুরু করা যায়, তবে free project pause, database/storage/egress quota এবং production backup সীমা বিবেচনা করতে হবে।

## ১) লোকালি চালানো

প্রয়োজন: Node.js 22+, npm, একটি Supabase project।

```bash
npm install
cp .dev.vars.example .dev.vars
```

`.dev.vars` খুলে Supabase Dashboard → Project Settings/API থেকে URL, public anon/publishable key এবং server-only service role key বসাও। `SUPABASE_SERVICE_ROLE_KEY` কখনো frontend code-এ, `PUBLIC_` environment variable-এ বা GitHub-এ commit করবে না।

```bash
npm run dev
```

Astro local preview: `http://localhost:4321`

Supabase env না থাকলে public page demo mode-এ কিছু sample recipe দেখায়; admin কাজ করবে না।

## ২) Supabase ডেটাবেস তৈরি

1. Supabase-এ project তৈরি করো।
2. Dashboard → SQL Editor খুলে `supabase/schema.sql`-এর সম্পূর্ণ SQL চালাও।
3. Authentication → Users থেকে নিজের admin user তৈরি করো।
4. ওই user-এর **server-managed `app_metadata`**-তে `role: "admin"` সেট করো। Dashboard-এ raw app metadata সম্পাদনার সুযোগ থাকলে সেখানে এই claim যোগ করো; অন্যথায় trusted server/Supabase Admin API দিয়ে সেট করো। `user_metadata` ব্যবহার করো না—সেটি user নিজে পরিবর্তন করতে পারে।
5. claim আপডেটের পর লগআউট করে আবার লগইন করো, যেন নতুন JWT আসে।

Public visitors শুধুমাত্র `status = 'published'` রেসিপি দেখতে পারবে। Admin policy `app_metadata.role = admin` দাবি করে। Service-role key শুধু server-side import endpoint-এ ব্যবহার হয়।

## ৩) Bulk import

Admin পেজ: `/admin/`

CSV template: `/sample-data/recipes-template.csv`
JSON template: `/sample-data/recipes-template.json`

সমর্থিত fields:

- Required: `title_bn`, `slug`, `ingredients`, `instructions`, `license_name`
- Optional: `title_en`, `description_bn`, `prep_time_minutes`, `cook_time_minutes`, `servings`, `difficulty`, `cuisine`, `category`, `image_url`, `source_url`, `license_url`, `attribution`
- `ingredients` ও `instructions` হবে JSON arrays অথবা `|` দিয়ে পৃথক করা text। CSV-তে comma আছে এমন content লিখলে সেটি quotes-এর মধ্যে রাখতে হবে।
- `slug` unique হতে হবে; ইংরেজি lowercase a-z, number ও hyphen ব্যবহার করো। একই file-এ duplicate slug হলে import শুরু হবে না; ডেটাবেসে আগে থেকে slug থাকলে importer upsert করে সেটি update করবে।
- Import ৫০টি record করে server-এ পাঠায়; ভুল slug, খালি ingredients/instructions বা খালি license name থাকলে import শুরু হওয়ার আগেই সমস্যা দেখায়। Server প্রতিটি batch-এ auth, admin role, slug, URLs এবং required data যাচাই করে।
- Default: **draft**। Publish-on-import checkbox কেবল আগে যাচাই করা কনটেন্টের জন্য ব্যবহার করো। লাইসেন্সের নাম লেখা মানেই স্বয়ংক্রিয়ভাবে বৈধ অধিকার নিশ্চিত হয়ে যায় না।

এই importer ১০,০০০+ record-কে batch আকারে প্রক্রিয়া করার জন্য বানানো, কিন্তু source dataset সংগ্রহ, translation/review, ছবি, এবং লাইসেন্স যাচাই স্বয়ংক্রিয়ভাবে সমাধান করে না। প্রথমে ছোট batch দিয়ে পরীক্ষা করো।

## ৪) Production deployment — Cloudflare Workers

1. GitHub-এ `rannaghor-bd` নামে repository তৈরি করে এই project-এর files push করো।
2. Cloudflare account-এ Workers & Pages → Create → Connect to Git repository অথবা local CLI deployment ব্যবহার করো।
3. Cloudflare Worker-এর Settings → Variables and Secrets-এ নিচের server-side bindings যোগ করো:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Secret)
   - `SITE_URL` (যেমন তোমার বাস্তব domain; trailing slash ছাড়া)
4. Local CLI দিয়ে deploy করতে Cloudflare login-এর পর:

```bash
npm run build
npx wrangler deploy
```

5. Worker-এর `SITE_URL`-এ প্রকৃত domain সঠিকভাবে বসাও। সেটি canonical URL, sitemap ও robots.txt-এ ব্যবহৃত হয়। ডিফল্ট `rannaghorbd.example` placeholder production-এ রেখো না।
6. Custom domain, HTTPS, production secrets এবং access control যাচাই করো। Google Search Console-এ site verify করে `/sitemap.xml` submit করো।

Cloudflare adapter version, Astro version ও Workers build behavior দ্রুত বদলাতে পারে; deploy-এর সময় official docs ও build output মিলিয়ে version compatibility যাচাই করো।

## ৫) GitHub-এ push করার সহজ পদ্ধতি

GitHub connector-এ বর্তমানে কোনো repository দৃশ্যমান ছিল না। GitHub-এর web interface-এ একটি empty repository তৈরি করো (`README`, `.gitignore` বা license initialize না করাই সুবিধাজনক, কারণ এগুলো project-এ আছে), এরপর এই folder-এ চালাও:

```bash
git init
git add .
git commit -m "Initial Rannaghor BD recipe platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rannaghor-bd.git
git push -u origin main
```

`YOUR_USERNAME`-এর জায়গায় নিজের GitHub username বসাও। `.dev.vars` ও private keys কখনো push করবে না।

## ৬) SEO launch checklist

- Real domain `BaseLayout.astro`-এ বসাও; placeholder canonical URL প্রকাশ কোরো না।
- প্রতিটি recipe-র title, description, unique slug, usable image ও accurate `Recipe` JSON-LD যাচাই করো।
- Original/authorized images ব্যবহার করো; meaningful Bengali `alt` text দাও।
- `sitemap.xml` এবং `robots.txt` production URL-এ যাচাই করো।
- Google Search Console-এ sitemap submit করো; structured data valid হলেও rich result দেখানোর নিশ্চয়তা নেই।
- thin/duplicate/AI-generated unchecked recipe mass-publish কোরো না; editorial review চালাও।

## ৭) পরের development steps

- Edit/delete/publish queue ও audit log
- Ingredient-based search এবং pagination
- Image storage + upload permissions
- Bulk import preview, per-row error report ও resumable jobs
- Search indexes, server-side pagination ও cache strategy
- Backups, admin MFA, abuse protection, analytics এবং privacy/terms pages

## Build যাচাইয়ের অবস্থা

এই environment-এ TypeScript source syntax/type checks (external packages-এর stub declarations দিয়ে), CSS parse এবং JSON/CSV configuration checks সফল হয়েছে। তবে npm registry-তে DNS/network error (`EAI_AGAIN`) হওয়ায় এখানে dependency install ও পূর্ণ Astro production build চালানো যায়নি। Network access-সহ পরিবেশে `npm install` এবং `npm run build` চালিয়ে final verification করতে হবে।

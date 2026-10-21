export type RecipeStep = string | { title?: string; text: string };

export type Recipe = {
  id?: string;
  title_bn: string;
  title_en?: string | null;
  slug: string;
  description_bn?: string | null;
  ingredients: Array<string | { name: string; quantity?: string }>;
  instructions: RecipeStep[];
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  servings?: number | null;
  difficulty?: 'সহজ' | 'মাঝারি' | 'কঠিন' | string | null;
  cuisine?: string | null;
  category?: string | null;
  image_url?: string | null;
  source_url?: string | null;
  license_name?: string | null;
  license_url?: string | null;
  attribution?: string | null;
  status?: 'draft' | 'published';
  created_at?: string;
};

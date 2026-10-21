import type { Recipe } from './types';

// These clearly labelled sample entries demonstrate the layout only; replace with reviewed content.
export const demoRecipes: Recipe[] = [
  {
    title_bn: 'ঘরোয়া মুরগির ভুনা', title_en: 'Homestyle Chicken Bhuna', slug: 'homestyle-chicken-bhuna',
    description_bn: 'পেঁয়াজ, আদা, রসুন আর পরিচিত মসলায় তৈরি ঘরোয়া স্বাদের মুরগির ভুনা।',
    ingredients: ['মুরগি ৭৫০ গ্রাম', 'পেঁয়াজ কুচি ২ কাপ', 'আদা-রসুন বাটা ২ টেবিল চামচ', 'হলুদ ও মরিচ গুঁড়া স্বাদমতো', 'তেল ৪ টেবিল চামচ'],
    instructions: ['মুরগি ধুয়ে হলুদ, মরিচ ও লবণ মাখিয়ে ১৫ মিনিট রাখুন।', 'কড়াইয়ে তেল গরম করে পেঁয়াজ সোনালি হওয়া পর্যন্ত ভাজুন।', 'আদা-রসুন ও মসলা দিয়ে কষিয়ে মুরগি যোগ করুন।', 'ঢেকে অল্প আঁচে রান্না করুন; প্রয়োজনে সামান্য পানি দিন।', 'মাংস সেদ্ধ ও ঝোল মাখা হলে নামিয়ে পরিবেশন করুন।'],
    prep_time_minutes: 15, cook_time_minutes: 35, servings: 4, difficulty: 'সহজ', cuisine: 'বাংলাদেশি', category: 'মুরগির রান্না',
    image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1000&q=85',
    license_name: 'Demo content for UI preview — replace before production', status: 'published'
  },
  {
    title_bn: 'কাচ্চি বিরিয়ানির অনুপ্রেরণা', title_en: 'Kacchi Biryani Inspiration', slug: 'kacchi-biryani-inspiration',
    description_bn: 'সুগন্ধি চাল, মসলা ও আলুর পরিচিত স্বাদের একটি নমুনা রেসিপি পেজ।',
    ingredients: ['বাসমতি চাল ৩ কাপ', 'মাংস ৭৫০ গ্রাম', 'আলু ২টি', 'দই ১ কাপ', 'বিরিয়ানি মসলা ও ঘি পরিমাণমতো'],
    instructions: ['মাংস দই ও মসলায় মাখিয়ে রাখুন।', 'চাল আধা সেদ্ধ করে পানি ঝরিয়ে নিন।', 'স্তরে স্তরে মাংস, আলু ও চাল সাজান।', 'ঢেকে কম আঁচে রান্না করুন, মাংস সম্পূর্ণ সেদ্ধ হয়েছে নিশ্চিত করুন।'],
    prep_time_minutes: 30, cook_time_minutes: 75, servings: 5, difficulty: 'মাঝারি', cuisine: 'বাংলাদেশি', category: 'ভাত ও বিরিয়ানি',
    image_url: 'https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=1000&q=85',
    license_name: 'Demo content for UI preview — replace before production', status: 'published'
  },
  {
    title_bn: 'মসুর ডালের আরামদায়ক স্যুপ', title_en: 'Red Lentil Soup', slug: 'red-lentil-soup',
    description_bn: 'কম উপকরণে তৈরি উষ্ণ ও সহজ ডালের স্যুপ।',
    ingredients: ['মসুর ডাল ১ কাপ', 'পেঁয়াজ ১টি', 'রসুন ২ কোয়া', 'জিরা আধা চা চামচ', 'লবণ ও লেবু স্বাদমতো'],
    instructions: ['ডাল ধুয়ে পেঁয়াজ, রসুন ও পানি দিয়ে সেদ্ধ করুন।', 'ডাল নরম হলে লবণ ও জিরা দিন।', 'ঘনত্ব ঠিক করে লেবুর রস দিয়ে পরিবেশন করুন।'],
    prep_time_minutes: 10, cook_time_minutes: 25, servings: 3, difficulty: 'সহজ', cuisine: 'আন্তর্জাতিক', category: 'স্যুপ',
    image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=85',
    license_name: 'Demo content for UI preview — replace before production', status: 'published'
  },
  {
    title_bn: 'সবজি পনির কারি', title_en: 'Vegetable Paneer Curry', slug: 'vegetable-paneer-curry',
    description_bn: 'পনির, টমেটো ও সবজি দিয়ে তৈরি রঙিন ভারতীয় ধাঁচের তরকারি।',
    ingredients: ['পনির ২০০ গ্রাম', 'মিক্সড সবজি ২ কাপ', 'টমেটো ২টি', 'পেঁয়াজ ১টি', 'জিরা ও গরম মসলা পরিমাণমতো'],
    instructions: ['পেঁয়াজ ও জিরা হালকা ভেজে টমেটো দিন।', 'মসলা ও সবজি দিয়ে অল্প পানি যোগ করুন।', 'সবজি নরম হলে পনির যোগ করে কয়েক মিনিট রান্না করুন।'],
    prep_time_minutes: 15, cook_time_minutes: 25, servings: 3, difficulty: 'সহজ', cuisine: 'ভারতীয়', category: 'নিরামিষ',
    image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=85',
    license_name: 'Demo content for UI preview — replace before production', status: 'published'
  }
];

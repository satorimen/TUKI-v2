/**
 * Taxonomy of home repair / construction work categories.
 *
 * Used by:
 * - AI parsing (maps free text to a canonical category id)
 * - Master onboarding (master picks specializations)  [M3]
 * - Task matching (task category ↔ master specialization) [M4]
 *
 * Keep ids stable — they are stored in the DB and in AI JSON output.
 */

export const CATEGORY_IDS = [
  'painting',
  'plastering',
  'plumbing',
  'electrical',
  'tiling',
  'drywall',
  'carpentry',
  'full_renovation',
  'appliance_repair',
  'hvac',
  'windows_doors',
  'roofing',
  'pest_control',
  'post_renovation_cleaning',
  'gardening',
  'flooring',
  'kitchen',
  'furniture_assembly',
  'metalwork',
  'aluminum',
  'demolition',
  'smart_home',
  'water_heating',
  'moving',
  'other',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: CategoryId;
  name: { he: string; ru: string; en: string };
  /** Emoji icon for quick visual scanning in feeds */
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: 'painting', icon: '🎨', name: { he: 'צביעה', ru: 'Покраска', en: 'Painting' } },
  { id: 'plastering', icon: '🧱', name: { he: 'טיח ואיטום', ru: 'Штукатурка и шпаклёвка', en: 'Plastering' } },
  { id: 'plumbing', icon: '🚰', name: { he: 'אינסטלציה', ru: 'Сантехника', en: 'Plumbing' } },
  { id: 'electrical', icon: '💡', name: { he: 'חשמל', ru: 'Электрика', en: 'Electrical' } },
  { id: 'tiling', icon: '🚿', name: { he: 'ריצוף ואריחים', ru: 'Плиточные работы', en: 'Tiling & Flooring' } },
  { id: 'drywall', icon: '🏗', name: { he: 'גבס', ru: 'Гипсокартон', en: 'Drywall' } },
  { id: 'carpentry', icon: '🪚', name: { he: 'נגרות', ru: 'Столярные работы', en: 'Carpentry' } },
  { id: 'full_renovation', icon: '🏚', name: { he: 'שיפוץ מלא', ru: 'Полный ремонт', en: 'Full renovation' } },
  { id: 'appliance_repair', icon: '🔌', name: { he: 'תיקון מכשירי חשמל', ru: 'Ремонт бытовой техники', en: 'Appliance repair' } },
  { id: 'hvac', icon: '❄️', name: { he: 'מזגנים ואוורור', ru: 'Кондиционеры и вентиляция', en: 'HVAC' } },
  { id: 'windows_doors', icon: '🚪', name: { he: 'חלונות ודלתות', ru: 'Окна и двери', en: 'Windows & Doors' } },
  { id: 'roofing', icon: '🏠', name: { he: 'גגות ואיטום', ru: 'Крыши и гидроизоляция', en: 'Roofing' } },
  { id: 'pest_control', icon: '🐜', name: { he: 'הדברה', ru: 'Дезинсекция', en: 'Pest control' } },
  { id: 'post_renovation_cleaning', icon: '🧹', name: { he: 'ניקיון אחרי שיפוץ', ru: 'Уборка после ремонта', en: 'Post-renovation cleaning' } },
  { id: 'gardening', icon: '🌿', name: { he: 'גינון', ru: 'Садовые работы', en: 'Gardening' } },
  { id: 'flooring', icon: '🪵', name: { he: 'פרקט ולמינציה', ru: 'Паркет и ламинат', en: 'Parquet & Laminate' } },
  { id: 'kitchen', icon: '🍽', name: { he: 'מטבחים וארונות', ru: 'Кухни и шкафы', en: 'Kitchens & Cabinets' } },
  { id: 'furniture_assembly', icon: '🪑', name: { he: 'הרכבת רהיטים', ru: 'Сборка мебели', en: 'Furniture assembly' } },
  { id: 'metalwork', icon: '⚙️', name: { he: 'מסגרות וריתוך', ru: 'Металл и сварка', en: 'Metal & Welding' } },
  { id: 'aluminum', icon: '🪟', name: { he: 'אלומיניום וזיגוג', ru: 'Алюминий и остекление', en: 'Aluminum & Glazing' } },
  { id: 'demolition', icon: '🔨', name: { he: 'הריסה ופינוי', ru: 'Демонтаж', en: 'Demolition' } },
  { id: 'smart_home', icon: '📡', name: { he: 'בית חכם ותקשורת', ru: 'Умный дом и слаботочка', en: 'Smart home & Low-voltage' } },
  { id: 'water_heating', icon: '🔥', name: { he: 'דודי שמש ומים', ru: 'Бойлеры и водонагреватели', en: 'Boilers & Water heaters' } },
  { id: 'moving', icon: '📦', name: { he: 'הובלות ופינוי', ru: 'Переезды и вывоз', en: 'Moving & Hauling' } },
  { id: 'other', icon: '🔧', name: { he: 'אחר', ru: 'Другое', en: 'Other' } },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category | undefined {
  return CATEGORY_BY_ID.get(id as CategoryId);
}

export function categoryName(id: string, locale: string): string {
  const category = getCategory(id);
  if (!category) return id;
  return category.name[locale as keyof Category['name']] ?? category.name.en;
}

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

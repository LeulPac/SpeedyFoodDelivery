const MENU_CATEGORIES = [
  'Main Dish',
  'Drinks',
  'Dessert',
  'Appetizers',
  'Sides',
  'Snacks',
  'Other',
];

const normalizeCategory = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'Other';
  const match = MENU_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  return match || trimmed.slice(0, 50);
};

module.exports = { MENU_CATEGORIES, normalizeCategory };

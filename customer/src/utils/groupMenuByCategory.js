const CATEGORY_ORDER = [
  'Appetizers',
  'Main Dish',
  'Sides',
  'Drinks',
  'Dessert',
  'Snacks',
  'Other',
];

export function groupMenuByCategory(menu) {
  const groups = {};
  menu.forEach((item) => {
    const cat = item.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  const known = CATEGORY_ORDER.filter((c) => groups[c]?.length);
  const rest = Object.keys(groups)
    .filter((c) => !CATEGORY_ORDER.includes(c))
    .sort();

  return [...known, ...rest].map((category) => ({
    category,
    items: groups[category],
  }));
}

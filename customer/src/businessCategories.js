export const BUSINESS_CATEGORIES = {
  FOOD: 'Food & Restaurants',
  GROCERY: 'Grocery & Supermarkets',
  CLOTHING: 'Clothing & Shoes',
  ELECTRONICS: 'Electronics & Accessories',
  COSMETICS: 'Cosmetics & Beauty',
  RETAIL: 'Other Retail Businesses',
};

export const BUSINESS_CATEGORY_LIST = [
  { id: BUSINESS_CATEGORIES.FOOD, label: 'Food & Restaurants', icon: '🍽️', description: 'Restaurants, Cafes, Bakeries, Diners & Fast Food' },
  { id: BUSINESS_CATEGORIES.GROCERY, label: 'Grocery & Supermarkets', icon: '🛒', description: 'Fresh Produce, Supermarkets, Provisions & Pantry' },
  { id: BUSINESS_CATEGORIES.CLOTHING, label: 'Clothing & Shoes', icon: '👕', description: 'Fashion, Apparel, Footwear, Bags & Accessories' },
  { id: BUSINESS_CATEGORIES.ELECTRONICS, label: 'Electronics & Accessories', icon: '📱', description: 'Phones, Computers, Gadgets, Audio & Tech' },
  { id: BUSINESS_CATEGORIES.COSMETICS, label: 'Cosmetics & Beauty', icon: '💄', description: 'Skincare, Perfumes, Makeup & Personal Care' },
  { id: BUSINESS_CATEGORIES.RETAIL, label: 'Other Retail Businesses', icon: '🛍️', description: 'Home, Books, Gifts, Stationery & Specialty Stores' },
];

export const normalizeBusinessCategory = (type) => {
  if (!type) return BUSINESS_CATEGORIES.FOOD;
  const lower = String(type).trim().toLowerCase();
  if (lower.includes('food') || lower.includes('restaurant') || lower.includes('cafe') || lower.includes('hotel') || lower.includes('dining')) {
    return BUSINESS_CATEGORIES.FOOD;
  }
  if (lower.includes('groc') || lower.includes('supermarket') || lower.includes('market')) {
    return BUSINESS_CATEGORIES.GROCERY;
  }
  if (lower.includes('cloth') || lower.includes('shoe') || lower.includes('apparel') || lower.includes('fashion')) {
    return BUSINESS_CATEGORIES.CLOTHING;
  }
  if (lower.includes('elect') || lower.includes('gadget') || lower.includes('tech') || lower.includes('phone')) {
    return BUSINESS_CATEGORIES.ELECTRONICS;
  }
  if (lower.includes('cosmet') || lower.includes('beauty') || lower.includes('makeup') || lower.includes('skin')) {
    return BUSINESS_CATEGORIES.COSMETICS;
  }
  return BUSINESS_CATEGORIES.RETAIL;
};

export const CATEGORY_SUBCATEGORIES = {
  [BUSINESS_CATEGORIES.FOOD]: [
    'Main Dish',
    'Appetizers',
    'Sides',
    'Drinks & Beverages',
    'Dessert',
    'Breakfast',
    'Fast Food',
    'Combo Deals',
    'Other'
  ],
  [BUSINESS_CATEGORIES.GROCERY]: [
    'Fresh Produce',
    'Dairy & Eggs',
    'Bakery & Bread',
    'Meat & Seafood',
    'Beverages',
    'Snacks & Confectionery',
    'Pantry & Staples',
    'Canned & Packaged Foods',
    'Household & Cleaning',
    'Other Groceries'
  ],
  [BUSINESS_CATEGORIES.CLOTHING]: [
    "Men's Clothing",
    "Women's Clothing",
    "Kids & Baby",
    'Footwear & Shoes',
    'Bags & Luggage',
    'Watches & Jewelry',
    'Accessories',
    'Activewear & Sportswear',
    'Other Fashion'
  ],
  [BUSINESS_CATEGORIES.ELECTRONICS]: [
    'Smartphones & Tablets',
    'Laptops & Computers',
    'Audio & Headphones',
    'Cameras & Photography',
    'Gaming & Consoles',
    'Wearable Tech & Smartwatches',
    'Computer Accessories',
    'Home Appliances',
    'Cables & Chargers',
    'Other Electronics'
  ],
  [BUSINESS_CATEGORIES.COSMETICS]: [
    'Skincare',
    'Makeup & Cosmetics',
    'Haircare',
    'Fragrances & Perfumes',
    'Personal Hygiene',
    'Bath & Body',
    'Tools & Accessories',
    "Men's Grooming",
    'Other Beauty'
  ],
  [BUSINESS_CATEGORIES.RETAIL]: [
    'Home & Kitchen',
    'Stationery & Office Supplies',
    'Books & Magazines',
    'Toys & Games',
    'Sports & Outdoors',
    'Hardware & Tools',
    'Gifts & Crafts',
    'Pet Supplies',
    'General Retail'
  ]
};

export const GROCERY_UNITS = [
  'piece',
  'kg',
  'gram',
  'litre',
  'ml',
  'pack',
  'box',
  'bundle',
  'bottle',
  'can'
];

export const STANDARD_SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '3XL',
  'Free Size',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45'
];

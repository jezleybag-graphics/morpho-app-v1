export const BRAND_INFO = {
  name: 'Morpho Cafe',
  logo: 'https://image2url.com/r2/default/images/1768907574770-1b91e3b7-15ca-417d-b598-29816dfb0b7a.png',
};

export const CAFE_LOCATION = [15.7772789, 120.661612];

export const CATEGORIES = ['Coffee & Drinks', 'Meals & Snacks'];

export const ANNOUNCEMENT = {
  show: true,
  title: 'Grand Opening Promo!',
  message: "Get 10% OFF on all 'Featured' items this week. Order now!",
  image:
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600',
};

export const TIME_SLOTS = [
  'ASAP',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
  '9:30 PM',
  '10:00 PM',
];

export const MENU_ITEMS = [
  {
    id: 101,
    name: "Barista's Choice Latte",
    description: 'Our signature blend with secret spices.',
    price: 150,
    category: 'Coffee & Drinks',
    subcategory: 'Featured',
    variants: [
      { name: 'Hot', price: 150 },
      { name: 'Cold', price: 165 },
    ],
    image:
      'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=600',
    addOns: [{ name: 'Large', price: 20 }],
  },
  {
    id: 1,
    name: 'Caramel Macchiato',
    description: 'Espresso with vanilla syrup, milk, and caramel drizzle.',
    price: 120,
    category: 'Coffee & Drinks',
    subcategory: 'Coffee-based',
    variants: [
      { name: 'Hot', price: 120 },
      { name: 'Cold', price: 130 },
    ],
    image:
      'https://images.unsplash.com/photo-1579888071069-c107a6f79d82?auto=format&fit=crop&q=80&w=600',
    addOns: [
      { name: 'Large Size', price: 20 },
      {
        name: 'Syrup',
        price: 20,
        options: ['Vanilla', 'Hazelnut', 'Caramel', 'Matcha'],
      },
      { name: 'Milk Upgrade', price: 40, options: ['Oat', 'Almond'] },
      {
        name: 'Cold Foam',
        price: 30,
        options: ['Sea Salt', 'Matcha', 'Strawberry', 'Chocolate'],
      },
      { name: 'Extra Espresso Shot', price: 30 },
    ],
  },
  {
    id: 4,
    name: 'Iced Spanish Latte',
    description: 'Sweet and creamy espresso based drink.',
    price: 130,
    category: 'Coffee & Drinks',
    subcategory: 'Coffee-based',
    variants: [{ name: 'Cold', price: 130 }],
    image:
      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=600',
    addOns: [{ name: 'Large Size', price: 20 }],
  },
  {
    id: 5,
    name: 'Matcha Latte',
    description: 'Premium matcha with steamed milk.',
    price: 140,
    category: 'Coffee & Drinks',
    subcategory: 'Milk-based',
    variants: [
      { name: 'Hot', price: 140 },
      { name: 'Cold', price: 155 },
    ],
    image:
      'https://images.unsplash.com/photo-1515825838458-f2a94b20105a?auto=format&fit=crop&q=80&w=600',
    addOns: [{ name: 'Soy Milk', price: 20 }],
  },
  {
    id: 201,
    name: 'Ultimate Burger',
    description: 'Quarter pounder with everything on it.',
    price: 220,
    category: 'Meals & Snacks',
    subcategory: 'Featured',
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600',
    addOns: [
      { name: 'Extra Cheese', price: 20 },
      { name: 'Fries', price: 50 },
    ],
  },
  {
    id: 2,
    name: 'Beef Tapa Silog',
    description: 'Cured beef with garlic rice and fried egg.',
    price: 160,
    category: 'Meals & Snacks',
    subcategory: 'Breakfast',
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=600',
    addOns: [
      { name: 'Extra Egg', price: 20 },
      { name: 'Extra Rice', price: 30 },
    ],
  },
  {
    id: 3,
    name: 'Creamy Carbonara',
    description: 'Classic pasta with creamy white sauce and bacon bits.',
    price: 180,
    category: 'Meals & Snacks',
    subcategory: 'Pasta',
    image:
      'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&q=80&w=600',
    addOns: [
      { name: 'Extra Bacon', price: 40 },
      { name: 'Garlic Bread', price: 45 },
    ],
  },
  {
    id: 6,
    name: 'Clubhouse Sandwich',
    description: 'Triple decker sandwich with ham, egg, and cheese.',
    price: 150,
    category: 'Meals & Snacks',
    subcategory: 'Snacks',
    image:
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=600',
    addOns: [{ name: 'Extra Cheese', price: 15 }],
  },
];
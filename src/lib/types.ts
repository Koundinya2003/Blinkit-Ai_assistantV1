export type Category =
  | "Fruits & Vegetables"
  | "Dairy & Breakfast"
  | "Snacks"
  | "Beverages"
  | "Bakery"
  | "Household"
  | "Personal Care"
  | "Baby Care"
  | "Instant Food"
  | "Staples";

export type OrderStatus = "placed" | "packed" | "out_for_delivery" | "delivered" | "confirmed" | "cancelled";

export type PaymentMethod = "cod" | "upi" | "card" | "wallet";

export type AuthProvider = "google" | "email" | "anonymous";

// Product collection
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: Category;
  subcategory: string;
  unit: string;
  price: number;
  mrp: number;
  discount: number;
  stock: number;
  rating: number;
  reviewCount: number;
  reviews: number;
  deliveryMinutes: number;
  description: string;
  image: string;
  tags: string[];
  aiSignals: string[];
};

// Category collection
export type CategoryDoc = {
  id: string;
  name: Category;
  icon: string;
  description: string;
  productCount: number;
  image: string;
};

// Review collection
export type Review = {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  pros: string[];
  cons: string[];
  helpfulVotes: number;
  createdAt: Date;
};

// User collection
export type User = {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  provider: AuthProvider;
  addresses: UserAddress[];
  defaultAddressId: string | null;
  createdAt: Date;
  lastLoginAt: Date;
};

export type UserAddress = {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
};

// Cart collection (for authenticated users)
export type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
  updatedAt: Date;
};

export type CartItem = {
  productId: string;
  quantity: number;
  priceAtAdd: number;
  addedAt: Date;
};

// Wishlist collection
export type Wishlist = {
  id: string;
  userId: string;
  productIds: string[];
  updatedAt: Date;
};

// Order collection
export type Order = {
  id: string;
  userId: string;
  items: OrderItem[];
  pricing: OrderPricing;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  deliveryAddress: UserAddress;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt: Date | null;
};

export type OrderItem = {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type OrderPricing = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
};

// Legacy types (kept for backward compatibility)
export type CartLine = {
  productId: string;
  quantity: number;
};

export type BasketInsight = {
  title: string;
  body: string;
  confidence: number;
};

export type Recommendation = {
  product: Product;
  reason: string;
  score: number;
};
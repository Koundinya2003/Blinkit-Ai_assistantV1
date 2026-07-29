const CART_STORAGE_KEY = "blinkit_cart";

export interface LocalCartItem {
  productId: string;
  quantity: number;
  priceAtAdd: number;
}

export interface LocalCart {
  items: LocalCartItem[];
  updatedAt: Date;
}

export function getLocalCart(): LocalCart {
  if (typeof window === "undefined") {
    return { items: [], updatedAt: new Date() };
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return { items: [], updatedAt: new Date() };

    const parsed = JSON.parse(stored);
    return {
      items: parsed.items || [],
      updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date()
    };
  } catch (error) {
    console.error("Error reading local cart:", error);
    return { items: [], updatedAt: new Date() };
  }
}

export function saveLocalCart(cart: LocalCart): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("Error saving local cart:", error);
  }
}

export function addToLocalCart(productId: string, quantity: number = 1, priceAtAdd: number): LocalCart {
  const cart = getLocalCart();
  const existingIndex = cart.items.findIndex(item => item.productId === productId);

  if (existingIndex >= 0) {
    cart.items[existingIndex] = {
      ...cart.items[existingIndex],
      quantity: cart.items[existingIndex].quantity + quantity
    };
  } else {
    cart.items.push({
      productId,
      quantity,
      priceAtAdd
    });
  }

  cart.updatedAt = new Date();
  saveLocalCart(cart);
  return cart;
}

export function removeFromLocalCart(productId: string): LocalCart {
  const cart = getLocalCart();
  cart.items = cart.items.filter(item => item.productId !== productId);
  cart.updatedAt = new Date();
  saveLocalCart(cart);
  return cart;
}

export function updateLocalCartItemQuantity(productId: string, quantity: number): LocalCart {
  const cart = getLocalCart();

  if (quantity <= 0) {
    cart.items = cart.items.filter(item => item.productId !== productId);
  } else {
    cart.items = cart.items.map(item =>
      item.productId === productId ? { ...item, quantity } : item
    );
  }

  cart.updatedAt = new Date();
  saveLocalCart(cart);
  return cart;
}

export function clearLocalCart(): LocalCart {
  const cart: LocalCart = { items: [], updatedAt: new Date() };
  saveLocalCart(cart);
  return cart;
}

export function deleteLocalCart(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error("Error deleting local cart:", error);
  }
}

export function mergeLocalCartToFirestore(localCart: LocalCart): { productId: string; quantity: number; priceAtAdd: number }[] {
  return localCart.items.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
    priceAtAdd: item.priceAtAdd
  }));
}
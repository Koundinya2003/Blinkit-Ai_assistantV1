import type { Product, Recommendation, Category } from "./types";
import { getProductsWithFallback } from "./data-service";
import { getPersonalizedRecommendations } from "./ai-recommendations";
import { smartSearch } from "./ai-search";

export interface ShoppingList {
  id: string;
  name: string;
  description: string;
  items: ShoppingListItem[];
  totalEstimatedPrice: number;
  createdAt: Date;
}

export interface ShoppingListItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  category: Category;
  reason?: string;
}

export interface AssistantResponse {
  message: string;
  recommendations?: Recommendation[];
  shoppingList?: ShoppingList;
  products?: Product[];
  action?: "recommend" | "search" | "list" | "recipe" | "info";
  confidence: number;
}

export interface RecipeRequirements {
  recipeName: string;
  ingredients: Array<{
    name: string;
    quantity: string;
    unit: string;
  }>;
  missingIngredients: Array<{
    name: string;
    reason: string;
  }>;
  estimatedTotalPrice: number;
  matchedProducts: Array<{
    product: Product;
    requiredQuantity: number;
    matchedQuantity: number;
  }>;
}

/**
 * AI Shopping Assistant
 * Handles natural language queries and provides intelligent responses
 */
export class AIShoppingAssistant {
  private products: Product[] = [];

  async initialize() {
    this.products = await getProductsWithFallback();
  }

  /**
   * Process a natural language query
   */
  async processQuery(
    query: string,
    context?: {
      userId?: string;
      cartItems?: Array<{ productId: string; quantity: number }>;
      wishlistProductIds?: string[];
      orderHistory?: Array<{ productId: string; quantity: number; category: string }>;
    }
  ): Promise<AssistantResponse> {
    const lowerQuery = query.toLowerCase().trim();
    
    // Detect intent
    const intent = this.detectIntent(lowerQuery);
    
    switch (intent) {
      case "breakfast":
      case "meal":
      case "diet":
        return this.handleMealQuery(query);
      
      case "shopping_list":
        return this.handleShoppingListQuery(query);
      
      case "recipe":
        return this.handleRecipeQuery(query);
      
      case "search":
        return this.handleSearchQuery(query);
      
      case "recommend":
        return this.handleRecommendationQuery(query, context);
      
      case "info":
        return this.handleInfoQuery(query);
      
      default:
        return this.handleGeneralQuery(query, context);
    }
  }

  /**
   * Detect user intent from query
   */
  private detectIntent(query: string): string {
    // Shopping list patterns
    if (query.match(/(?:shopping\s+list|groceries|essentials|weekly\s+groceries)/)) {
      return "shopping_list";
    }

    // Recipe patterns
    if (query.match(/(?:recipe|ingredients?\s+for|make\s+|cook\s+)/)) {
      return "recipe";
    }

    // Meal/diet patterns
    if (query.match(/(?:breakfast|lunch|dinner|meal|diet|protein|healthy)/)) {
      return "meal";
    }

    // Search patterns
    if (query.match(/(?:find|search|show|looking\s+for|i\s+need|want)/)) {
      return "search";
    }

    // Recommendation patterns
    if (query.match(/(?:recommend|suggest|what\s+should|best|top)/)) {
      return "recommend";
    }

    // Info patterns
    if (query.match(/(?:what\s+is|tell\s+me\s+about|details|info)/)) {
      return "info";
    }

    return "general";
  }

  /**
   * Handle meal-related queries
   */
  private async handleMealQuery(
    query: string,
    context?: {
      cartItems?: Array<{ productId: string; quantity: number }>;
      wishlistProductIds?: string[];
      orderHistory?: Array<{ productId: string; quantity: number; category: string }>;
    }
  ): Promise<AssistantResponse> {
    const lowerQuery = query.toLowerCase();
    let recommendations: Recommendation[] = [];
    let message = "";

    if (lowerQuery.includes("breakfast")) {
      recommendations = await this.getBreakfastRecommendations();
      message = "Here are some great breakfast options for you:";
    } else if (lowerQuery.includes("protein") || lowerQuery.includes("high protein")) {
      recommendations = await this.getProteinRecommendations();
      message = "High-protein options to fuel your day:";
    } else if (lowerQuery.includes("healthy")) {
      recommendations = await this.getHealthyRecommendations();
      message = "Healthy choices for a balanced diet:";
    } else if (lowerQuery.includes("3 days") || lowerQuery.includes("three days")) {
      recommendations = await this.getMultiDayMealRecommendations();
      message = "Here's what you need for 3 days of meals:";
    } else {
      recommendations = await getPersonalizedRecommendations({
        cartItems: context?.cartItems,
        wishlistProductIds: context?.wishlistProductIds,
        orderHistory: context?.orderHistory,
        limit: 6
      });
      message = "Based on your preferences, here are some recommendations:";
    }

    return {
      message,
      recommendations,
      action: "recommend",
      confidence: 0.85
    };
  }

  /**
   * Handle shopping list generation
   */
  private async handleShoppingListQuery(
    query: string
  ): Promise<AssistantResponse> {
    const lowerQuery = query.toLowerCase();
    let shoppingList: ShoppingList;

    if (lowerQuery.includes("weekly") || lowerQuery.includes("week")) {
      shoppingList = await this.generateWeeklyGroceriesList();
    } else if (lowerQuery.includes("high protein") || lowerQuery.includes("protein")) {
      shoppingList = await this.generateHighProteinList();
    } else if (lowerQuery.includes("indian") || lowerQuery.includes("family")) {
      shoppingList = await this.generateIndianFamilyList();
    } else if (lowerQuery.includes("bachelor") || lowerQuery.includes("single")) {
      shoppingList = await this.generateBachelorEssentialsList();
    } else if (lowerQuery.includes("party") || lowerQuery.includes("snacks")) {
      shoppingList = await this.generatePartySnacksList();
    } else if (lowerQuery.includes("festival") || lowerQuery.includes("diwali") || lowerQuery.includes("holi")) {
      shoppingList = await this.generateFestivalList();
    } else {
      shoppingList = await this.generateGeneralShoppingList(query);
    }

    return {
      message: `I've created a ${shoppingList.name.toLowerCase()} for you.`,
      shoppingList,
      action: "list",
      confidence: 0.8
    };
  }

  /**
   * Handle recipe queries
   */
  private async handleRecipeQuery(
    query: string
  ): Promise<AssistantResponse> {
    const lowerQuery = query.toLowerCase();
    let recipe: RecipeRequirements;

    // Detect specific recipes
    if (lowerQuery.includes("butter chicken")) {
      recipe = this.getButterChickenRecipe();
    } else if (lowerQuery.includes("pasta")) {
      recipe = this.getPastaRecipe();
    } else if (lowerQuery.includes("poha")) {
      recipe = this.getPohaRecipe();
    } else if (lowerQuery.includes("omelette")) {
      recipe = this.getOmeletteRecipe();
    } else {
      // Generic recipe - extract ingredients from query
      recipe = this.extractRecipeFromQuery(query);
    }

    const missingCount = recipe.missingIngredients.length;
    const message = missingCount > 0
      ? `For this recipe, you have most ingredients. ${missingCount} item${missingCount > 1 ? "s" : ""} missing from your pantry.`
      : "You have all the ingredients for this recipe!";

    return {
      message,
      products: recipe.matchedProducts.map(m => m.product),
      action: "recipe",
      confidence: 0.75
    };
  }

  /**
   * Handle search queries
   */
  private async handleSearchQuery(query: string): Promise<AssistantResponse> {
    const { products, intent } = await smartSearch(query);
    
    return {
      message: intent.explanation,
      products,
      action: "search",
      confidence: intent.confidence
    };
  }

  /**
   * Handle recommendation queries
   */
  private async handleRecommendationQuery(
    query: string,
    context?: {
      cartItems?: Array<{ productId: string; quantity: number }>;
      wishlistProductIds?: string[];
      orderHistory?: Array<{ productId: string; quantity: number; category: string }>;
    }
  ): Promise<AssistantResponse> {
    const recommendations = await getPersonalizedRecommendations({
      cartItems: context?.cartItems,
      wishlistProductIds: context?.wishlistProductIds,
      orderHistory: context?.orderHistory,
      limit: 8
    });

    return {
      message: "Here are my top recommendations for you:",
      recommendations,
      action: "recommend",
      confidence: 0.85
    };
  }

  /**
   * Handle info queries
   */
  private async handleInfoQuery(query: string): Promise<AssistantResponse> {
    const lowerQuery = query.toLowerCase();
    const product = this.products.find(p => 
      lowerQuery.includes(p.name.toLowerCase()) ||
      lowerQuery.includes(p.brand.toLowerCase())
    );

    if (product) {
      return {
        message: `${product.brand} ${product.name} - ${product.description} Rated ${product.rating}★ by ${product.reviewCount.toLocaleString()} customers. Price: ₹${product.price} (${product.discount}% off MRP ₹${product.mrp}). ${product.stock > 0 ? `In stock, delivers in ${product.deliveryMinutes} minutes.` : "Currently out of stock."}`,
        products: [product],
        action: "info",
        confidence: 0.9
      };
    }

    return {
      message: "I couldn't find that product. Could you please be more specific?",
      action: "info",
      confidence: 0.3
    };
  }

  /**
   * Handle general queries
   */
  private async handleGeneralQuery(
    query: string,
    context?: {
      cartItems?: Array<{ productId: string; quantity: number }>;
      wishlistProductIds?: string[];
      orderHistory?: Array<{ productId: string; quantity: number; category: string }>;
    }
  ): Promise<AssistantResponse> {
    // Try to provide personalized recommendations
    const recommendations = await getPersonalizedRecommendations({
      cartItems: context?.cartItems,
      wishlistProductIds: context?.wishlistProductIds,
      orderHistory: context?.orderHistory,
      limit: 5
    });

    if (recommendations.length > 0) {
      return {
        message: "Here are some products I think you'll like:",
        recommendations,
        action: "recommend",
        confidence: 0.7
      };
    }

    return {
      message: "I can help you find products, create shopping lists, or get recipe recommendations. What would you like to do?",
      action: "recommend",
      confidence: 0.5
    };
  }

  // Recommendation helpers
  private async getBreakfastRecommendations(): Promise<Recommendation[]> {
    const breakfastProducts = this.products.filter(p => 
      p.category === "Dairy & Breakfast" || 
      p.tags.some(t => ["breakfast", "milk", "bread", "cereal", "coffee", "tea"].includes(t))
    );
    
    return breakfastProducts
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6)
      .map(product => ({
        product,
        reason: "Perfect for breakfast",
        score: product.rating / 5
      }));
  }

  private async getProteinRecommendations(): Promise<Recommendation[]> {
    const proteinProducts = this.products.filter(p =>
      p.tags.some(t => ["protein", "greek yogurt", "whey"].includes(t)) ||
      p.aiSignals.some(s => ["protein powder", "greek yogurt", "banana"].includes(s))
    );
    
    return proteinProducts
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6)
      .map(product => ({
        product,
        reason: "High in protein",
        score: product.rating / 5
      }));
  }

  private async getHealthyRecommendations(): Promise<Recommendation[]> {
    const healthyProducts = this.products.filter(p =>
      p.tags.some(t => ["healthy", "fresh", "fruit", "oats", "yogurt"].includes(t)) ||
      p.aiSignals.some(s => ["healthy", "protein", "fresh"].includes(s))
    );
    
    return healthyProducts
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6)
      .map(product => ({
        product,
        reason: "Healthy choice",
        score: product.rating / 5
      }));
  }

  private async getMultiDayMealRecommendations(): Promise<Recommendation[]> {
    const mealProducts = this.products.filter(p =>
      p.category === "Dairy & Breakfast" ||
      p.category === "Staples" ||
      p.category === "Fruits & Vegetables" ||
      p.tags.some(t => ["breakfast", "meal", "rice", "dal", "bread"].includes(t))
    );
    
    return mealProducts
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 8)
      .map(product => ({
        product,
        reason: "Great for multiple meals",
        score: product.rating / 5
      }));
  }

  // Shopping list generators
  private async generateWeeklyGroceriesList(): Promise<ShoppingList> {
    const items: ShoppingListItem[] = [
      { productId: "amul-toned-milk", productName: "Amul Toned Milk", quantity: 7, unit: "1 L", estimatedPrice: 476, category: "Dairy & Breakfast", reason: "Daily milk requirement" },
      { productId: "britannia-bread", productName: "Britannia Bread", quantity: 2, unit: "400 g", estimatedPrice: 110, category: "Dairy & Breakfast", reason: "Breakfast and snacks" },
      { productId: "tata-salt", productName: "Tata Salt", quantity: 1, unit: "1 kg", estimatedPrice: 28, category: "Fruits & Vegetables", reason: "Essential staple" },
      { productId: "robusta-bananas", productName: "Robusta Bananas", quantity: 2, unit: "6 pcs", estimatedPrice: 116, category: "Fruits & Vegetables", reason: "Daily fruits" }
    ];

    return this.createShoppingList("Weekly Groceries", "Essential items for a week", items);
  }

  private async generateHighProteinList(): Promise<ShoppingList> {
    const items: ShoppingListItem[] = [
      { productId: "muscleblaze-whey", productName: "MuscleBlaze Whey Protein", quantity: 1, unit: "1 kg", estimatedPrice: 2399, category: "Snacks", reason: "Protein supplement" },
      { productId: "epigamia-greek-yogurt", productName: "Epigamia Greek Yogurt", quantity: 5, unit: "90 g", estimatedPrice: 225, category: "Snacks", reason: "High protein snack" },
      { productId: "robusta-bananas", productName: "Robusta Bananas", quantity: 2, unit: "6 pcs", estimatedPrice: 116, category: "Fruits & Vegetables", reason: "Pre-workout energy" },
      { productId: "saffola-oats", productName: "Saffola Masala Oats", quantity: 2, unit: "500 g", estimatedPrice: 376, category: "Dairy & Breakfast", reason: "Protein-rich breakfast" }
    ];

    return this.createShoppingList("High-Protein Diet", "Protein-rich foods for fitness", items);
  }

  private async generateIndianFamilyList(): Promise<ShoppingList> {
    const items: ShoppingListItem[] = [
      { productId: "amul-toned-milk", productName: "Amul Toned Milk", quantity: 4, unit: "1 L", estimatedPrice: 272, category: "Dairy & Breakfast", reason: "Family milk requirement" },
      { productId: "britannia-bread", productName: "Britannia Bread", quantity: 3, unit: "400 g", estimatedPrice: 165, category: "Dairy & Breakfast", reason: "Breakfast and snacks" },
      { productId: "tata-salt", productName: "Tata Salt", quantity: 2, unit: "1 kg", estimatedPrice: 56, category: "Fruits & Vegetables", reason: "Cooking essential" },
      { productId: "maggi-noodles", productName: "Maggi Noodles", quantity: 4, unit: "560 g", estimatedPrice: 460, category: "Snacks", reason: "Quick meals" }
    ];

    return this.createShoppingList("Indian Family Essentials", "Essentials for a family of four", items);
  }

  private async generateBachelorEssentialsList(): Promise<ShoppingList> {
    const items: ShoppingListItem[] = [
      { productId: "maggi-noodles", productName: "Maggi Noodles", quantity: 3, unit: "560 g", estimatedPrice: 345, category: "Snacks", reason: "Quick and easy meals" },
      { productId: "nescafe-classic", productName: "Nescafe Classic", quantity: 2, unit: "45 g", estimatedPrice: 336, category: "Beverages", reason: "Morning coffee" },
      { productId: "unibic-cookies", productName: "Unibic Cookies", quantity: 2, unit: "250 g", estimatedPrice: 190, category: "Snacks", reason: "Evening snacks" }
    ];

    return this.createShoppingList("Bachelor Essentials", "Quick and easy meals for singles", items);
  }

  private async generatePartySnacksList(): Promise<ShoppingList> {
    const items: ShoppingListItem[] = [
      { productId: "unibic-cookies", productName: "Unibic Cookies", quantity: 4, unit: "250 g", estimatedPrice: 380, category: "Snacks", reason: "Party snacks" },
      { productId: "nescafe-classic", productName: "Nescafe Classic", quantity: 3, unit: "45 g", estimatedPrice: 504, category: "Beverages", reason: "Beverages for guests" },
      { productId: "amul-butter", productName: "Amul Butter", quantity: 2, unit: "100 g", estimatedPrice: 116, category: "Dairy & Breakfast", reason: "For snacks and toast" }
    ];

    return this.createShoppingList("Party Snacks", "Snacks and beverages for parties", items);
  }

  private async generateFestivalList(): Promise<ShoppingList> {
    const items: ShoppingListItem[] = [
      { productId: "amul-butter", productName: "Amul Butter", quantity: 4, unit: "100 g", estimatedPrice: 232, category: "Dairy & Breakfast", reason: "Festive cooking" },
      { productId: "tata-salt", productName: "Tata Salt", quantity: 2, unit: "1 kg", estimatedPrice: 56, category: "Fruits & Vegetables", reason: "Cooking essential" },
      { productId: "britannia-bread", productName: "Britannia Bread", quantity: 3, unit: "400 g", estimatedPrice: 165, category: "Dairy & Breakfast", reason: "Guests and family" }
    ];

    return this.createShoppingList("Festival Shopping", "Essentials for festival celebrations", items);
  }

  private async generateGeneralShoppingList(query: string): Promise<ShoppingList> {
    const { products } = await smartSearch(query);
    const items: ShoppingListItem[] = products.slice(0, 8).map(product => ({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unit: product.unit,
      estimatedPrice: product.price,
      category: product.category,
      reason: "Based on your request"
    }));

    return this.createShoppingList("Custom Shopping List", `Items for: ${query}`, items);
  }

  private createShoppingList(
    name: string,
    description: string,
    items: ShoppingListItem[]
  ): ShoppingList {
    const totalEstimatedPrice = items.reduce((sum, item) => sum + item.estimatedPrice, 0);
    
    return {
      id: `list-${Date.now()}`,
      name,
      description,
      items,
      totalEstimatedPrice,
      createdAt: new Date()
    };
  }

  // Recipe helpers
  private getButterChickenRecipe(): RecipeRequirements {
    const ingredients = [
      { name: "Chicken", quantity: "500", unit: "g" },
      { name: "Butter", quantity: "100", unit: "g" },
      { name: "Tomato", quantity: "4", unit: "pcs" },
      { name: "Onion", quantity: "2", unit: "pcs" },
      { name: "Cream", quantity: "200", unit: "ml" },
      { name: "Ginger", quantity: "1", unit: "inch" },
      { name: "Garlic", quantity: "4", unit: "cloves" }
    ];

    const matchedProducts = [
      { product: this.products.find(p => p.id === "amul-butter")!, requiredQuantity: 1, matchedQuantity: 1 }
    ].filter(m => m.product);

    return {
      recipeName: "Butter Chicken",
      ingredients,
      missingIngredients: [
        { name: "Chicken", reason: "Not available in current catalog" },
        { name: "Tomato", reason: "Not available in current catalog" }
      ],
      estimatedTotalPrice: matchedProducts.reduce((sum, m) => sum + m.product.price * m.matchedQuantity, 0),
      matchedProducts
    };
  }

  private getPastaRecipe(): RecipeRequirements {
    const ingredients = [
      { name: "Pasta", quantity: "200", unit: "g" },
      { name: "Tomato Sauce", quantity: "200", unit: "g" },
      { name: "Cheese", quantity: "50", unit: "g" },
      { name: "Olive Oil", quantity: "2", unit: "tbsp" }
    ];

    return {
      recipeName: "Pasta",
      ingredients,
      missingIngredients: [
        { name: "Pasta", reason: "Not available in current catalog" },
        { name: "Tomato Sauce", reason: "Not available in current catalog" }
      ],
      estimatedTotalPrice: 0,
      matchedProducts: []
    };
  }

  private getPohaRecipe(): RecipeRequirements {
    const ingredients = [
      { name: "Poha", quantity: "200", unit: "g" },
      { name: "Onion", quantity: "1", unit: "pc" },
      { name: "Mustard Seeds", quantity: "1", unit: "tsp" },
      { name: "Curry Leaves", quantity: "10", unit: "pcs" }
    ];

    return {
      recipeName: "Poha",
      ingredients,
      missingIngredients: [
        { name: "Poha", reason: "Not available in current catalog" }
      ],
      estimatedTotalPrice: 0,
      matchedProducts: []
    };
  }

  private getOmeletteRecipe(): RecipeRequirements {
    const ingredients = [
      { name: "Eggs", quantity: "2", unit: "pcs" },
      { name: "Butter", quantity: "10", unit: "g" },
      { name: "Salt", quantity: "1", unit: "tsp" },
      { name: "Pepper", quantity: "1", unit: "tsp" }
    ];

    const matchedProducts = [
      { product: this.products.find(p => p.id === "amul-butter")!, requiredQuantity: 1, matchedQuantity: 1 },
      { product: this.products.find(p => p.id === "tata-salt")!, requiredQuantity: 1, matchedQuantity: 1 }
    ].filter(m => m.product);

    return {
      recipeName: "Omelette",
      ingredients,
      missingIngredients: [
        { name: "Eggs", reason: "Not available in current catalog" },
        { name: "Pepper", reason: "Not available in current catalog" }
      ],
      estimatedTotalPrice: matchedProducts.reduce((sum, m) => sum + m.product.price * m.matchedQuantity, 0),
      matchedProducts
    };
  }

  private extractRecipeFromQuery(query: string): RecipeRequirements {
    const lowerQuery = query.toLowerCase();
    const recipeName = lowerQuery.replace(/recipe|ingredients|for|make|cook/gi, "").trim() || "Custom Recipe";
    
    // Extract potential ingredients from query
    const words = lowerQuery.split(" ");
    const potentialIngredients = words.filter(word => 
      word.length > 3 && 
      !["recipe", "ingredients", "for", "make", "cook", "need", "want"].includes(word)
    );

    const matchedProducts = this.products
      .filter(p => 
        potentialIngredients.some(word => 
          p.name.toLowerCase().includes(word) ||
          p.tags.some(t => t.includes(word))
        )
      )
      .slice(0, 5)
      .map(product => ({
        product,
        requiredQuantity: 1,
        matchedQuantity: 1
      }));

    return {
      recipeName: recipeName.charAt(0).toUpperCase() + recipeName.slice(1),
      ingredients: potentialIngredients.map(ing => ({ name: ing, quantity: "1", unit: "pc" })),
      missingIngredients: [],
      estimatedTotalPrice: matchedProducts.reduce((sum, m) => sum + m.product.price, 0),
      matchedProducts
    };
  }
}

// Export singleton instance
export const aiAssistant = new AIShoppingAssistant();
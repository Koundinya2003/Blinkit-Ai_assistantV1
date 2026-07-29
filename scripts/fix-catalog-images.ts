import { products } from "../src/lib/catalog";

// Map of correct images for each product ID
const imageFixes: Record<string, string> = {
  // Fruits & Vegetables - fix duplicates
  "bitter-gourd": "/images/products/bitter-gourd.jpg",
  "brinjal": "/images/products/brinjal.jpg",
  "ladyfinger": "/images/products/ladyfinger.jpg",
  "beetroot": "/images/products/beetroot.jpg",
  
  // Dairy & Breakfast - fix duplicates
  "mother-dairy-milk": "/images/products/amul-buffalo-milk.jpg",
  "kelloggs-chocos": "/images/products/kelloggs-corn-flakes.jpg",
  "quaker-oats": "/images/products/saffola-oats.jpg",
  
  // Snacks - fix duplicates
  "kurkure-masala": "/images/products/nestle-munch.jpg",
  "parle-g": "/images/products/britannia-good-day.jpg",
  "dark-fantasy": "/images/products/britannia-good-day.jpg",
  "kurkure-chutney": "/images/products/nestle-munch.jpg",
  "bingo-tomato": "/images/products/lays-classic.jpg",
  "too-yumm-multigrain": "/images/products/lays-classic.jpg",
  "hide-seek": "/images/products/unibic-cookies.jpg",
  "oreo": "/images/products/britannia-good-day.jpg",
  "nestle-kitkat": "/images/products/cadbury-dairy-milk.jpg",
  "amul-chocolate": "/images/products/cadbury-dairy-milk.jpg",
  
  // Beverages - fix duplicates
  "nescafe-gold": "/images/products/nescafe-classic.jpg",
  "red-label-tea": "/images/products/tata-tea.jpg",
  "coca-cola": "/images/products/coca-cola.jpg",
  "pepsi": "/images/products/coca-cola.jpg",
  "sprite": "/images/products/coca-cola.jpg",
  "amul-masti": "/images/products/amul-masti.jpg",
  "tropicana-juice": "/images/products/tropicana-juice.jpg",
  "monster-energy": "/images/products/red-bull.jpg",
  "himalaya-lemon-drink": "/images/products/real-fruit-juice.jpg",
  
  // Bakery - fix duplicates
  "britannia-brown-bread-bakery": "/images/products/britannia-bread.jpg",
  "britannia-milk-bread": "/images/products/britannia-bread.jpg",
  "britannia-bun": "/images/products/britannia-bread.jpg",
  "britannia-danish": "/images/products/britannia-croissant.jpg",
  "britannia-rusk": "/images/products/britannia-bread.jpg",
  "britannia-puffs": "/images/products/britannia-croissant.jpg",
  "britannia-garlic-bread": "/images/products/britannia-bread.jpg",
  
  // Household - fix massive duplication
  "surf-excel-quick-wash": "/images/products/surf-excel.jpg",
  "ariel-detergent": "/images/products/ariel-detergent.jpg",
  "comfort-fabric-conditioner": "/images/products/comfort-fabric-conditioner.jpg",
  "vim-bar": "/images/products/vim-bar.jpg",
  "vim-liquid": "/images/products/vim-liquid.jpg",
  "lysol-disinfectant": "/images/products/lysol-disinfectant.jpg",
  "harpic-toilet-cleaner": "/images/products/harpic-toilet-cleaner.jpg",
  "floor-cleaner": "/images/products/floor-cleaner.jpg",
  "mosquito-repellent": "/images/products/mosquito-repellent.jpg",
  "good-night": "/images/products/good-night.jpg",
  "colin-glass-cleaner": "/images/products/colin-glass-cleaner.jpg",
  "odonil-air-freshener": "/images/products/odonil-air-freshener.jpg",
  "scotch-brite": "/images/products/scotch-brite.jpg",
  "garbage-bag": "/images/products/garbage-bag.jpg",
  
  // Personal Care - fix duplicates
  "colgate-toothpaste": "/images/products/colgate-toothpaste.jpg",
  "lifebuoy-soap": "/images/products/lifebuoy-soap.jpg",
  "santoor-soap": "/images/products/santoor-soap.jpg",
  "sunsilk-shampoo": "/images/products/sunsilk-shampoo.jpg",
  "clinic-plus-shampoo": "/images/products/clinic-plus-shampoo.jpg",
  "tresemme-shampoo": "/images/products/tresemme-shampoo.jpg",
  "dove-conditioner": "/images/products/dove-conditioner.jpg",
  "dove-body-wash": "/images/products/dove-body-wash.jpg",
  "fiama-gel": "/images/products/fiama-gel.jpg",
  "himalaya-face-wash": "/images/products/himalaya-face-wash.jpg",
  "lakme-face-wash": "/images/products/lakme-face-wash.jpg",
  "garnier-face-wash": "/images/products/garnier-face-wash.jpg",
  "vaseline-lotion": "/images/products/vaseline-lotion.jpg",
  "ponds-moisturizer": "/images/products/ponds-moisturizer.jpg",
  
  // Baby Care - fix duplicates
  "johnsons-baby-lotion": "/images/products/johnsons-baby-lotion.jpg",
  "johnsons-baby-soap": "/images/products/johnsons-baby-soap.jpg",
  "himalaya-baby-cream": "/images/products/himalaya-baby-cream.jpg",
  "sebamed-baby-wash": "/images/products/sebamed-baby-wash.jpg",
  "mamy-poko-diapers": "/images/products/mamy-poko-diapers.jpg",
  "himalaya-baby-oil": "/images/products/himalaya-baby-oil.jpg",
  "himalaya-diaper-rash-cream": "/images/products/himalaya-diaper-rash-cream.jpg",
  "baby-shampoo": "/images/products/baby-shampoo.jpg",
  "baby-powder": "/images/products/baby-powder.jpg",
  "baby-food": "/images/products/baby-food.jpg",
  
  // Instant Food - fix duplicates
  "knorr-soupy-noodles": "/images/products/knorr-soupy-noodles.jpg",
  "everest-garam-masala": "/images/products/everest-garam-masala.jpg",
  "everest-chaat-masala": "/images/products/everest-chaat-masala.jpg",
  "mtr-ready-to-eat": "/images/products/mtr-ready-to-eat.jpg",
  "mtr-breakfast-mix": "/images/products/mtr-breakfast-mix.jpg",
  "bingo-upma": "/images/products/bingo-upma.jpg",
  "fortune-oil": "/images/products/fortune-oil.jpg",
  
  // Staples - fix duplicates
  "fortune-rice": "/images/products/fortune-rice.jpg",
  "jaggery": "/images/products/jaggery.jpg",
  "toor-dal": "/images/products/toor-dal.jpg",
  "moong-dal": "/images/products/moong-dal.jpg",
  "chana-dal": "/images/products/chana-dal.jpg",
  "masoor-dal": "/images/products/masoor-dal.jpg",
  "kabuli-chana": "/images/products/kabuli-chana.jpg",
  "rajma": "/images/products/rajma.jpg",
  "chana": "/images/products/chana.jpg",
  "urad-dal": "/images/products/urad-dal.jpg",
  "poha": "/images/products/poha.jpg",
  "rava": "/images/products/rava.jpg",
  "maida": "/images/products/maida.jpg",
  "besan": "/images/products/besan.jpg",
};

let fixed = 0;
let notFound = 0;

const updatedProducts = products.map(product => {
  const correctImage = imageFixes[product.id];
  if (correctImage && product.image !== correctImage) {
    fixed++;
    console.log(`✓ Fixed: ${product.id} -> ${correctImage}`);
    return { ...product, image: correctImage };
  }
  return product;
});

console.log(`\n=== FIX SUMMARY ===`);
console.log(`Total products: ${products.length}`);
console.log(`Images fixed: ${fixed}`);
console.log(`Products not in fix list: ${products.length - fixed - notFound}`);

// Export the updated products
export { updatedProducts };
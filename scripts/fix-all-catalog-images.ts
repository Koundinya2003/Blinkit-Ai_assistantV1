import { products } from "../src/lib/catalog";

// Comprehensive image fixes for all duplicate images
const imageFixes: Record<string, string> = {
  // Household products - all using surf-excel.jpg incorrectly
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

  // Personal Care - all using dove-soap.jpg incorrectly
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

  // Baby Care - all using himalaya-baby-wipes.jpg incorrectly
  "johnsons-baby-lotion": "/images/products/johnsons-baby-lotion.jpg",
  "johnsons-baby-soap": "/images/products/johnsons-baby-soap.jpg",
  "himalaya-baby-cream": "/images/products/himalaya-baby-cream.jpg",
  "sebamed-baby-wash": "/images/products/sebamed-baby-wash.jpg",
  "himalaya-baby-oil": "/images/products/himalaya-baby-oil.jpg",
  "himalaya-diaper-rash-cream": "/images/products/himalaya-diaper-rash-cream.jpg",
  "baby-shampoo": "/images/products/baby-shampoo.jpg",
  "baby-powder": "/images/products/baby-powder.jpg",
  "baby-food": "/images/products/baby-food.jpg",

  // Staples - all using aashirvaad-atta.jpg incorrectly
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

  // Bakery - all using britannia-bread.jpg incorrectly
  "britannia-brown-bread-bakery": "/images/products/britannia-brown-bread.jpg",
  "britannia-milk-bread": "/images/products/britannia-milk-bread.jpg",
  "britannia-bun": "/images/products/britannia-bun.jpg",
  "britannia-danish": "/images/products/britannia-danish.jpg",
  "britannia-rusk": "/images/products/britannia-rusk.jpg",
  "britannia-puffs": "/images/products/britannia-puffs.jpg",
  "britannia-garlic-bread": "/images/products/britannia-garlic-bread.jpg",

  // Snacks - various duplicates
  "kurkure-chutney": "/images/products/kurkure-chutney.jpg",
  "bingo-tomato": "/images/products/bingo-tomato.jpg",
  "too-yumm-multigrain": "/images/products/too-yumm-multigrain.jpg",
  "nestle-kitkat": "/images/products/nestle-kitkat.jpg",
  "amul-chocolate": "/images/products/amul-chocolate.jpg",

  // Beverages - various duplicates
  "nescafe-gold": "/images/products/nescafe-gold.jpg",
  "red-label-tea": "/images/products/red-label-tea.jpg",
  "pepsi": "/images/products/pepsi.jpg",
  "sprite": "/images/products/sprite.jpg",
  "monster-energy": "/images/products/monster-energy.jpg",
  "himalaya-lemon-drink": "/images/products/himalaya-lemon-drink.jpg",

  // Instant Food - various duplicates
  "yippee-noodles": "/images/products/yippee-noodles.jpg",
  "top-ramen": "/images/products/top-ramen.jpg",
  "knorr-soupy-noodles": "/images/products/knorr-soupy-noodles.jpg",
  "everest-garam-masala": "/images/products/everest-garam-masala.jpg",
  "everest-chaat-masala": "/images/products/everest-chaat-masala.jpg",
  "mtr-ready-to-eat": "/images/products/mtr-ready-to-eat.jpg",
  "mtr-breakfast-mix": "/images/products/mtr-breakfast-mix.jpg",
  "bingo-upma": "/images/products/bingo-upma.jpg",
  "fortune-oil": "/images/products/fortune-oil.jpg",
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
console.log(`Products not in fix list: ${products.length - fixed}`);

// Export the updated products
export { updatedProducts };
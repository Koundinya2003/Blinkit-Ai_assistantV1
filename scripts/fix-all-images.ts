import { products } from "../src/lib/catalog";

// This script identifies all products with incorrect/duplicate images
// and generates a report of what needs to be fixed

const imageUsage = new Map<string, string[]>();
const issues: string[] = [];

products.forEach(product => {
  const users = imageUsage.get(product.image) || [];
  users.push(`${product.id} (${product.name})`);
  imageUsage.set(product.image, users);
});

console.log("=== IMAGE DUPLICATION REPORT ===\n");

imageUsage.forEach((users, image) => {
  if (users.length > 1) {
    issues.push(`\nImage: ${image}\nUsed by ${users.length} products:\n${users.map(u => `  - ${u}`).join('\n')}`);
  }
});

if (issues.length > 0) {
  console.log(`Found ${issues.length} images with duplication:\n`);
  issues.forEach(issue => console.log(issue));
} else {
  console.log("No duplicate images found!");
}

// Check for obviously wrong images
console.log("\n=== POTENTIALLY INCORRECT IMAGES ===\n");

const wrongImages = products.filter(p => {
  // Check if image filename doesn't match product name at all
  const imageName = p.image.split('/').pop()?.replace('.jpg', '').replace('.png', '') || '';
  const productName = p.name.toLowerCase();
  
  // Check for completely mismatched images
  if (p.image.includes('horlicks') && !productName.includes('horlicks') && !productName.includes('health drink')) {
    return true;
  }
  if (p.image.includes('dove-soap') && !productName.includes('soap') && !productName.includes('body wash')) {
    return true;
  }
  if (p.image.includes('surf-excel') && !productName.includes('detergent') && !productName.includes('cleaner')) {
    return true;
  }
  if (p.image.includes('carrots') && !productName.includes('carrot')) {
    return true;
  }
  if (p.image.includes('baby-wipes') && !productName.includes('wipes') && !productName.includes('baby')) {
    return true;
  }
  
  return false;
});

if (wrongImages.length > 0) {
  console.log(`Found ${wrongImages.length} products with potentially wrong images:\n`);
  wrongImages.forEach(p => {
    console.log(`  ${p.id}: ${p.name}`);
    console.log(`    Current image: ${p.image}`);
    console.log(`    Category: ${p.category}`);
    console.log('');
  });
}

console.log("\n=== SUMMARY ===");
console.log(`Total products: ${products.length}`);
console.log(`Products with duplicate images: ${new Set(products.flatMap(p => imageUsage.get(p.image) || []).filter((_, i, arr) => arr.indexOf(_) !== i)).size}`);
console.log(`Unique images used: ${imageUsage.size}`);
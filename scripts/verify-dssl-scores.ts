/**
 * Verification Script: Check if dsslScore is in database and API response
 */

import 'dotenv/config';
import { db } from "../server/storage";
import { products } from "../shared/schema";

async function verifyDSSLScores() {
  try {
    console.log("🔍 Verifying DSSL Scores in Database...\n");

    // 1. Check database directly
    const allProducts = await db.select().from(products);
    console.log(`✅ Database Query: Found ${allProducts.length} products`);
    console.log(`📋 Sample Product (first one):`);
    if (allProducts.length > 0) {
      console.log(JSON.stringify(allProducts[0], null, 2));
    }

    // 2. Check if dsslScore field exists in any product
    const withScores = allProducts.filter(p => p.dsslScore !== null && p.dsslScore !== undefined);
    console.log(`\n✅ Products with dsslScore: ${withScores.length}/${allProducts.length}`);

    if (withScores.length > 0) {
      console.log(`\n📊 Score Distribution:`);
      withScores.forEach((p, idx) => {
        console.log(`   Product #${p.id}: "${p.name}" → Score: ${p.dsslScore}`);
      });
    } else {
      console.log(`\n⚠️  WARNING: No products have dsslScore values!`);
    }

    // 3. Check the structure
    if (allProducts.length > 0) {
      const firstProduct = allProducts[0];
      console.log(`\n🔍 Field Check on first product:`);
      console.log(`   - id: ${firstProduct.id ? '✅' : '❌'}`);
      console.log(`   - name: ${firstProduct.name ? '✅' : '❌'}`);
      console.log(`   - dsslScore: ${firstProduct.dsslScore !== undefined ? '✅' : '❌'} (value: ${firstProduct.dsslScore})`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

verifyDSSLScores();

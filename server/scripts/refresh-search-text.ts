/**
 * REFRESH SEARCH TEXT - One-time script to update all entities with new taxonomy-based search indexing
 *
 * Run this after deploying the new cognition search taxonomy to update existing entities.
 */

import { refreshAllSearchText } from '../../shared/cognition/entity-search-indexing';

async function main() {
  console.log('🚀 Starting search text refresh for all entities...');

  try {
    await refreshAllSearchText();
    console.log('✅ Search text refresh completed successfully!');
  } catch (error) {
    console.error('❌ Search text refresh failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
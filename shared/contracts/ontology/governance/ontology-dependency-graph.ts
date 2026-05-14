export const ONTOLOGY_DEPENDENCY_GRAPH = {
  // canonical authorities
  canonical: {
    domains: 'shared/contracts/ontology/domains.ts',
    categories: 'shared/contracts/ontology/categories.ts',
    resolver_pipeline: 'shared/contracts/ontology/resolver-pipeline.ts'
  },
  // derivative authorities and duplicates
  duplicates: [
    'shared/cognition/search-taxonomy.ts',
    'server/utils/categoryMapper.ts',
    'server/services/searchUnified.service.ts',
    'server/services/cognitive.query.engine.ts'
  ],
  // telemetry/district memory semantic fields
  telemetry: 'server/services/telemetry.service.ts',
  district_memory: 'server/services/district-memory.service.ts',
  // risky fallback points
  fallback_points: [
    'server/utils/categoryMapper.ts',
    'server/services/searchUnified.service.ts',
    'shared/cognition/search-taxonomy.ts'
  ]
};

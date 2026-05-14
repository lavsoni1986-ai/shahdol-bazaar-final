// governance/duplicate-authority-report.ts

export const DUPLICATE_AUTHORITIES = {
  categoryMapper: 'server/utils/categoryMapper.ts',
  taxonomy: 'shared/cognition/search-taxonomy.ts',
  resolverPipeline: 'shared/contracts/ontology/resolver-pipeline.ts',
  searchUnified: 'server/services/searchUnified.service.ts',
  cognitiveEngine: 'server/services/cognitive.query.engine.ts'
};

export const CORRUPTION_POINTS = [
  { file: 'server/utils/categoryMapper.ts', issue: 'electronics -> GROCERY, jewellers -> GROCERY' },
  { file: 'server/services/searchUnified.service.ts', issue: 'legacy electronics mapping and ambiguous fallback handling' },
  { file: 'shared/cognition/search-taxonomy.ts', issue: 'duplicate entries and inconsistent canonical types (strings vs enums)' }
];

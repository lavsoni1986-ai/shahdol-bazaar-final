// test-runtime-completeness.ts
// Test runtime completeness after fixes

import { resolveQuery } from './shared/contracts/ontology/index.js';
import { SignalSovereigntyEngine } from './shared/contracts/ontology/signal-engine.js';
import { SignalObservabilityEngine } from './shared/contracts/ontology/signal-observability.js';

async function testRuntimeCompleteness() {
  console.log('🧪 Testing Runtime Completeness');

  const testQueries = [
    'pharmacy open now',
    'emergency help'
  ];

  const allSignals: any[] = [];

  for (const query of testQueries) {
    console.log(`\nQuery: "${query}"`);
    const result = resolveQuery({ text: query });

    console.log(`Intent: ${result.intent}`);
    console.log(`Domain: ${result.domain}`);

    // Test strict epistemic separation
    result.operationalSignals.forEach((s: any, i: number) => {
      console.log(`  Op${i}: ${s.type} (v${s.signalVersion}) ${s.provenance}`);
      console.log(`       Parent: ${s.parentSignalId || 'root'}`);
      console.log(`       Lineage: [${s.lineage.join(', ')}]`);
    });

    result.userIntentSignals.forEach((s: any, i: number) => {
      console.log(`  User${i}: ${s.type} (v${s.signalVersion}) ${s.provenance}`);
      console.log(`       Parent: ${s.parentSignalId || 'root'}`);
      console.log(`       Lineage: [${s.lineage.join(', ')}]`);
    });

    allSignals.push(...result.operationalSignals, ...result.userIntentSignals);
  }

  // Test observability with fixed assessTruthDensity
  console.log('\n📊 Testing Fixed Observability:');
  try {
    const metrics = SignalObservabilityEngine.generateMetrics(allSignals);
    console.log(`Assessment: ${metrics.assessment.level} - ${metrics.assessment.assessment}`);
  } catch (error) {
    console.log(`❌ Observability failed: ${error.message}`);
  }

  // Test signal update lineage
  console.log('\n🔗 Testing Signal Update Lineage:');
  const originalSignal = SignalSovereigntyEngine.constituteOperationalSignal(
    'EXPECTED_OPEN_NOW' as any,
    'UNKNOWN' as any,
    'ml_inference' as any,
    'test'
  );

  console.log(`Original: v${originalSignal.signalVersion}, lineage: ${originalSignal.lineage.length}`);

  const updatedSignal = SignalSovereigntyEngine.updateSignal(
    originalSignal,
    'TRUE' as any,
    'human_verified' as any,
    'manual_update'
  );

  console.log(`Updated: v${updatedSignal.signalVersion}, parent: ${updatedSignal.parentSignalId}`);
  console.log(`Lineage: ${updatedSignal.lineage.length} entries`);

  console.log('\n✅ Runtime completeness test complete');
}

testRuntimeCompleteness();
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTrapezoidalAuc,
  classifyPapAucRatio,
  computeObservationMetrics,
  getValidationStatusSummary,
  parseObservationsCsv,
  runPapAucAnalysis,
  serializeDerivedObservationsCsv,
  serializeObservationsCsv,
} from './papAucEngine.ts';
import type { Observation, ProtocolProfile } from '../types/hvisa.ts';

const baseProtocol: ProtocolProfile = {
  id: 'proto-icmr-2019',
  name: 'ICMR SOP profile (editable)',
  version: '2.0-demo',
  sourceCitation: 'ICMR Bacteriology SOP (2nd ed., 2019) — Editable Demo Profile',
  concentrationGrid: [0.5, 1.0, 2.0, 2.5, 4.0],
  expectedReplicates: 1,
  defaultPlatedVolumeMl: 0.1,
  defaultDilutionFraction: 0.001,
  incubationConditions: 'BHI agar, 37 C for 48 hours',
  zeroColonyPolicy: 'DETECTION_LIMIT',
  aggregationMethod: 'ARITHMETIC_MEAN_LOG10',
  hvisaLowerThreshold: 0.9,
  visaUpperThreshold: 1.3,
  interpretationBelowLabel: 'Below configured hVISA PAP-AUC threshold (< 0.90)',
  interpretationHvisaLabel: 'Compatible with hVISA range in configured PAP-AUC scheme (0.90–1.30)',
  interpretationAboveLabel: 'Flagged for expert review: potentially within VISA-associated range (> 1.30)',
  disclaimerText: 'Synthetic demonstration profile. Not a clinical diagnostic device.',
  updatedAt: '2026-11-15T00:00:00.000Z',
  updatedBy: 'SYSTEM',
};

function makeObs(
  id: string,
  strainId: string,
  strainRole: 'REFERENCE_MU3' | 'TEST',
  conc: number,
  colonyCount: number,
  overrides: Partial<Observation> = {}
): Observation {
  return {
    id,
    experimentId: 'exp-1',
    isolateId: `iso-${strainId}`,
    strainId,
    strainRole,
    vancomycinConcentrationMgL: conc,
    replicateId: 'R1',
    dilutionFraction: 0.001,
    platedVolumeMl: 0.1,
    colonyCount,
    dataOrigin: 'SYNTHETIC_DEMO_NOT_REAL_LAB_DATA',
    rowOrder: 1,
    createdAt: '2026-11-15T00:00:00.000Z',
    updatedAt: '2026-11-15T00:00:00.000Z',
    ...overrides,
  };
}

test('CFU/mL and log10(CFU/mL) conversion matches scientific formula', () => {
  const obs = makeObs('o1', 'MU3-REF', 'REFERENCE_MU3', 0.5, 180);
  const derived = computeObservationMetrics(obs, 'DETECTION_LIMIT');
  assert.equal(derived.isValidInput, true);
  assert.equal(derived.cfuPerMl, 1800000);
  assert.ok(Math.abs((derived.log10CfuPerMl ?? 0) - Math.log10(1800000)) < 1e-5);
  assert.equal(derived.isZeroCensored, false);
});

test('Zero-colony observations never compute log10(0) and respect protocol policy', () => {
  const zeroObs = makeObs('o-zero', 'DEMO-ISO-02', 'TEST', 4.0, 0);

  const excludeResult = computeObservationMetrics(zeroObs, 'EXCLUDE_POINT');
  assert.equal(excludeResult.isZeroCensored, true);
  assert.equal(excludeResult.log10CfuPerMl, null);
  assert.equal(excludeResult.effectiveLog10ForCurve, null);

  const detLimitResult = computeObservationMetrics(zeroObs, 'DETECTION_LIMIT');
  assert.equal(detLimitResult.isZeroCensored, true);
  assert.equal(detLimitResult.log10CfuPerMl, null);
  // 1 / (0.1 * 0.001) = 10000 -> log10 = 4.0
  assert.equal(detLimitResult.effectiveLog10ForCurve, 4);

  const floorZeroResult = computeObservationMetrics(zeroObs, 'FLOOR_ZERO');
  assert.equal(floorZeroResult.effectiveLog10ForCurve, 0);
});

test('Trapezoidal AUC calculates exact piecewise area', () => {
  const { auc, segments } = calculateTrapezoidalAuc([
    { x: 0.5, y: 6.0 },
    { x: 1.0, y: 5.0 },
    { x: 2.0, y: 3.0 },
  ]);
  // Segment 1: ((6+5)/2)*(1.0-0.5) = 2.75
  // Segment 2: ((5+3)/2)*(2.0-1.0) = 4.00
  // Total = 6.75
  assert.equal(segments.length, 2);
  assert.equal(auc, 6.75);
});

test('Threshold boundary classification handles < 0.90, [0.90, 1.30], > 1.30 and custom upper boundary', () => {
  assert.equal(classifyPapAucRatio(0.8999, baseProtocol).band, 'BELOW_THRESHOLD');
  assert.equal(classifyPapAucRatio(0.9, baseProtocol).band, 'COMPATIBLE_HVISA');
  assert.equal(classifyPapAucRatio(1.3, baseProtocol).band, 'COMPATIBLE_HVISA');
  assert.equal(classifyPapAucRatio(1.3001, baseProtocol).band, 'EXPERT_REVIEW_VISA_RANGE');

  const customProtocol = { ...baseProtocol, visaUpperThreshold: 1.4 };
  assert.equal(classifyPapAucRatio(1.35, customProtocol).band, 'COMPATIBLE_HVISA');
  assert.equal(classifyPapAucRatio(1.41, customProtocol).band, 'EXPERT_REVIEW_VISA_RANGE');
});

test('Missing Mu3 reference blocks calculation and ratio is not computed', () => {
  const onlyTest = [
    makeObs('t1', 'ISO-01', 'TEST', 0.5, 170),
    makeObs('t2', 'ISO-01', 'TEST', 1.0, 132),
  ];
  const res = runPapAucAnalysis(onlyTest, baseProtocol);
  assert.equal(res.canCalculate, false);
  assert.equal(res.payload, null);
  assert.ok(res.flags.some((f) => f.severity === 'BLOCKING' && f.code === 'MISSING_MU3_REFERENCE'));
});

test('Invalid inputs (negative count, non-integer, duplicate replicate) produce blocking QA flags', () => {
  const badRows = [
    makeObs('r1', 'MU3-REF', 'REFERENCE_MU3', 0.5, 180),
    makeObs('r2', 'MU3-REF', 'REFERENCE_MU3', 1.0, 145),
    makeObs('t1', 'ISO-01', 'TEST', 0.5, 12.5), // non-integer
    makeObs('t2', 'ISO-01', 'TEST', 0.5, 120), // duplicate replicate key
    makeObs('t3', 'ISO-01', 'TEST', 1.0, -5), // negative count
  ];
  const res = runPapAucAnalysis(badRows, baseProtocol);
  assert.equal(res.canCalculate, false);
  const codes = new Set(res.flags.map((f) => f.code));
  assert.ok(codes.has('NON_INTEGER_COLONY_COUNT'));
  assert.ok(codes.has('DUPLICATE_REPLICATE_KEY'));
  assert.ok(codes.has('NEGATIVE_COLONY_COUNT'));
});

test('Zero-colony with UNSPECIFIED protocol blocks calculation until policy is selected', () => {
  const rows = [
    makeObs('r1', 'MU3-REF', 'REFERENCE_MU3', 0.5, 180),
    makeObs('r2', 'MU3-REF', 'REFERENCE_MU3', 1.0, 145),
    makeObs('t1', 'ISO-01', 'TEST', 0.5, 120),
    makeObs('t2', 'ISO-01', 'TEST', 1.0, 0),
  ];
  const unspecifiedProto = { ...baseProtocol, zeroColonyPolicy: 'UNSPECIFIED' as const };
  const res = runPapAucAnalysis(rows, unspecifiedProto);
  assert.equal(res.canCalculate, false);
  assert.ok(res.flags.some((f) => f.code === 'ZERO_COLONY_UNSPECIFIED_POLICY'));
});

test('Multi-replicate aggregation computes arithmetic mean and median of log10(CFU/mL) and never imputes missing points', () => {
  const multiRepProto: ProtocolProfile = {
    ...baseProtocol,
    concentrationGrid: [0.5, 1.0, 2.0, 4.0],
    expectedReplicates: 2,
  };
  // At 0.5 mg/L: R1=100 (1e6 -> log10=6.0), R2=1000? wait 1000*1e4=1e7 -> log10=7.0 -> mean=6.5
  // At 1.0 mg/L: R1=10 (1e5 -> log10=5.0), R2=100 (1e6 -> log10=6.0) -> mean=5.5
  // 2.0 mg/L is intentionally omitted for ISO-REP -> must NOT be silently imputed!
  // At 4.0 mg/L: R1=10 (log10=5.0), R2=10 (log10=5.0) -> mean=5.0
  const obs: Observation[] = [
    makeObs('m1', 'MU3-REF', 'REFERENCE_MU3', 0.5, 100, { replicateId: 'R1' }),
    makeObs('m2', 'MU3-REF', 'REFERENCE_MU3', 0.5, 100, { replicateId: 'R2' }),
    makeObs('m3', 'MU3-REF', 'REFERENCE_MU3', 1.0, 10, { replicateId: 'R1' }),
    makeObs('m4', 'MU3-REF', 'REFERENCE_MU3', 1.0, 10, { replicateId: 'R2' }),
    makeObs('m5', 'MU3-REF', 'REFERENCE_MU3', 2.0, 10, { replicateId: 'R1' }),
    makeObs('m6', 'MU3-REF', 'REFERENCE_MU3', 2.0, 10, { replicateId: 'R2' }),
    makeObs('m7', 'MU3-REF', 'REFERENCE_MU3', 4.0, 10, { replicateId: 'R1' }),
    makeObs('m8', 'MU3-REF', 'REFERENCE_MU3', 4.0, 10, { replicateId: 'R2' }),

    makeObs('t1', 'ISO-REP', 'TEST', 0.5, 100, { replicateId: 'R1' }),
    makeObs('t2', 'ISO-REP', 'TEST', 0.5, 1000, { replicateId: 'R2' }),
    makeObs('t3', 'ISO-REP', 'TEST', 1.0, 10, { replicateId: 'R1' }),
    makeObs('t4', 'ISO-REP', 'TEST', 1.0, 100, { replicateId: 'R2' }),
    makeObs('t5', 'ISO-REP', 'TEST', 4.0, 10, { replicateId: 'R1' }),
    makeObs('t6', 'ISO-REP', 'TEST', 4.0, 10, { replicateId: 'R2' }),
  ];

  const res = runPapAucAnalysis(obs, multiRepProto);
  assert.equal(res.canCalculate, true);
  assert.ok(res.payload);
  // Warning emitted for missing 2.0 mg/L on ISO-REP (never silently filled)
  assert.ok(res.flags.some((f) => f.severity === 'WARNING' && f.code === 'CONCENTRATION_GRID_MISMATCH'));

  const testProfile = res.payload.testProfiles[0];
  // Only 3 observed concentration points (0.5, 1.0, 4.0), NOT 4!
  assert.equal(testProfile.points.length, 3);
  assert.equal(testProfile.points[0].aggregatedLog10CfuPerMl, 6.5);
  assert.equal(testProfile.points[1].aggregatedLog10CfuPerMl, 5.5);
  assert.equal(testProfile.points[2].aggregatedLog10CfuPerMl, 5.0);
  // Trapezoidal AUC over [0.5->1.0] (mean 6.0 * 0.5 = 3.0) + [1.0->4.0] (mean 5.25 * 3.0 = 15.75) = 18.75
  assert.equal(testProfile.auc, 18.75);
});

test('Sample CSV parses cleanly and runs full deterministic PAP-AUC ratio calculation', () => {
  const sampleCsv = `run_id,strain_id,strain_role,vancomycin_concentration_mg_L,replicate_id,dilution_fraction,plated_volume_ml,colony_count,data_origin
DEMO-RUN-001,MU3-REF,REFERENCE_MU3,0.5,R1,0.001,0.1,180,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,MU3-REF,REFERENCE_MU3,1.0,R1,0.001,0.1,145,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,MU3-REF,REFERENCE_MU3,2.0,R1,0.001,0.1,92,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,MU3-REF,REFERENCE_MU3,2.5,R1,0.001,0.1,48,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,MU3-REF,REFERENCE_MU3,4.0,R1,0.001,0.1,12,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,DEMO-ISO-01,TEST,0.5,R1,0.001,0.1,170,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,DEMO-ISO-01,TEST,1.0,R1,0.001,0.1,132,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,DEMO-ISO-01,TEST,2.0,R1,0.001,0.1,82,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,DEMO-ISO-01,TEST,2.5,R1,0.001,0.1,41,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,DEMO-ISO-01,TEST,4.0,R1,0.001,0.1,9,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,DEMO-ISO-02,TEST,0.5,R1,0.001,0.1,120,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,DEMO-ISO-02,TEST,1.0,R1,0.001,0.1,72,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,DEMO-ISO-02,TEST,2.0,R1,0.001,0.1,28,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,DEMO-ISO-02,TEST,2.5,R1,0.001,0.1,8,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA
DEMO-RUN-001,DEMO-ISO-02,TEST,4.0,R1,0.001,0.1,0,SYNTHETIC_DEMO_NOT_REAL_LAB_DATA`;

  const parsed = parseObservationsCsv(sampleCsv);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 15);

  const observations: Observation[] = parsed.rows.map((r, idx) =>
    makeObs(`row-${idx}`, r.strainId, r.strainRole, r.vancomycinConcentrationMgL, r.colonyCount, {
      replicateId: r.replicateId,
      dilutionFraction: r.dilutionFraction,
      platedVolumeMl: r.platedVolumeMl,
      dataOrigin: r.dataOrigin,
      rowOrder: idx + 1,
    })
  );

  const analysis = runPapAucAnalysis(observations, baseProtocol);
  assert.equal(analysis.canCalculate, true);
  assert.ok(analysis.payload !== null);
  assert.equal(analysis.payload.testProfiles.length, 2);

  // Verify exact deterministic Mu3 & test AUCs against hand-computed log10 trapezoids
  assert.ok(Math.abs((analysis.payload.mu3Auc ?? 0) - 20.1483) < 0.001);

  const iso01 = analysis.payload.testProfiles.find((p) => p.strainId === 'DEMO-ISO-01');
  const iso02 = analysis.payload.testProfiles.find((p) => p.strainId === 'DEMO-ISO-02');
  assert.ok(iso01 && iso01.papAucRatio !== null);
  assert.ok(iso02 && iso02.papAucRatio !== null);
  assert.ok(Math.abs((iso01.auc ?? 0) - 19.9119) < 0.001);
  assert.ok(Math.abs(iso01.papAucRatio - 0.9883) < 0.001);
  assert.ok(Math.abs((iso02.auc ?? 0) - 17.9013) < 0.001);
  assert.ok(Math.abs(iso02.papAucRatio - 0.8885) < 0.001);
  assert.equal(iso01.interpretationBand, 'COMPATIBLE_HVISA');
  assert.equal(iso02.interpretationBand, 'BELOW_THRESHOLD');
  // Zero-colony warning must be raised for DEMO-ISO-02 @ 4.0 mg/L
  assert.ok(analysis.flags.some((f) => f.severity === 'WARNING' && f.code === 'ZERO_COLONY_CENSORED'));
});

test('QA detects incompatible test/reference protocols, mixed run CSVs, and assigns RED/AMBER/GREEN levels', () => {
  // 1. Incompatible non-overlapping grids & mismatched plated volume -> RED blocking
  const incompatibleObs: Observation[] = [
    makeObs('r1', 'MU3-REF', 'REFERENCE_MU3', 0.5, 180, { platedVolumeMl: 0.1 }),
    makeObs('r2', 'MU3-REF', 'REFERENCE_MU3', 1.0, 145, { platedVolumeMl: 0.1 }),
    makeObs('t1', 'ISO-X', 'TEST', 2.0, 80, { platedVolumeMl: 0.05 }),
    makeObs('t2', 'ISO-X', 'TEST', 4.0, 15, { platedVolumeMl: 0.05 }),
  ];
  const badRes = runPapAucAnalysis(incompatibleObs, baseProtocol);
  assert.equal(badRes.canCalculate, false);
  assert.ok(badRes.flags.some((f) => f.code === 'INCOMPATIBLE_CONCENTRATION_GRIDS' && f.severity === 'BLOCKING'));
  assert.ok(badRes.flags.some((f) => f.code === 'TEST_REFERENCE_PROTOCOL_MISMATCH' && f.severity === 'WARNING'));
  assert.equal(getValidationStatusSummary(badRes.flags, incompatibleObs.length).level, 'RED');

  // 2. Clean 5-point run with zero-colony warning -> AMBER
  const amberObs: Observation[] = [
    makeObs('r1', 'MU3-REF', 'REFERENCE_MU3', 0.5, 180),
    makeObs('r2', 'MU3-REF', 'REFERENCE_MU3', 1.0, 145),
    makeObs('r3', 'MU3-REF', 'REFERENCE_MU3', 2.0, 92),
    makeObs('r4', 'MU3-REF', 'REFERENCE_MU3', 2.5, 48),
    makeObs('r5', 'MU3-REF', 'REFERENCE_MU3', 4.0, 12),
    makeObs('t1', 'ISO-A', 'TEST', 0.5, 120),
    makeObs('t2', 'ISO-A', 'TEST', 1.0, 72),
    makeObs('t3', 'ISO-A', 'TEST', 2.0, 28),
    makeObs('t4', 'ISO-A', 'TEST', 2.5, 8),
    makeObs('t5', 'ISO-A', 'TEST', 4.0, 0),
  ];
  const amberRes = runPapAucAnalysis(amberObs, baseProtocol);
  assert.equal(amberRes.canCalculate, true);
  assert.equal(getValidationStatusSummary(amberRes.flags, amberObs.length).level, 'AMBER');

  // 3. Clean 5-point run with no warnings -> GREEN
  const greenObs = amberObs.map((o) => (o.id === 't5' ? { ...o, colonyCount: 4 } : o));
  const greenRes = runPapAucAnalysis(greenObs, baseProtocol);
  assert.equal(greenRes.canCalculate, true);
  assert.equal(getValidationStatusSummary(greenRes.flags, greenObs.length, 'CALCULATED').level, 'GREEN');

  // 4. Mixed run_id CSV rows -> INCOMPATIBLE_RUN_ORIGIN blocking flag
  const mixedCsv = `run_id,strain_id,strain_role,vancomycin_concentration_mg_L,replicate_id,dilution_fraction,plated_volume_ml,colony_count
RUN-A,MU3-REF,REFERENCE_MU3,0.5,R1,0.001,0.1,180
RUN-A,MU3-REF,REFERENCE_MU3,1.0,R1,0.001,0.1,140
RUN-B,ISO-1,TEST,0.5,R1,0.001,0.1,170
RUN-B,ISO-1,TEST,1.0,R1,0.001,0.1,130`;
  const parsedMixed = parseObservationsCsv(mixedCsv);
  const mixedObs = parsedMixed.rows.map((r, i) =>
    makeObs(`m-${i}`, r.strainId, r.strainRole, r.vancomycinConcentrationMgL, r.colonyCount, {
      dataOrigin: r.dataOrigin,
    })
  );
  const mixedRes = runPapAucAnalysis(mixedObs, baseProtocol);
  assert.equal(mixedRes.canCalculate, false);
  assert.ok(mixedRes.flags.some((f) => f.code === 'INCOMPATIBLE_RUN_ORIGIN' && f.severity === 'BLOCKING'));
});

test('CSV export/import round-trip preserves raw observations and exports derived values cleanly', () => {
  const obs: Observation[] = [
    makeObs('o1', 'MU3-REF', 'REFERENCE_MU3', 0.5, 180),
    makeObs('o2', 'MU3-REF', 'REFERENCE_MU3', 1.0, 145),
    makeObs('o3', 'DEMO-ISO-02', 'TEST', 0.5, 120),
    makeObs('o4', 'DEMO-ISO-02', 'TEST', 1.0, 72),
    makeObs('o5', 'DEMO-ISO-02', 'TEST', 4.0, 0),
  ];

  const rawCsv = serializeObservationsCsv(obs, 'TEST-ROUNDTRIP-01');
  const reparsed = parseObservationsCsv(rawCsv);
  assert.equal(reparsed.errors.length, 0);
  assert.equal(reparsed.rows.length, 5);
  assert.equal(reparsed.rows[4].colonyCount, 0);
  assert.equal(reparsed.rows[4].vancomycinConcentrationMgL, 4.0);

  const analysis = runPapAucAnalysis(obs, baseProtocol);
  assert.ok(analysis.payload);
  const derivedCsv = serializeDerivedObservationsCsv(obs, analysis.payload.observationDerived, {
    runId: 'TEST-ROUNDTRIP-01',
    protocolName: baseProtocol.name,
    protocolVersion: baseProtocol.version,
    zeroColonyPolicy: baseProtocol.zeroColonyPolicy,
    calculationVersion: analysis.payload.calculationVersion,
    calculatedAt: '2026-11-15T12:00:00.000Z',
    isSyntheticDemo: true,
  });

  const lines = derivedCsv.split('\n');
  assert.equal(lines.length, 6);
  assert.ok(lines[0].includes('cfu_per_ml'));
  assert.ok(lines[0].includes('log10_cfu_per_ml'));
  assert.ok(lines[0].includes('effective_log10_for_curve'));
  assert.ok(lines[5].includes('UNDEFINED_LOG10_0'));
  assert.ok(lines[5].includes('SYNTHETIC_DEMO_NOT_REAL_LAB_DATA'));
});


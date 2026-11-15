import type {
  AggregationMethod,
  CalculationResultPayload,
  CurveConcentrationPoint,
  CurveReplicatePoint,
  ExperimentStatus,
  InterpretationBand,
  Observation,
  ObservationDerived,
  ProtocolProfile,
  QaSeverity,
  StrainProfileResult,
  StrainRole,
  TrapezoidalSegment,
  ZeroColonyPolicy,
} from '../types/hvisa.ts';

export const CALCULATION_ENGINE_VERSION = '1.0.0-trapezoidal';

export interface QaFlagDraft {
  severity: QaSeverity;
  code: string;
  message: string;
  resolutionHint: string;
  observationId: string | null;
  rowReference: string | null;
  fieldName: string | null;
}

export interface CsvParseResult {
  rows: Array<{
    runId: string;
    strainId: string;
    strainRole: StrainRole;
    vancomycinConcentrationMgL: number;
    replicateId: string;
    dilutionFraction: number;
    platedVolumeMl: number;
    colonyCount: number;
    dataOrigin: string;
  }>;
  errors: string[];
}

export function roundTo(value: number, decimals = 6): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function computeObservationMetrics(
  obs: Pick<
    Observation,
    | 'id'
    | 'strainId'
    | 'strainRole'
    | 'vancomycinConcentrationMgL'
    | 'replicateId'
    | 'colonyCount'
    | 'dilutionFraction'
    | 'platedVolumeMl'
  >,
  zeroPolicy: ZeroColonyPolicy
): ObservationDerived {
  const validInputs =
    Number.isFinite(obs.vancomycinConcentrationMgL) &&
    obs.vancomycinConcentrationMgL >= 0 &&
    Number.isFinite(obs.platedVolumeMl) &&
    obs.platedVolumeMl > 0 &&
    Number.isFinite(obs.dilutionFraction) &&
    obs.dilutionFraction > 0 &&
    obs.dilutionFraction <= 1 &&
    Number.isFinite(obs.colonyCount) &&
    Number.isInteger(obs.colonyCount) &&
    obs.colonyCount >= 0;

  if (!validInputs) {
    return {
      observationId: obs.id,
      strainId: obs.strainId,
      strainRole: obs.strainRole,
      concentrationMgL: obs.vancomycinConcentrationMgL,
      replicateId: obs.replicateId,
      colonyCount: obs.colonyCount,
      dilutionFraction: obs.dilutionFraction,
      platedVolumeMl: obs.platedVolumeMl,
      cfuPerMl: null,
      log10CfuPerMl: null,
      isZeroCensored: false,
      effectiveLog10ForCurve: null,
      handlingNote: 'Invalid raw numeric input; requires correction before calculation.',
      isValidInput: false,
    };
  }

  const denominator = obs.platedVolumeMl * obs.dilutionFraction;
  const cfuPerMl = obs.colonyCount / denominator;

  if (obs.colonyCount === 0) {
    const detectionLimitCfu = 1 / denominator;
    const detectionLimitLog10 = Math.log10(detectionLimitCfu);
    let effectiveLog10ForCurve: number | null = null;
    let handlingNote = 'Zero colonies: censored below detection limit (log10(0) undefined).';

    if (zeroPolicy === 'DETECTION_LIMIT') {
      effectiveLog10ForCurve = roundTo(detectionLimitLog10, 6);
      handlingNote = `Zero colonies preserved; curve uses protocol detection limit floor log10(1 / (${obs.platedVolumeMl} * ${obs.dilutionFraction})) = ${effectiveLog10ForCurve.toFixed(3)}.`;
    } else if (zeroPolicy === 'FLOOR_ZERO') {
      effectiveLog10ForCurve = 0;
      handlingNote = 'Zero colonies preserved; curve uses protocol 0.000 log10 baseline.';
    } else if (zeroPolicy === 'EXCLUDE_POINT') {
      effectiveLog10ForCurve = null;
      handlingNote = 'Zero colonies preserved; point excluded from curve integration per protocol.';
    } else {
      effectiveLog10ForCurve = null;
      handlingNote = 'Zero colonies preserved; protocol zero-colony handling is unspecified (blocking).';
    }

    return {
      observationId: obs.id,
      strainId: obs.strainId,
      strainRole: obs.strainRole,
      concentrationMgL: obs.vancomycinConcentrationMgL,
      replicateId: obs.replicateId,
      colonyCount: obs.colonyCount,
      dilutionFraction: obs.dilutionFraction,
      platedVolumeMl: obs.platedVolumeMl,
      cfuPerMl: 0,
      log10CfuPerMl: null,
      isZeroCensored: true,
      effectiveLog10ForCurve,
      handlingNote,
      isValidInput: true,
    };
  }

  const log10CfuPerMl = roundTo(Math.log10(cfuPerMl), 6);
  return {
    observationId: obs.id,
    strainId: obs.strainId,
    strainRole: obs.strainRole,
    concentrationMgL: obs.vancomycinConcentrationMgL,
    replicateId: obs.replicateId,
    colonyCount: obs.colonyCount,
    dilutionFraction: obs.dilutionFraction,
    platedVolumeMl: obs.platedVolumeMl,
    cfuPerMl: roundTo(cfuPerMl, 4),
    log10CfuPerMl,
    isZeroCensored: false,
    effectiveLog10ForCurve: log10CfuPerMl,
    handlingNote: 'Standard viable count calculation.',
    isValidInput: true,
  };
}

export function aggregateValues(values: number[], method: AggregationMethod): number | null {
  if (values.length === 0) return null;
  if (method === 'MEDIAN_LOG10') {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    return roundTo(median, 6);
  }
  const sum = values.reduce((acc, v) => acc + v, 0);
  return roundTo(sum / values.length, 6);
}

export function calculateTrapezoidalAuc(
  points: Array<{ x: number; y: number }>
): { auc: number | null; segments: TrapezoidalSegment[] } {
  if (points.length < 2) {
    return { auc: null, segments: [] };
  }

  const sorted = [...points].sort((a, b) => a.x - b.x);
  const segments: TrapezoidalSegment[] = [];
  let total = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[i];
    const p1 = sorted[i + 1];
    const deltaX = p1.x - p0.x;
    if (deltaX <= 0) {
      continue;
    }
    const meanY = (p0.y + p1.y) / 2;
    const segmentArea = meanY * deltaX;
    segments.push({
      x0: p0.x,
      x1: p1.x,
      y0: roundTo(p0.y, 4),
      y1: roundTo(p1.y, 4),
      deltaX: roundTo(deltaX, 4),
      meanY: roundTo(meanY, 4),
      segmentArea: roundTo(segmentArea, 6),
    });
    total += segmentArea;
  }

  if (segments.length === 0) {
    return { auc: null, segments: [] };
  }

  return {
    auc: roundTo(total, 4),
    segments,
  };
}

export function classifyPapAucRatio(
  ratio: number | null,
  protocol: Pick<
    ProtocolProfile,
    | 'hvisaLowerThreshold'
    | 'visaUpperThreshold'
    | 'interpretationBelowLabel'
    | 'interpretationHvisaLabel'
    | 'interpretationAboveLabel'
  >
): { band: InterpretationBand; label: string; detail: string } {
  if (ratio === null || !Number.isFinite(ratio)) {
    return {
      band: 'NOT_CALCULATED',
      label: 'Ratio not computed',
      detail: 'Valid same-run Mu3 reference and test isolate AUCs are required.',
    };
  }

  if (ratio < protocol.hvisaLowerThreshold) {
    return {
      band: 'BELOW_THRESHOLD',
      label: protocol.interpretationBelowLabel,
      detail: `Ratio ${ratio.toFixed(3)} is below the configured lower boundary (< ${protocol.hvisaLowerThreshold.toFixed(2)}).`,
    };
  }

  if (ratio <= protocol.visaUpperThreshold) {
    return {
      band: 'COMPATIBLE_HVISA',
      label: protocol.interpretationHvisaLabel,
      detail: `Ratio ${ratio.toFixed(3)} falls within the configured hVISA range (${protocol.hvisaLowerThreshold.toFixed(2)} to ${protocol.visaUpperThreshold.toFixed(2)}).`,
    };
  }

  return {
    band: 'EXPERT_REVIEW_VISA_RANGE',
    label: protocol.interpretationAboveLabel,
    detail: `Ratio ${ratio.toFixed(3)} exceeds the configured upper boundary (> ${protocol.visaUpperThreshold.toFixed(2)}); flagged for expert microbiology review without conclusive labeling.`,
  };
}

export function validateExperimentObservations(
  observations: Observation[],
  protocol: ProtocolProfile,
  experimentStatus?: ExperimentStatus
): QaFlagDraft[] {
  const flags: QaFlagDraft[] = [];

  if (experimentStatus === 'CALCULATION_INVALIDATED') {
    flags.push({
      severity: 'WARNING',
      code: 'CALCULATION_STALE',
      message: 'Raw observations or protocol settings were modified after the last calculation.',
      resolutionHint: 'Re-run "Validate inputs" and "Calculate PAP-AUC" to produce an up-to-date analysis record.',
      observationId: null,
      rowReference: null,
      fieldName: null,
    });
  }

  if (observations.length === 0) {
    flags.push({
      severity: 'BLOCKING',
      code: 'NO_OBSERVATIONS',
      message: 'No observations entered for this experiment.',
      resolutionHint: 'Enter observation rows or import a CSV dataset containing Mu3 reference and test isolates.',
      observationId: null,
      rowReference: null,
      fieldName: null,
    });
    return flags;
  }

  const replicateKeys = new Map<string, number>();
  const refObservations: Observation[] = [];
  const testObservations: Observation[] = [];

  observations.forEach((obs, idx) => {
    const rowNum = idx + 1;
    const rowLabel = `Row ${rowNum} (${obs.strainId || 'Unassigned'} @ ${obs.vancomycinConcentrationMgL} mg/L, ${obs.replicateId || 'no rep'})`;

    if (!obs.strainId || obs.strainId.trim() === '') {
      flags.push({
        severity: 'BLOCKING',
        code: 'MISSING_STRAIN_ID',
        message: `${rowLabel}: Strain ID is required.`,
        resolutionHint: 'Provide a non-identifying strain identifier.',
        observationId: obs.id,
        rowReference: `Row ${rowNum}`,
        fieldName: 'strain_id',
      });
    }

    if (!Number.isFinite(obs.vancomycinConcentrationMgL) || obs.vancomycinConcentrationMgL < 0) {
      flags.push({
        severity: 'BLOCKING',
        code: 'NEGATIVE_CONCENTRATION',
        message: `${rowLabel}: Vancomycin concentration cannot be negative.`,
        resolutionHint: 'Enter a concentration >= 0 mg/L.',
        observationId: obs.id,
        rowReference: `Row ${rowNum}`,
        fieldName: 'vancomycin_concentration_mg_L',
      });
    }

    if (!Number.isFinite(obs.platedVolumeMl) || obs.platedVolumeMl <= 0) {
      flags.push({
        severity: 'BLOCKING',
        code: 'INVALID_PLATED_VOLUME',
        message: `${rowLabel}: Plated volume must be greater than 0 mL.`,
        resolutionHint: 'Enter a positive plated volume in mL (e.g. 0.1).',
        observationId: obs.id,
        rowReference: `Row ${rowNum}`,
        fieldName: 'plated_volume_ml',
      });
    }

    if (
      !Number.isFinite(obs.dilutionFraction) ||
      obs.dilutionFraction <= 0 ||
      obs.dilutionFraction > 1
    ) {
      flags.push({
        severity: 'BLOCKING',
        code: 'INVALID_DILUTION_FRACTION',
        message: `${rowLabel}: Dilution fraction (${obs.dilutionFraction}) must be within (0, 1].`,
        resolutionHint: 'Enter the actual plated fraction (e.g. 0.001 for a 10^-3 dilution).',
        observationId: obs.id,
        rowReference: `Row ${rowNum}`,
        fieldName: 'dilution_fraction',
      });
    }

    if (!Number.isFinite(obs.colonyCount) || obs.colonyCount < 0) {
      flags.push({
        severity: 'BLOCKING',
        code: 'NEGATIVE_COLONY_COUNT',
        message: `${rowLabel}: Colony count cannot be negative.`,
        resolutionHint: 'Enter an integer colony count >= 0.',
        observationId: obs.id,
        rowReference: `Row ${rowNum}`,
        fieldName: 'colony_count',
      });
    } else if (!Number.isInteger(obs.colonyCount)) {
      flags.push({
        severity: 'BLOCKING',
        code: 'NON_INTEGER_COLONY_COUNT',
        message: `${rowLabel}: Colony count (${obs.colonyCount}) must be a whole integer.`,
        resolutionHint: 'Round or re-enter the exact observed colony count integer.',
        observationId: obs.id,
        rowReference: `Row ${rowNum}`,
        fieldName: 'colony_count',
      });
    } else if (obs.colonyCount === 0) {
      if (protocol.zeroColonyPolicy === 'UNSPECIFIED') {
        flags.push({
          severity: 'BLOCKING',
          code: 'ZERO_COLONY_UNSPECIFIED_POLICY',
          message: `${rowLabel}: Zero-colony observation requires protocol-defined handling before calculation.`,
          resolutionHint: 'Select a zero-colony handling rule in the active protocol profile (Exclude Point, Detection Limit Floor, or Zero Baseline).',
          observationId: obs.id,
          rowReference: `Row ${rowNum}`,
          fieldName: 'colony_count',
        });
      } else {
        flags.push({
          severity: 'WARNING',
          code: 'ZERO_COLONY_CENSORED',
          message: `${rowLabel}: Zero-colony point requires protocol-defined handling (raw count 0 preserved; active rule: ${protocol.zeroColonyPolicy}).`,
          resolutionHint: 'Verify that the protocol zero-colony rule aligns with laboratory SOP before finalizing review.',
          observationId: obs.id,
          rowReference: `Row ${rowNum}`,
          fieldName: 'colony_count',
        });
      }
    } else if (obs.colonyCount > 300) {
      flags.push({
        severity: 'WARNING',
        code: 'HIGH_COLONY_COUNT_CROWDING',
        message: `${rowLabel}: Colony count (${obs.colonyCount}) exceeds 300 CFU/plate and may be above reliable countable range.`,
        resolutionHint: 'Confirm plate count or check whether a higher dilution plate was intended.',
        observationId: obs.id,
        rowReference: `Row ${rowNum}`,
        fieldName: 'colony_count',
      });
    }

    const repKey = `${obs.strainId.trim()}::${obs.strainRole}::${obs.vancomycinConcentrationMgL}::${obs.replicateId.trim()}`;
    const firstSeenRow = replicateKeys.get(repKey);
    if (firstSeenRow !== undefined) {
      flags.push({
        severity: 'BLOCKING',
        code: 'DUPLICATE_REPLICATE_KEY',
        message: `${rowLabel}: Duplicate observation record matches Row ${firstSeenRow} (same strain, role, concentration, and replicate ID).`,
        resolutionHint: `Assign distinct replicate IDs (e.g. R1, R2) or remove Row ${rowNum} or Row ${firstSeenRow}.`,
        observationId: obs.id,
        rowReference: `Row ${rowNum} (conflicts with Row ${firstSeenRow})`,
        fieldName: 'replicate_id',
      });
    } else {
      replicateKeys.set(repKey, rowNum);
    }

    if (obs.strainRole === 'REFERENCE_MU3') {
      refObservations.push(obs);
    } else {
      testObservations.push(obs);
    }
  });

  // Detect mixed run_id origin tags (e.g. CSV rows imported from incompatible experimental runs)
  const runOriginTags = new Set(
    observations
      .map((o) => {
        const match = o.dataOrigin.match(/RUN_ORIGIN=([^;\s]+)/);
        return match ? match[1] : null;
      })
      .filter((v): v is string => v !== null)
  );
  if (runOriginTags.size > 1) {
    const firstMismatch = observations.find((o) => o.dataOrigin.includes('RUN_ORIGIN='));
    flags.push({
      severity: 'BLOCKING',
      code: 'INCOMPATIBLE_RUN_ORIGIN',
      message: `Observations originate from multiple experimental runs (${[...runOriginTags].join(', ')}). Mu3 reference and test isolates must come from the same experimental run.`,
      resolutionHint: 'Remove rows from other runs and import only observations belonging to this run.',
      observationId: firstMismatch?.id ?? null,
      rowReference: firstMismatch ? `${firstMismatch.strainId} (${firstMismatch.dataOrigin})` : null,
      fieldName: 'data_origin',
    });
  }

  // Check presence of same-run Mu3 reference and test isolates
  if (refObservations.length === 0) {
    flags.push({
      severity: 'BLOCKING',
      code: 'MISSING_MU3_REFERENCE',
      message: 'Missing same-run Mu3 (ATCC 700698) reference observations.',
      resolutionHint: 'Add REFERENCE_MU3 observations from the same experimental run before calculating PAP-AUC ratios.',
      observationId: null,
      rowReference: 'Run-level check',
      fieldName: 'strain_role',
    });
  }

  if (testObservations.length === 0) {
    flags.push({
      severity: 'BLOCKING',
      code: 'MISSING_TEST_ISOLATE',
      message: 'No TEST isolate observations found in this run.',
      resolutionHint: 'Add at least one TEST isolate profile to compare against the Mu3 reference.',
      observationId: null,
      rowReference: 'Run-level check',
      fieldName: 'strain_role',
    });
  }

  // Group by strain for grid, protocol parity, & replicate checks
  const strainMap = new Map<string, Observation[]>();
  const rowIndexById = new Map(observations.map((o, idx) => [o.id, idx + 1]));
  for (const obs of observations) {
    const key = `${obs.strainRole}::${obs.strainId}`;
    const list = strainMap.get(key) ?? [];
    list.push(obs);
    strainMap.set(key, list);
  }

  const refConcentrations = new Set(
    refObservations.map((o) => roundTo(o.vancomycinConcentrationMgL, 4))
  );
  const refPlatedVolumes = new Set(refObservations.map((o) => o.platedVolumeMl));

  // Check reference point sufficiency
  if (refObservations.length > 0) {
    const validRefPoints = refObservations.filter((o) => {
      const m = computeObservationMetrics(o, protocol.zeroColonyPolicy);
      return m.isValidInput && m.effectiveLog10ForCurve !== null;
    });
    const uniqueRefConc = new Set(validRefPoints.map((o) => o.vancomycinConcentrationMgL));
    if (uniqueRefConc.size < 2) {
      flags.push({
        severity: 'BLOCKING',
        code: 'INSUFFICIENT_MU3_POINTS',
        message: 'Mu3 reference profile has fewer than 2 valid concentration points for trapezoidal AUC integration.',
        resolutionHint: 'Provide valid colony counts at two or more vancomycin concentrations for REFERENCE_MU3.',
        observationId: refObservations[0]?.id ?? null,
        rowReference: refObservations[0]
          ? `Row ${rowIndexById.get(refObservations[0].id)} (${refObservations[0].strainId})`
          : null,
        fieldName: 'vancomycin_concentration_mg_L',
      });
    }
  }

  for (const [key, strainObs] of strainMap.entries()) {
    const [role, strainId] = key.split('::');
    const concSet = new Set(strainObs.map((o) => roundTo(o.vancomycinConcentrationMgL, 4)));
    const firstRowNum = rowIndexById.get(strainObs[0]?.id ?? '') ?? 1;

    // Check concentration grid parity & protocol compatibility with Mu3 reference
    if (role === 'TEST' && refConcentrations.size > 0) {
      const shared = [...concSet].filter((c) => refConcentrations.has(c));
      const missingFromTest = [...refConcentrations].filter((c) => !concSet.has(c));
      const extraInTest = [...concSet].filter((c) => !refConcentrations.has(c));

      if (shared.length < 2) {
        flags.push({
          severity: 'BLOCKING',
          code: 'INCOMPATIBLE_CONCENTRATION_GRIDS',
          message: `Test isolate ${strainId} and Mu3 reference share fewer than 2 concentration points (${shared.length} overlapping), indicating incompatible protocol grids.`,
          resolutionHint: 'Ensure test isolate and same-run Mu3 reference use matching vancomycin concentration points.',
          observationId: strainObs[0]?.id ?? null,
          rowReference: `Row ${firstRowNum} (${strainId})`,
          fieldName: 'vancomycin_concentration_mg_L',
        });
      } else if (missingFromTest.length > 0 || extraInTest.length > 0) {
        flags.push({
          severity: 'WARNING',
          code: 'CONCENTRATION_GRID_MISMATCH',
          message: `Test isolate ${strainId} concentration grid differs from same-run Mu3 reference (missing: ${missingFromTest.length > 0 ? missingFromTest.join(', ') + ' mg/L' : 'none'}; extra: ${extraInTest.length > 0 ? extraInTest.join(', ') + ' mg/L' : 'none'}).`,
          resolutionHint: 'Verify that test isolate and Mu3 reference share the same concentration series and protocol grid.',
          observationId: strainObs[0]?.id ?? null,
          rowReference: `Row ${firstRowNum} (${strainId})`,
          fieldName: 'vancomycin_concentration_mg_L',
        });
      }

      // Check plated volume compatibility between Test and Reference
      const testVolumes = new Set(strainObs.map((o) => o.platedVolumeMl));
      const incompatibleVols = [...testVolumes].filter((v) => !refPlatedVolumes.has(v));
      if (incompatibleVols.length > 0) {
        const mismatchObs = strainObs.find((o) => !refPlatedVolumes.has(o.platedVolumeMl)) ?? strainObs[0];
        const mRow = rowIndexById.get(mismatchObs.id) ?? firstRowNum;
        flags.push({
          severity: 'WARNING',
          code: 'TEST_REFERENCE_PROTOCOL_MISMATCH',
          message: `Row ${mRow} (${strainId}): Plated volume (${mismatchObs.platedVolumeMl} mL) differs from Mu3 reference (${[...refPlatedVolumes].join(', ')} mL), indicating potentially incompatible assay protocols.`,
          resolutionHint: 'Verify that test isolate and Mu3 reference followed the same SOP plated volume.',
          observationId: mismatchObs.id,
          rowReference: `Row ${mRow} (${strainId} @ ${mismatchObs.vancomycinConcentrationMgL} mg/L)`,
          fieldName: 'plated_volume_ml',
        });
      }
    }

    // Check against protocol grid
    if (protocol.concentrationGrid.length > 0) {
      const missingProtocolPoints = protocol.concentrationGrid.filter(
        (c) => !concSet.has(roundTo(c, 4))
      );
      if (missingProtocolPoints.length > 0) {
        flags.push({
          severity: 'WARNING',
          code: 'MISSING_PROTOCOL_CONCENTRATION',
          message: `Strain ${strainId} is missing protocol concentration point(s): ${missingProtocolPoints.join(', ')} mg/L (expected by ${protocol.name}).`,
          resolutionHint: 'Add missing concentration point(s) or switch to a matching protocol profile.',
          observationId: strainObs[0]?.id ?? null,
          rowReference: `Row ${firstRowNum} (${strainId})`,
          fieldName: 'vancomycin_concentration_mg_L',
        });
      }
    }

    // Check expected replicates per concentration
    if (protocol.expectedReplicates > 1) {
      const countsByConc = new Map<number, number>();
      for (const o of strainObs) {
        const c = roundTo(o.vancomycinConcentrationMgL, 4);
        countsByConc.set(c, (countsByConc.get(c) ?? 0) + 1);
      }
      for (const [conc, count] of countsByConc.entries()) {
        if (count < protocol.expectedReplicates) {
          const targetObs =
            strainObs.find((o) => roundTo(o.vancomycinConcentrationMgL, 4) === conc) ?? strainObs[0];
          const tRow = rowIndexById.get(targetObs.id) ?? firstRowNum;
          flags.push({
            severity: 'WARNING',
            code: 'MISSING_REPLICATES',
            message: `Row ${tRow} (${strainId} @ ${conc} mg/L): Only ${count} replicate(s) recorded; protocol requires ${protocol.expectedReplicates}.`,
            resolutionHint: 'Add missing replicate observations or adjust expected replicates in the protocol profile.',
            observationId: targetObs.id,
            rowReference: `Row ${tRow} (${strainId} @ ${conc} mg/L)`,
            fieldName: 'replicate_id',
          });
        }
      }
    }

    // Check inconsistent plated volumes within a strain
    const volumes = new Set(strainObs.map((o) => o.platedVolumeMl));
    if (volumes.size > 1) {
      flags.push({
        severity: 'WARNING',
        code: 'INCONSISTENT_PLATED_VOLUME',
        message: `Strain ${strainId} uses multiple plated volumes (${[...volumes].join(', ')} mL) across rows.`,
        resolutionHint: 'Confirm that varying plated volumes were intentional and accurately entered.',
        observationId: strainObs[0]?.id ?? null,
        rowReference: `Row ${firstRowNum} (${strainId})`,
        fieldName: 'plated_volume_ml',
      });
    }

    // Check valid points per test strain
    if (role === 'TEST') {
      const validTestPoints = strainObs.filter((o) => {
        const m = computeObservationMetrics(o, protocol.zeroColonyPolicy);
        return m.isValidInput && m.effectiveLog10ForCurve !== null;
      });
      const uniqueTestConc = new Set(validTestPoints.map((o) => o.vancomycinConcentrationMgL));
      if (uniqueTestConc.size < 2) {
        flags.push({
          severity: 'BLOCKING',
          code: 'INSUFFICIENT_TEST_POINTS',
          message: `Test isolate ${strainId} has fewer than 2 valid concentration points for trapezoidal AUC.`,
          resolutionHint: 'Ensure at least 2 concentrations have valid observations.',
          observationId: strainObs[0]?.id ?? null,
          rowReference: `Row ${firstRowNum} (${strainId})`,
          fieldName: 'vancomycin_concentration_mg_L',
        });
      }
    }
  }

  flags.push({
    severity: 'INFO',
    code: 'PROTOCOL_RUN_CONTEXT',
    message: `Verify Mu3 reference and test isolates belong to the same run and protocol (${protocol.name} v${protocol.version}).`,
    resolutionHint: 'No action required unless comparing across runs, which is prohibited.',
    observationId: null,
    rowReference: 'Run-level metadata',
    fieldName: null,
  });

  return flags;
}

export type ValidationSignalLevel = 'RED' | 'AMBER' | 'GREEN';

export interface QaRuleCheckItem {
  id: string;
  label: string;
  level: ValidationSignalLevel;
  detail: string;
}

export interface ValidationStatusSummary {
  level: ValidationSignalLevel;
  label: string;
  blockingCount: number;
  warningCount: number;
  infoCount: number;
  checklist: QaRuleCheckItem[];
}

export function getValidationStatusSummary(
  flags: Array<Pick<QaFlagDraft, 'severity' | 'code' | 'message'>>,
  observationCount: number,
  experimentStatus?: ExperimentStatus
): ValidationStatusSummary {
  const blockingCount = flags.filter((f) => f.severity === 'BLOCKING').length;
  const warningCount = flags.filter((f) => f.severity === 'WARNING').length;
  const infoCount = flags.filter((f) => f.severity === 'INFO').length;

  const level: ValidationSignalLevel =
    blockingCount > 0 || observationCount === 0
      ? 'RED'
      : warningCount > 0 || experimentStatus === 'CALCULATION_INVALIDATED'
      ? 'AMBER'
      : 'GREEN';

  const label =
    level === 'RED'
      ? 'RED: Blocking error'
      : level === 'AMBER'
      ? 'AMBER: Warning requiring review'
      : 'GREEN: Validation complete';

  const statusForCodes = (codes: string[], passDetail: string): { level: ValidationSignalLevel; detail: string } => {
    const matched = flags.filter((f) => codes.includes(f.code));
    if (matched.some((f) => f.severity === 'BLOCKING')) {
      return { level: 'RED', detail: matched.find((f) => f.severity === 'BLOCKING')!.message };
    }
    if (matched.some((f) => f.severity === 'WARNING')) {
      return { level: 'AMBER', detail: matched.find((f) => f.severity === 'WARNING')!.message };
    }
    return { level: 'GREEN', detail: passDetail };
  };

  const checklist: QaRuleCheckItem[] = [
    {
      id: 'missing-ref',
      label: '1. Mu3 reference observations present',
      ...statusForCodes(
        ['MISSING_MU3_REFERENCE', 'INSUFFICIENT_MU3_POINTS', 'NO_OBSERVATIONS'],
        'Same-run Mu3 reference profile verified (>= 2 valid points).'
      ),
    },
    {
      id: 'missing-conc',
      label: '2. Concentration series complete',
      ...statusForCodes(
        ['CONCENTRATION_GRID_MISMATCH', 'MISSING_PROTOCOL_CONCENTRATION'],
        'All strains match protocol and Mu3 concentration points.'
      ),
    },
    {
      id: 'invalid-inputs',
      label: '3. Valid colony counts, dilutions & volumes',
      ...statusForCodes(
        [
          'MISSING_STRAIN_ID',
          'NEGATIVE_CONCENTRATION',
          'INVALID_PLATED_VOLUME',
          'INVALID_DILUTION_FRACTION',
          'NEGATIVE_COLONY_COUNT',
          'NON_INTEGER_COLONY_COUNT',
          'HIGH_COLONY_COUNT_CROWDING',
        ],
        'All counts are non-negative integers; dilutions in (0,1] and volumes > 0.'
      ),
    },
    {
      id: 'duplicates',
      label: '4. No duplicate observation records',
      ...statusForCodes(
        ['DUPLICATE_REPLICATE_KEY'],
        'All (strain, role, concentration, replicate) keys are unique.'
      ),
    },
    {
      id: 'protocol-compat',
      label: '5. Compatible test & reference protocols',
      ...statusForCodes(
        [
          'INCOMPATIBLE_CONCENTRATION_GRIDS',
          'TEST_REFERENCE_PROTOCOL_MISMATCH',
          'INCONSISTENT_PLATED_VOLUME',
          'INCOMPATIBLE_RUN_ORIGIN',
        ],
        'Test and Mu3 reference share compatible grids, volumes, and run origin.'
      ),
    },
    {
      id: 'zero-colony',
      label: '6. Zero-colony protocol handling',
      ...statusForCodes(
        ['ZERO_COLONY_UNSPECIFIED_POLICY', 'ZERO_COLONY_CENSORED'],
        'No censored zero-colony observations present.'
      ),
    },
    {
      id: 'replicates',
      label: '7. Replicate completeness',
      ...statusForCodes(
        ['MISSING_REPLICATES'],
        'Replicate counts satisfy protocol expectations.'
      ),
    },
    {
      id: 'recalc',
      label: '8. Calculation synchronized with raw data',
      ...statusForCodes(
        ['CALCULATION_STALE'],
        experimentStatus === 'CALCULATED' || experimentStatus === 'REVIEWED'
          ? 'Latest calculation matches current raw observations.'
          : 'Ready for calculation or awaiting initial run.'
      ),
    },
  ];

  return {
    level,
    label,
    blockingCount,
    warningCount,
    infoCount,
    checklist,
  };
}

function buildStrainProfile(
  strainId: string,
  strainRole: StrainRole,
  strainObs: Observation[],
  derivedById: Map<string, ObservationDerived>,
  protocol: ProtocolProfile
): StrainProfileResult {
  const byConc = new Map<number, Observation[]>();
  for (const obs of strainObs) {
    const c = roundTo(obs.vancomycinConcentrationMgL, 4);
    const list = byConc.get(c) ?? [];
    list.push(obs);
    byConc.set(c, list);
  }

  const sortedConcs = [...byConc.keys()].sort((a, b) => a - b);
  const points: CurveConcentrationPoint[] = [];
  const validCurvePoints: Array<{ x: number; y: number }> = [];

  for (const conc of sortedConcs) {
    const group = byConc.get(conc) ?? [];
    const replicates: CurveReplicatePoint[] = [];
    const effectiveValues: number[] = [];
    let censoredCount = 0;

    for (const obs of group) {
      const d = derivedById.get(obs.id)!;
      replicates.push({
        observationId: obs.id,
        replicateId: obs.replicateId,
        colonyCount: obs.colonyCount,
        cfuPerMl: d.cfuPerMl,
        log10CfuPerMl: d.log10CfuPerMl,
        effectiveLog10: d.effectiveLog10ForCurve,
        isZeroCensored: d.isZeroCensored,
      });
      if (d.isZeroCensored) censoredCount++;
      if (d.isValidInput && d.effectiveLog10ForCurve !== null) {
        effectiveValues.push(d.effectiveLog10ForCurve);
      }
    }

    const aggregated = aggregateValues(effectiveValues, protocol.aggregationMethod);
    points.push({
      concentrationMgL: conc,
      aggregatedLog10CfuPerMl: aggregated,
      replicates,
      includedCount: effectiveValues.length,
      censoredCount,
    });

    if (aggregated !== null) {
      validCurvePoints.push({ x: conc, y: aggregated });
    }
  }

  const { auc, segments } = calculateTrapezoidalAuc(validCurvePoints);

  return {
    strainId,
    strainRole,
    points,
    validCurvePoints,
    segments,
    auc,
    papAucRatio: null,
    interpretationBand: 'NOT_CALCULATED',
    interpretationLabel: strainRole === 'REFERENCE_MU3' ? 'Reference Control (Mu3)' : 'Not calculated',
    interpretationDetail:
      strainRole === 'REFERENCE_MU3'
        ? 'Same-run Mu3 reference denominator for PAP-AUC ratios.'
        : 'Pending ratio calculation.',
    cannotComputeReason: auc === null ? 'Fewer than 2 valid concentration points.' : null,
  };
}

export function runPapAucAnalysis(
  observations: Observation[],
  protocol: ProtocolProfile,
  experimentStatus?: ExperimentStatus
): {
  canCalculate: boolean;
  flags: QaFlagDraft[];
  payload: CalculationResultPayload | null;
} {
  const flags = validateExperimentObservations(observations, protocol, experimentStatus);
  const hasBlocking = flags.some((f) => f.severity === 'BLOCKING');

  const derivedList = observations.map((obs) =>
    computeObservationMetrics(obs, protocol.zeroColonyPolicy)
  );
  const derivedById = new Map(derivedList.map((d) => [d.observationId, d]));

  if (hasBlocking) {
    return {
      canCalculate: false,
      flags,
      payload: null,
    };
  }

  const refObs = observations.filter((o) => o.strainRole === 'REFERENCE_MU3');
  const testObsByStrain = new Map<string, Observation[]>();
  for (const obs of observations) {
    if (obs.strainRole === 'TEST') {
      const list = testObsByStrain.get(obs.strainId) ?? [];
      list.push(obs);
      testObsByStrain.set(obs.strainId, list);
    }
  }

  const refStrainId = refObs[0]?.strainId ?? 'MU3-REF';
  const referenceProfile = buildStrainProfile(
    refStrainId,
    'REFERENCE_MU3',
    refObs,
    derivedById,
    protocol
  );

  const mu3Auc = referenceProfile.auc;
  const testProfiles: StrainProfileResult[] = [];

  for (const [strainId, strainObs] of testObsByStrain.entries()) {
    const profile = buildStrainProfile(strainId, 'TEST', strainObs, derivedById, protocol);
    if (mu3Auc === null || mu3Auc <= 0) {
      profile.papAucRatio = null;
      profile.interpretationBand = 'NOT_CALCULATED';
      profile.interpretationLabel = 'Ratio not computed';
      profile.cannotComputeReason = 'Same-run Mu3 reference AUC is missing or non-positive.';
    } else if (profile.auc === null) {
      profile.papAucRatio = null;
      profile.interpretationBand = 'NOT_CALCULATED';
      profile.interpretationLabel = 'Ratio not computed';
      profile.cannotComputeReason = 'Test isolate AUC could not be integrated.';
    } else {
      const ratio = roundTo(profile.auc / mu3Auc, 4);
      const classification = classifyPapAucRatio(ratio, protocol);
      profile.papAucRatio = ratio;
      profile.interpretationBand = classification.band;
      profile.interpretationLabel = classification.label;
      profile.interpretationDetail = classification.detail;
      profile.cannotComputeReason = null;
    }
    testProfiles.push(profile);
  }

  return {
    canCalculate: true,
    flags,
    payload: {
      calculationVersion: CALCULATION_ENGINE_VERSION,
      protocolProfileId: protocol.id,
      protocolName: protocol.name,
      protocolVersion: protocol.version,
      sourceCitation: protocol.sourceCitation,
      disclaimerText: protocol.disclaimerText,
      zeroColonyPolicy: protocol.zeroColonyPolicy,
      aggregationMethod: protocol.aggregationMethod,
      hvisaLowerThreshold: protocol.hvisaLowerThreshold,
      visaUpperThreshold: protocol.visaUpperThreshold,
      mu3StrainId: refStrainId,
      mu3Auc,
      referenceProfile,
      testProfiles,
      observationDerived: derivedList,
    },
  };
}

export function parseObservationsCsv(csvText: string): CsvParseResult {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: ['CSV must contain a header row and at least one observation row.'],
    };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const required = [
    'strain_id',
    'strain_role',
    'vancomycin_concentration_mg_l',
    'replicate_id',
    'dilution_fraction',
    'plated_volume_ml',
    'colony_count',
  ];

  const missingHeaders = required.filter((col) => !headers.includes(col));
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [`Missing required CSV columns: ${missingHeaders.join(', ')}`],
    };
  }

  const idxOf = (col: string) => headers.indexOf(col);
  const rows: CsvParseResult['rows'] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    if (cells.length < required.length) {
      errors.push(`Line ${i + 1}: fewer columns than expected.`);
      continue;
    }

    const rawRole = cells[idxOf('strain_role')].toUpperCase();
    const strainRole: StrainRole =
      rawRole === 'REFERENCE_MU3' || rawRole === 'REFERENCE' ? 'REFERENCE_MU3' : 'TEST';

    const conc = Number(cells[idxOf('vancomycin_concentration_mg_l')]);
    const dil = Number(cells[idxOf('dilution_fraction')]);
    const vol = Number(cells[idxOf('plated_volume_ml')]);
    const count = Number(cells[idxOf('colony_count')]);

    if (
      !Number.isFinite(conc) ||
      !Number.isFinite(dil) ||
      !Number.isFinite(vol) ||
      !Number.isFinite(count)
    ) {
      errors.push(`Line ${i + 1}: numeric field contains non-numeric value.`);
      continue;
    }

    const runIdIdx = idxOf('run_id');
    const originIdx = idxOf('data_origin');

    rows.push({
      runId: runIdIdx >= 0 ? cells[runIdIdx] : '',
      strainId: cells[idxOf('strain_id')],
      strainRole,
      vancomycinConcentrationMgL: conc,
      replicateId: cells[idxOf('replicate_id')] || 'R1',
      dilutionFraction: dil,
      platedVolumeMl: vol,
      colonyCount: count,
      dataOrigin: originIdx >= 0 && cells[originIdx] ? cells[originIdx] : 'IMPORTED_SYNTHETIC_DEMO',
    });
  }

  const distinctRunIds = new Set(rows.map((r) => r.runId).filter((r) => r.length > 0));
  if (distinctRunIds.size > 1) {
    for (const r of rows) {
      if (r.runId && !r.dataOrigin.includes('RUN_ORIGIN=')) {
        r.dataOrigin = `${r.dataOrigin};RUN_ORIGIN=${r.runId}`;
      }
    }
  }

  return { rows, errors };
}

export function serializeObservationsCsv(observations: Observation[], runId: string): string {
  const header =
    'run_id,strain_id,strain_role,vancomycin_concentration_mg_L,replicate_id,dilution_fraction,plated_volume_ml,colony_count,data_origin';
  const lines = observations.map((o) =>
    [
      runId,
      o.strainId,
      o.strainRole,
      o.vancomycinConcentrationMgL,
      o.replicateId,
      o.dilutionFraction,
      o.platedVolumeMl,
      o.colonyCount,
      o.dataOrigin,
    ].join(',')
  );
  return [header, ...lines].join('\n');
}

function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function serializeDerivedObservationsCsv(
  observations: Observation[],
  derivedList: ObservationDerived[],
  context: {
    runId: string;
    protocolName: string;
    protocolVersion: string;
    zeroColonyPolicy: ZeroColonyPolicy;
    calculationVersion: string;
    calculatedAt: string;
    isSyntheticDemo: boolean;
  }
): string {
  const derivedById = new Map(derivedList.map((d) => [d.observationId, d]));
  const header = [
    'run_id',
    'data_classification',
    'protocol_name',
    'protocol_version',
    'zero_colony_policy',
    'calculation_version',
    'calculated_at',
    'strain_id',
    'strain_role',
    'vancomycin_concentration_mg_L',
    'replicate_id',
    'dilution_fraction',
    'plated_volume_ml',
    'colony_count',
    'cfu_per_ml',
    'log10_cfu_per_ml',
    'is_zero_censored',
    'effective_log10_for_curve',
    'handling_note',
    'data_origin',
  ].join(',');

  const lines = observations.map((o) => {
    const d = derivedById.get(o.id) ?? computeObservationMetrics(o, context.zeroColonyPolicy);
    return [
      context.runId,
      context.isSyntheticDemo ? 'SYNTHETIC_DEMO_NOT_REAL_LAB_DATA' : 'LABORATORY_RUN',
      context.protocolName,
      context.protocolVersion,
      context.zeroColonyPolicy,
      context.calculationVersion,
      context.calculatedAt,
      o.strainId,
      o.strainRole,
      o.vancomycinConcentrationMgL,
      o.replicateId,
      o.dilutionFraction,
      o.platedVolumeMl,
      o.colonyCount,
      d.cfuPerMl !== null ? d.cfuPerMl : '',
      d.log10CfuPerMl !== null ? d.log10CfuPerMl.toFixed(6) : 'UNDEFINED_LOG10_0',
      d.isZeroCensored ? 'YES' : 'NO',
      d.effectiveLog10ForCurve !== null ? d.effectiveLog10ForCurve.toFixed(6) : 'EXCLUDED',
      d.handlingNote,
      o.dataOrigin,
    ]
      .map(csvCell)
      .join(',');
  });

  return [header, ...lines].join('\n');
}


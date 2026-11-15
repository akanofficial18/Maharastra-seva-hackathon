import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../src/db/schema.ts';
import {
  parseObservationsCsv,
  runPapAucAnalysis,
  validateExperimentObservations,
} from '../src/lib/papAucEngine.ts';
import type {
  AggregationMethod,
  AuditEvent,
  AuthSessionResponse,
  AuthUser,
  AuthUserDirectoryItem,
  CalculationRecord,
  CalculationResultPayload,
  CampStatus,
  ClusterSurveillanceStat,
  ColdChainMethod,
  ComparativeDataset,
  ComparativeRunItem,
  ConnectivityProfile,
  DashboardSummary,
  DispatchStatus,
  Experiment,
  ExperimentDetail,
  ExperimentStatus,
  ExperimentSummaryItem,
  FieldSampleDispatch,
  ForgotPasswordResponse,
  Isolate,
  MobileClinicCamp,
  Observation,
  ProtocolProfile,
  PublicPortalOverview,
  QaFlag,
  ReferenceStrain,
  ReviewDecision,
  ReviewRecord,
  StrainRole,
  TribalCluster,
  TribalLanguageCode,
  TribalOutreachOverview,
  UserRole,
  ZeroColonyPolicy,
} from '../src/types/hvisa.ts';

export interface ActorContext {
  actorId: string;
  actorRole: UserRole;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'hvisa_insight.db');
const SAMPLE_CSV_PATH = path.resolve(
  process.cwd(),
  'public/assets/aistudio/sample_data_0c69188b.csv'
);

const FALLBACK_SAMPLE_CSV = `run_id,strain_id,strain_role,vancomycin_concentration_mg_L,replicate_id,dilution_fraction,plated_volume_ml,colony_count,data_origin
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

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function readSampleCsvText(): string {
  if (fs.existsSync(SAMPLE_CSV_PATH)) {
    return fs.readFileSync(SAMPLE_CSV_PATH, 'utf8');
  }
  return FALLBACK_SAMPLE_CSV;
}

class HvisaDatabase {
  private db: DatabaseSync;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.db = new DatabaseSync(DB_PATH);
    this.db.exec(SCHEMA_SQL);
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
    );
    this.ensureProtocolColumns();
    this.ensureAuthColumns();
    this.seedIfEmpty();
    this.ensureAuthSeeded();
  }

  private ensureAuthColumns(): void {
    const cols = this.db.prepare(`PRAGMA table_info(auth_users)`).all();
    const names = new Set(cols.map((c) => String(c.name)));
    if (!names.has('email')) {
      this.db.exec(`ALTER TABLE auth_users ADD COLUMN email TEXT NOT NULL DEFAULT ''`);
    }
    if (!names.has('preferred_language')) {
      this.db.exec(
        `ALTER TABLE auth_users ADD COLUMN preferred_language TEXT NOT NULL DEFAULT 'en'`
      );
    }
    if (!names.has('high_contrast')) {
      this.db.exec(
        `ALTER TABLE auth_users ADD COLUMN high_contrast INTEGER NOT NULL DEFAULT 0`
      );
    }
    if (!names.has('failed_login_attempts')) {
      this.db.exec(
        `ALTER TABLE auth_users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0`
      );
    }
    if (!names.has('locked_until')) {
      this.db.exec(`ALTER TABLE auth_users ADD COLUMN locked_until TEXT`);
    }

    // Backfill emails for pre-seeded demo users if missing
    this.db
      .prepare(`UPDATE auth_users SET email = 'analyst@hvisa-demo.org' WHERE username = 'analyst' AND (email IS NULL OR email = '')`)
      .run();
    this.db
      .prepare(`UPDATE auth_users SET email = 'reviewer@hvisa-demo.org' WHERE username = 'reviewer' AND (email IS NULL OR email = '')`)
      .run();
    this.db
      .prepare(`UPDATE auth_users SET email = 'auditor@hvisa-demo.org' WHERE username = 'auditor' AND (email IS NULL OR email = '')`)
      .run();
  }

  private ensureProtocolColumns(): void {
    const cols = this.db.prepare(`PRAGMA table_info(protocol_profiles)`).all();
    const names = new Set(cols.map((c) => String(c.name)));
    if (!names.has('default_plated_volume_ml')) {
      this.db.exec(
        `ALTER TABLE protocol_profiles ADD COLUMN default_plated_volume_ml REAL NOT NULL DEFAULT 0.1`
      );
    }
    if (!names.has('default_dilution_fraction')) {
      this.db.exec(
        `ALTER TABLE protocol_profiles ADD COLUMN default_dilution_fraction REAL NOT NULL DEFAULT 0.001`
      );
    }
    if (!names.has('incubation_conditions')) {
      this.db.exec(
        `ALTER TABLE protocol_profiles ADD COLUMN incubation_conditions TEXT NOT NULL DEFAULT 'BHI agar, 37 C for 48 hours'`
      );
    }
  }

  private mapProtocol(row: Record<string, unknown>): ProtocolProfile {
    return {
      id: String(row.id),
      name: String(row.name),
      version: String(row.version),
      sourceCitation: String(row.source_citation),
      concentrationGrid: JSON.parse(String(row.concentration_grid_json)) as number[],
      expectedReplicates: Number(row.expected_replicates),
      defaultPlatedVolumeMl: Number(row.default_plated_volume_ml ?? 0.1),
      defaultDilutionFraction: Number(row.default_dilution_fraction ?? 0.001),
      incubationConditions: String(
        row.incubation_conditions ?? 'BHI agar, 37 C for 48 hours'
      ),
      zeroColonyPolicy: String(row.zero_colony_policy) as ZeroColonyPolicy,
      aggregationMethod: String(row.aggregation_method) as AggregationMethod,
      hvisaLowerThreshold: Number(row.hvisa_lower_threshold),
      visaUpperThreshold: Number(row.visa_upper_threshold),
      interpretationBelowLabel: String(row.interpretation_below_label),
      interpretationHvisaLabel: String(row.interpretation_hvisa_label),
      interpretationAboveLabel: String(row.interpretation_above_label),
      disclaimerText: String(row.disclaimer_text),
      updatedAt: String(row.updated_at),
      updatedBy: String(row.updated_by),
    };
  }

  private mapReferenceStrain(row: Record<string, unknown>): ReferenceStrain {
    return {
      id: String(row.id),
      strainCode: String(row.strain_code),
      atccNumber: String(row.atcc_number),
      species: String(row.species),
      description: String(row.description),
      isSyntheticDemo: Boolean(row.is_synthetic_demo),
    };
  }

  private mapExperiment(row: Record<string, unknown>): Experiment {
    return {
      id: String(row.id),
      runId: String(row.run_id),
      experimentDate: String(row.experiment_date),
      protocolProfileId: String(row.protocol_profile_id),
      referenceStrainId: String(row.reference_strain_id),
      analystId: String(row.analyst_id),
      notes: String(row.notes),
      status: String(row.status) as ExperimentStatus,
      isSyntheticDemo: Boolean(row.is_synthetic_demo),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private mapIsolate(row: Record<string, unknown>): Isolate {
    return {
      id: String(row.id),
      experimentId: String(row.experiment_id),
      strainId: String(row.strain_id),
      strainRole: String(row.strain_role) as StrainRole,
      displayLabel: String(row.display_label),
      notes: String(row.notes),
    };
  }

  private mapObservation(row: Record<string, unknown>): Observation {
    return {
      id: String(row.id),
      experimentId: String(row.experiment_id),
      isolateId: String(row.isolate_id),
      strainId: String(row.strain_id),
      strainRole: String(row.strain_role) as StrainRole,
      vancomycinConcentrationMgL: Number(row.vancomycin_concentration_mg_L),
      replicateId: String(row.replicate_id),
      dilutionFraction: Number(row.dilution_fraction),
      platedVolumeMl: Number(row.plated_volume_ml),
      colonyCount: Number(row.colony_count),
      dataOrigin: String(row.data_origin),
      rowOrder: Number(row.row_order),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private mapCalculation(row: Record<string, unknown>): CalculationRecord {
    return {
      id: String(row.id),
      experimentId: String(row.experiment_id),
      calculationVersion: String(row.calculation_version),
      protocolProfileId: String(row.protocol_profile_id),
      protocolVersion: String(row.protocol_version),
      protocolSnapshot: JSON.parse(String(row.protocol_snapshot_json)) as ProtocolProfile,
      mu3Auc: row.mu3_auc === null ? null : Number(row.mu3_auc),
      isValid: Boolean(row.is_valid),
      results: JSON.parse(String(row.results_json)) as CalculationResultPayload,
      calculatedBy: String(row.calculated_by),
      calculatedAt: String(row.calculated_at),
    };
  }

  private mapQaFlag(row: Record<string, unknown>): QaFlag {
    return {
      id: String(row.id),
      experimentId: String(row.experiment_id),
      calculationId: row.calculation_id ? String(row.calculation_id) : null,
      severity: String(row.severity) as QaFlag['severity'],
      code: String(row.code),
      message: String(row.message),
      resolutionHint: String(row.resolution_hint),
      observationId: row.observation_id ? String(row.observation_id) : null,
      rowReference: row.row_reference ? String(row.row_reference) : null,
      fieldName: row.field_name ? String(row.field_name) : null,
      acknowledged: Boolean(row.acknowledged),
      acknowledgedBy: row.acknowledged_by ? String(row.acknowledged_by) : null,
      acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : null,
      createdAt: String(row.created_at),
    };
  }

  private mapReview(row: Record<string, unknown>): ReviewRecord {
    return {
      id: String(row.id),
      experimentId: String(row.experiment_id),
      calculationId: row.calculation_id ? String(row.calculation_id) : null,
      reviewerId: String(row.reviewer_id),
      reviewerRole: String(row.reviewer_role) as UserRole,
      decision: String(row.decision) as ReviewDecision,
      comment: String(row.comment),
      createdAt: String(row.created_at),
    };
  }

  private mapAudit(row: Record<string, unknown>): AuditEvent {
    return {
      id: String(row.id),
      experimentId: row.experiment_id ? String(row.experiment_id) : null,
      runId: row.run_id ? String(row.run_id) : null,
      actorId: String(row.actor_id),
      actorRole: String(row.actor_role) as UserRole,
      actionType: String(row.action_type),
      entityType: String(row.entity_type),
      entityId: String(row.entity_id),
      summary: String(row.summary),
      diffJson: row.diff_json ? String(row.diff_json) : null,
      createdAt: String(row.created_at),
    };
  }

  private logAudit(
    experimentId: string | null,
    actor: ActorContext,
    actionType: string,
    entityType: string,
    entityId: string,
    summary: string,
    diff?: unknown
  ): void {
    this.db
      .prepare(
        `INSERT INTO audit_history (id, experiment_id, actor_id, actor_role, action_type, entity_type, entity_id, summary, diff_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        uid('aud'),
        experimentId,
        actor.actorId,
        actor.actorRole,
        actionType,
        entityType,
        entityId,
        summary,
        diff !== undefined ? JSON.stringify(diff) : null,
        nowIso()
      );
  }

  private seedIfEmpty(): void {
    const protoCount = this.db.prepare(`SELECT COUNT(*) AS c FROM protocol_profiles`).get();
    if (Number(protoCount?.c ?? 0) === 0) {
      const ts = nowIso();
      const insertProto = this.db.prepare(
        `INSERT INTO protocol_profiles (
          id, name, version, source_citation, concentration_grid_json, expected_replicates,
          default_plated_volume_ml, default_dilution_fraction, incubation_conditions,
          zero_colony_policy, aggregation_method, hvisa_lower_threshold, visa_upper_threshold,
          interpretation_below_label, interpretation_hvisa_label, interpretation_above_label,
          disclaimer_text, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      insertProto.run(
        'proto-icmr-2019',
        'ICMR SOP profile (editable)',
        '2019.2-demo',
        'ICMR Bacteriology SOP (2nd ed., 2019) — Test AUC / Mu3 AUC scheme (editable laboratory profile)',
        JSON.stringify([0.5, 1.0, 2.0, 2.5, 4.0]),
        1,
        0.1,
        0.001,
        'BHI agar with vancomycin gradient, 37 C aerobic incubation for 48 hours',
        'DETECTION_LIMIT',
        'ARITHMETIC_MEAN_LOG10',
        0.9,
        1.3,
        'Below commonly used hVISA PAP-AUC threshold (< 0.90)',
        'Compatible with hVISA range in configured PAP-AUC scheme (0.90–1.30)',
        'Flagged for expert review: potentially within VISA-associated range (> 1.30)',
        'Laboratory QA & population-analysis research prototype only. Not a clinical diagnostic device; does not recommend antimicrobial therapy or patient management.',
        ts,
        'SYSTEM_SEED'
      );

      insertProto.run(
        'proto-strict-exclude',
        'Strict Censored Exclusion SOP',
        '1.0-demo',
        'Conservative PAP-AUC profile omitting below-detection zero-colony points from trapezoidal integration',
        JSON.stringify([0.5, 1.0, 2.0, 2.5, 4.0]),
        2,
        0.1,
        0.001,
        'BHI agar, duplicate plates per concentration, 37 C for 48 hours',
        'EXCLUDE_POINT',
        'ARITHMETIC_MEAN_LOG10',
        0.9,
        1.3,
        'Below configured hVISA PAP-AUC threshold (< 0.90)',
        'Compatible with hVISA range in configured PAP-AUC scheme (0.90–1.30)',
        'Flagged for expert review: potentially within VISA-associated range (> 1.30)',
        'Laboratory QA & population-analysis research prototype only. Not a clinical diagnostic device; does not recommend antimicrobial therapy or patient management.',
        ts,
        'SYSTEM_SEED'
      );
    }

    const refCount = this.db.prepare(`SELECT COUNT(*) AS c FROM reference_strains`).get();
    if (Number(refCount?.c ?? 0) === 0) {
      this.db
        .prepare(
          `INSERT INTO reference_strains (id, strain_code, atcc_number, species, description, is_synthetic_demo)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          'ref-mu3-atcc700698',
          'Mu3',
          'ATCC 700698',
          'Staphylococcus aureus',
          'Standard reference hVISA control strain included in same-run PAP-AUC assays (synthetic demo records).',
          1
        );
    }

    const expCount = this.db.prepare(`SELECT COUNT(*) AS c FROM experiments`).get();
    if (Number(expCount?.c ?? 0) === 0) {
      const systemActor: ActorContext = {
        actorId: 'DEMO-ANALYST-01',
        actorRole: 'LAB_ANALYST',
      };

      // 1. Seed DEMO-RUN-001 from sample_data.csv
      const sampleText = readSampleCsvText();
      const parsed = parseObservationsCsv(sampleText);
      const exp1 = this.createExperiment(
        {
          runId: 'DEMO-RUN-001',
          experimentDate: '2026-11-12',
          protocolProfileId: 'proto-icmr-2019',
          referenceStrainId: 'ref-mu3-atcc700698',
          analystId: 'DEMO-ANALYST-01',
          notes:
            'SYNTHETIC DEMONSTRATION RUN loaded from sample_data.csv. Demonstrates Mu3 reference comparison, Test isolate 01 (compatible hVISA range), and Test isolate 02 (zero-colony point at 4.0 mg/L).',
          isSyntheticDemo: true,
        },
        systemActor
      );

      this.replaceObservations(
        exp1.experiment.id,
        parsed.rows.map((r) => ({
          strainId: r.strainId,
          strainRole: r.strainRole,
          vancomycinConcentrationMgL: r.vancomycinConcentrationMgL,
          replicateId: r.replicateId,
          dilutionFraction: r.dilutionFraction,
          platedVolumeMl: r.platedVolumeMl,
          colonyCount: r.colonyCount,
          dataOrigin: r.dataOrigin,
        })),
        systemActor
      );

      this.calculateExperiment(exp1.experiment.id, systemActor);

      // 2. Seed DEMO-RUN-002-QA (intentionally incomplete/invalid run for QA demonstration)
      const exp2 = this.createExperiment(
        {
          runId: 'DEMO-RUN-002-QA',
          experimentDate: '2026-11-14',
          protocolProfileId: 'proto-icmr-2019',
          referenceStrainId: 'ref-mu3-atcc700698',
          analystId: 'DEMO-ANALYST-02',
          notes:
            'SYNTHETIC QA DEMONSTRATION RUN with intentional validation defects (duplicate replicate key, non-integer count, mismatched concentration grid) to demonstrate blocking and warning QA flags.',
          isSyntheticDemo: true,
        },
        systemActor
      );

      this.replaceObservations(
        exp2.experiment.id,
        [
          {
            strainId: 'MU3-REF',
            strainRole: 'REFERENCE_MU3',
            vancomycinConcentrationMgL: 0.5,
            replicateId: 'R1',
            dilutionFraction: 0.001,
            platedVolumeMl: 0.1,
            colonyCount: 175,
            dataOrigin: 'SYNTHETIC_DEMO_QA_INCOMPLETE',
          },
          {
            strainId: 'MU3-REF',
            strainRole: 'REFERENCE_MU3',
            vancomycinConcentrationMgL: 1.0,
            replicateId: 'R1',
            dilutionFraction: 0.001,
            platedVolumeMl: 0.1,
            colonyCount: 138,
            dataOrigin: 'SYNTHETIC_DEMO_QA_INCOMPLETE',
          },
          {
            strainId: 'MU3-REF',
            strainRole: 'REFERENCE_MU3',
            vancomycinConcentrationMgL: 2.0,
            replicateId: 'R1',
            dilutionFraction: 0.001,
            platedVolumeMl: 0.1,
            colonyCount: 88,
            dataOrigin: 'SYNTHETIC_DEMO_QA_INCOMPLETE',
          },
          {
            strainId: 'DEMO-ISO-QA1',
            strainRole: 'TEST',
            vancomycinConcentrationMgL: 0.5,
            replicateId: 'R1',
            dilutionFraction: 0.001,
            platedVolumeMl: 0.1,
            colonyCount: 162,
            dataOrigin: 'SYNTHETIC_DEMO_QA_INCOMPLETE',
          },
          {
            strainId: 'DEMO-ISO-QA1',
            strainRole: 'TEST',
            vancomycinConcentrationMgL: 1.0,
            replicateId: 'R1',
            dilutionFraction: 0.001,
            platedVolumeMl: 0.1,
            colonyCount: 118.5,
            dataOrigin: 'SYNTHETIC_DEMO_QA_INCOMPLETE',
          },
          {
            strainId: 'DEMO-ISO-QA1',
            strainRole: 'TEST',
            vancomycinConcentrationMgL: 1.0,
            replicateId: 'R1',
            dilutionFraction: 0.001,
            platedVolumeMl: 0.1,
            colonyCount: 114,
            dataOrigin: 'SYNTHETIC_DEMO_QA_INCOMPLETE',
          },
          {
            strainId: 'DEMO-ISO-QA1',
            strainRole: 'TEST',
            vancomycinConcentrationMgL: 4.0,
            replicateId: 'R1',
            dilutionFraction: 0.001,
            platedVolumeMl: 0.1,
            colonyCount: 0,
            dataOrigin: 'SYNTHETIC_DEMO_QA_INCOMPLETE',
          },
        ],
        systemActor
      );

      this.validateExperiment(exp2.experiment.id, systemActor);
    }

    // One-time idempotent seed for DEMO-RUN-003-COMP (multi-run, duplicate-replicate comparative demo)
    const compSeeded = this.db
      .prepare(`SELECT value FROM app_meta WHERE key = 'seeded_comp_run_v1'`)
      .get();
    if (!compSeeded) {
      const existingComp = this.db
        .prepare(`SELECT id FROM experiments WHERE run_id = 'DEMO-RUN-003-COMP'`)
        .get();
      if (!existingComp) {
        const compActor: ActorContext = {
          actorId: 'DEMO-ANALYST-03',
          actorRole: 'LAB_ANALYST',
        };
        const strictProto = this.getProtocol('proto-strict-exclude');
        const protoId = strictProto ? strictProto.id : 'proto-icmr-2019';
        const exp3 = this.createExperiment(
          {
            runId: 'DEMO-RUN-003-COMP',
            experimentDate: '2026-11-15',
            protocolProfileId: protoId,
            referenceStrainId: 'ref-mu3-atcc700698',
            analystId: 'DEMO-ANALYST-03',
            notes:
              'SYNTHETIC COMPARATIVE DEMONSTRATION RUN using Strict Censored Exclusion SOP (2 replicates). Contains DEMO-ISO-01 (cross-run replicate variance) and DEMO-ISO-03 (> 1.30 ratio flagged for expert review).',
            isSyntheticDemo: true,
          },
          compActor
        );

        this.replaceObservations(
          exp3.experiment.id,
          [
            // MU3-REF (duplicate replicates R1, R2)
            { strainId: 'MU3-REF', strainRole: 'REFERENCE_MU3', vancomycinConcentrationMgL: 0.5, replicateId: 'R1', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 182, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'MU3-REF', strainRole: 'REFERENCE_MU3', vancomycinConcentrationMgL: 0.5, replicateId: 'R2', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 174, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'MU3-REF', strainRole: 'REFERENCE_MU3', vancomycinConcentrationMgL: 1.0, replicateId: 'R1', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 142, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'MU3-REF', strainRole: 'REFERENCE_MU3', vancomycinConcentrationMgL: 1.0, replicateId: 'R2', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 138, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'MU3-REF', strainRole: 'REFERENCE_MU3', vancomycinConcentrationMgL: 2.0, replicateId: 'R1', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 90, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'MU3-REF', strainRole: 'REFERENCE_MU3', vancomycinConcentrationMgL: 2.0, replicateId: 'R2', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 86, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'MU3-REF', strainRole: 'REFERENCE_MU3', vancomycinConcentrationMgL: 2.5, replicateId: 'R1', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 46, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'MU3-REF', strainRole: 'REFERENCE_MU3', vancomycinConcentrationMgL: 2.5, replicateId: 'R2', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 42, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'MU3-REF', strainRole: 'REFERENCE_MU3', vancomycinConcentrationMgL: 4.0, replicateId: 'R1', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 10, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'MU3-REF', strainRole: 'REFERENCE_MU3', vancomycinConcentrationMgL: 4.0, replicateId: 'R2', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 12, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },

            // DEMO-ISO-01 (repeated across runs for cross-run variance view)
            { strainId: 'DEMO-ISO-01', strainRole: 'TEST', vancomycinConcentrationMgL: 0.5, replicateId: 'R1', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 188, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-01', strainRole: 'TEST', vancomycinConcentrationMgL: 0.5, replicateId: 'R2', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 180, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-01', strainRole: 'TEST', vancomycinConcentrationMgL: 1.0, replicateId: 'R1', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 146, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-01', strainRole: 'TEST', vancomycinConcentrationMgL: 1.0, replicateId: 'R2', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 140, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-01', strainRole: 'TEST', vancomycinConcentrationMgL: 2.0, replicateId: 'R1', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 94, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-01', strainRole: 'TEST', vancomycinConcentrationMgL: 2.0, replicateId: 'R2', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 90, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-01', strainRole: 'TEST', vancomycinConcentrationMgL: 2.5, replicateId: 'R1', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 49, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-01', strainRole: 'TEST', vancomycinConcentrationMgL: 2.5, replicateId: 'R2', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 45, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-01', strainRole: 'TEST', vancomycinConcentrationMgL: 4.0, replicateId: 'R1', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 14, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-01', strainRole: 'TEST', vancomycinConcentrationMgL: 4.0, replicateId: 'R2', dilutionFraction: 0.001, platedVolumeMl: 0.1, colonyCount: 11, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },

            // DEMO-ISO-03 (> 1.30 ratio flagged for expert review under 10^-5 dilution)
            { strainId: 'DEMO-ISO-03', strainRole: 'TEST', vancomycinConcentrationMgL: 0.5, replicateId: 'R1', dilutionFraction: 0.00001, platedVolumeMl: 0.1, colonyCount: 185, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-03', strainRole: 'TEST', vancomycinConcentrationMgL: 0.5, replicateId: 'R2', dilutionFraction: 0.00001, platedVolumeMl: 0.1, colonyCount: 175, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-03', strainRole: 'TEST', vancomycinConcentrationMgL: 1.0, replicateId: 'R1', dilutionFraction: 0.00001, platedVolumeMl: 0.1, colonyCount: 152, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-03', strainRole: 'TEST', vancomycinConcentrationMgL: 1.0, replicateId: 'R2', dilutionFraction: 0.00001, platedVolumeMl: 0.1, colonyCount: 148, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-03', strainRole: 'TEST', vancomycinConcentrationMgL: 2.0, replicateId: 'R1', dilutionFraction: 0.00001, platedVolumeMl: 0.1, colonyCount: 112, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-03', strainRole: 'TEST', vancomycinConcentrationMgL: 2.0, replicateId: 'R2', dilutionFraction: 0.00001, platedVolumeMl: 0.1, colonyCount: 108, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-03', strainRole: 'TEST', vancomycinConcentrationMgL: 2.5, replicateId: 'R1', dilutionFraction: 0.00001, platedVolumeMl: 0.1, colonyCount: 86, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-03', strainRole: 'TEST', vancomycinConcentrationMgL: 2.5, replicateId: 'R2', dilutionFraction: 0.00001, platedVolumeMl: 0.1, colonyCount: 82, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-03', strainRole: 'TEST', vancomycinConcentrationMgL: 4.0, replicateId: 'R1', dilutionFraction: 0.00001, platedVolumeMl: 0.1, colonyCount: 46, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
            { strainId: 'DEMO-ISO-03', strainRole: 'TEST', vancomycinConcentrationMgL: 4.0, replicateId: 'R2', dilutionFraction: 0.00001, platedVolumeMl: 0.1, colonyCount: 42, dataOrigin: 'SYNTHETIC_DEMO_COMPARATIVE' },
          ],
          compActor
        );

        this.calculateExperiment(exp3.experiment.id, compActor);
      }
      this.db
        .prepare(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seeded_comp_run_v1', ?)`)
        .run(nowIso());
    }

    // One-time idempotent seed for Tribal Outreach clusters, dispatches & camps
    const tribalSeeded = this.db
      .prepare(`SELECT value FROM app_meta WHERE key = 'seeded_tribal_outreach_v1'`)
      .get();
    if (!tribalSeeded) {
      this.seedTribalOutreachData();
      this.db
        .prepare(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seeded_tribal_outreach_v1', ?)`)
        .run(nowIso());
    }
  }

  private computeViabilityAlert(
    transitHours: number,
    coldChainIntact: boolean,
    coldChainMethod: ColdChainMethod
  ): 'OK' | 'DELAY_WARNING' | 'COLD_CHAIN_BREACH' {
    if (!coldChainIntact || (coldChainMethod === 'AMBIENT_CARRIER' && transitHours > 12)) {
      return 'COLD_CHAIN_BREACH';
    }
    if (transitHours > 24) {
      return 'DELAY_WARNING';
    }
    return 'OK';
  }

  private seedTribalOutreachData(): void {
    const clusterCount = this.db.prepare(`SELECT COUNT(*) AS c FROM tribal_clusters`).get();
    if (Number(clusterCount?.c ?? 0) > 0) return;

    const ts = nowIso();
    const insertCluster = this.db.prepare(
      `INSERT INTO tribal_clusters (
        id, cluster_code, name, district, state_name, primary_language,
        connectivity_profile, referral_lab_name, active_chw_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertCluster.run(
      'cl-gadchiroli',
      'PHC-GAD-01',
      'Bhamragad Forest PHC & Mobile Unit',
      'Gadchiroli',
      'Maharashtra',
      'mr',
      'OFFLINE_FIRST',
      'District Civil Hospital Microbiology Lab, Gadchiroli',
      14,
      ts
    );
    insertCluster.run(
      'cl-nandurbar',
      'PHC-NAN-02',
      'Dhadgaon Satpura Tribal Block',
      'Nandurbar',
      'Maharashtra',
      'mr',
      'INTERMITTENT',
      'Sub-District Referral Lab, Nandurbar',
      19,
      ts
    );
    insertCluster.run(
      'cl-koraput',
      'PHC-KOR-03',
      'Mandla Rural Outreach Clinic',
      'Mandla',
      'Madhya Pradesh',
      'hi',
      'OFFLINE_FIRST',
      'District Microbiology Referral Unit, Mandla',
      11,
      ts
    );
    insertCluster.run(
      'cl-mayurbhanj',
      'PHC-MAY-04',
      'Surguja Foothill Health Cluster',
      'Surguja',
      'Chhattisgarh',
      'hi',
      'INTERMITTENT',
      'District Public Health Lab, Ambikapur',
      16,
      ts
    );

    const run1 = this.db
      .prepare(`SELECT id FROM experiments WHERE run_id = 'DEMO-RUN-001' LIMIT 1`)
      .get();
    const run3 = this.db
      .prepare(`SELECT id FROM experiments WHERE run_id = 'DEMO-RUN-003-COMP' LIMIT 1`)
      .get();

    const insertDispatch = this.db.prepare(
      `INSERT INTO field_sample_dispatches (
        id, sample_code, cluster_id, experiment_id, village_name, chw_id,
        collected_at, cold_chain_method, transit_hours, cold_chain_intact,
        viability_alert, status, notes, synced_from_offline, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertDispatch.run(
      'dsp-001',
      'TRB-GAD-041',
      'cl-gadchiroli',
      run1?.id ? String(run1.id) : null,
      'Laheri Hamlet',
      'ASHA-GAD-03',
      '2026-11-11T08:30:00Z',
      'ICE_BOX_2_8C',
      14.5,
      1,
      'OK',
      'REPORT_RETURNED',
      'Synthetic demo dispatch: ice-pack carrier verified on arrival; linked to DEMO-RUN-001.',
      1,
      ts,
      ts
    );

    insertDispatch.run(
      'dsp-002',
      'TRB-NAN-018',
      'cl-nandurbar',
      run3?.id ? String(run3.id) : null,
      'Toranmal Pada',
      'ASHA-NAN-07',
      '2026-11-14T06:15:00Z',
      'ICE_BOX_2_8C',
      18.0,
      1,
      'OK',
      'RECEIVED_AT_LAB',
      'Synthetic demo dispatch: linked to comparative run DEMO-RUN-003-COMP.',
      0,
      ts,
      ts
    );

    insertDispatch.run(
      'dsp-003',
      'TRB-KOR-009',
      'cl-koraput',
      null,
      'Machhkund Ridge',
      'CHW-KOR-02',
      '2026-11-14T11:00:00Z',
      'ICE_BOX_2_8C',
      29.5,
      1,
      'DELAY_WARNING',
      'IN_TRANSIT',
      'Monsoon road detour delayed jeep handoff (>24h transit threshold). Inspect colony viability on receipt.',
      1,
      ts,
      ts
    );

    insertDispatch.run(
      'dsp-004',
      'TRB-MAY-012',
      'cl-mayurbhanj',
      null,
      'Jashipur Tola',
      'ASHA-MAY-05',
      '2026-11-15T04:20:00Z',
      'PORTABLE_INCUBATOR',
      6.5,
      1,
      'OK',
      'IN_TRANSIT',
      'Collected during mobile wound-care camp; expected at Baripada lab today.',
      0,
      ts,
      ts
    );

    const insertCamp = this.db.prepare(
      `INSERT INTO mobile_clinic_camps (
        id, camp_code, cluster_id, village_name, camp_date,
        services_summary, lead_chw_id, expected_households, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertCamp.run(
      'cmp-001',
      'CAMP-GAD-11',
      'cl-gadchiroli',
      'Kuwakodi & Laheri',
      '2026-11-18',
      'Wound dressing hygiene kits, Gondi audio antibiotic counseling, anonymized swab collection',
      'ASHA-GAD-03',
      45,
      'SCHEDULED',
      ts,
      ts
    );

    insertCamp.run(
      'cmp-002',
      'CAMP-NAN-08',
      'cl-nandurbar',
      'Toranmal & Chinchpada',
      '2026-11-16',
      'Mobile PHC screening, clean-water storage check, Marathi health card distribution',
      'ASHA-NAN-07',
      60,
      'ACTIVE',
      ts,
      ts
    );

    insertCamp.run(
      'cmp-003',
      'CAMP-MAY-04',
      'cl-mayurbhanj',
      'Jashipur Tola',
      '2026-11-13',
      'Community handwashing workshop & Santali antibiotic completion follow-up',
      'ASHA-MAY-05',
      38,
      'COMPLETED',
      ts,
      ts
    );
  }

  listProtocols(): ProtocolProfile[] {
    const rows = this.db
      .prepare(`SELECT * FROM protocol_profiles ORDER BY id ASC`)
      .all();
    return rows.map((r) => this.mapProtocol(r));
  }

  getProtocol(id: string): ProtocolProfile | null {
    const row = this.db
      .prepare(`SELECT * FROM protocol_profiles WHERE id = ?`)
      .get(id);
    return row ? this.mapProtocol(row) : null;
  }

  createProtocol(
    input: {
      name: string;
      version: string;
      sourceCitation: string;
      concentrationGrid: number[];
      expectedReplicates: number;
      defaultPlatedVolumeMl: number;
      defaultDilutionFraction: number;
      incubationConditions: string;
      zeroColonyPolicy: ZeroColonyPolicy;
      aggregationMethod: AggregationMethod;
      hvisaLowerThreshold: number;
      visaUpperThreshold: number;
      interpretationBelowLabel: string;
      interpretationHvisaLabel: string;
      interpretationAboveLabel: string;
      disclaimerText: string;
    },
    actor: ActorContext
  ): ProtocolProfile {
    if (!input.name.trim()) {
      throw new Error('Protocol name is required.');
    }
    if (!Array.isArray(input.concentrationGrid) || input.concentrationGrid.length < 2) {
      throw new Error('Concentration series must contain at least 2 numeric concentrations.');
    }
    if (input.hvisaLowerThreshold <= 0 || input.visaUpperThreshold <= input.hvisaLowerThreshold) {
      throw new Error('Upper threshold must be greater than lower threshold, and both must be positive.');
    }
    if (input.defaultPlatedVolumeMl <= 0 || input.defaultDilutionFraction <= 0 || input.defaultDilutionFraction > 1) {
      throw new Error('Default plated volume must be > 0 and dilution fraction must be in (0, 1].');
    }

    const id = uid('proto');
    const ts = nowIso();
    const sortedGrid = Array.from(new Set(input.concentrationGrid)).sort((a, b) => a - b);

    this.db
      .prepare(
        `INSERT INTO protocol_profiles (
          id, name, version, source_citation, concentration_grid_json, expected_replicates,
          default_plated_volume_ml, default_dilution_fraction, incubation_conditions,
          zero_colony_policy, aggregation_method, hvisa_lower_threshold, visa_upper_threshold,
          interpretation_below_label, interpretation_hvisa_label, interpretation_above_label,
          disclaimer_text, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.name.trim(),
        input.version.trim() || '1.0-custom',
        input.sourceCitation.trim() || 'Custom laboratory PAP-AUC protocol profile',
        JSON.stringify(sortedGrid),
        Math.max(1, Math.round(input.expectedReplicates || 1)),
        input.defaultPlatedVolumeMl,
        input.defaultDilutionFraction,
        input.incubationConditions.trim() || 'BHI agar, 37 C for 48 hours',
        input.zeroColonyPolicy,
        input.aggregationMethod,
        input.hvisaLowerThreshold,
        input.visaUpperThreshold,
        input.interpretationBelowLabel.trim(),
        input.interpretationHvisaLabel.trim(),
        input.interpretationAboveLabel.trim(),
        input.disclaimerText.trim() || 'Laboratory QA prototype only. Not a clinical diagnostic device.',
        ts,
        actor.actorId
      );

    this.logAudit(
      null,
      actor,
      'PROTOCOL_CREATED',
      'protocol_profile',
      id,
      `Created protocol profile "${input.name.trim()}" (v${input.version || '1.0-custom'}) with grid [${sortedGrid.join(', ')}] mg/L.`,
      input
    );

    return this.getProtocol(id)!;
  }

  updateProtocol(
    id: string,
    patch: Partial<{
      name: string;
      version: string;
      sourceCitation: string;
      concentrationGrid: number[];
      expectedReplicates: number;
      defaultPlatedVolumeMl: number;
      defaultDilutionFraction: number;
      incubationConditions: string;
      zeroColonyPolicy: ZeroColonyPolicy;
      aggregationMethod: AggregationMethod;
      hvisaLowerThreshold: number;
      visaUpperThreshold: number;
      interpretationBelowLabel: string;
      interpretationHvisaLabel: string;
      interpretationAboveLabel: string;
      disclaimerText: string;
    }>,
    actor: ActorContext
  ): ProtocolProfile {
    const existing = this.getProtocol(id);
    if (!existing) {
      throw new Error(`Protocol profile ${id} not found.`);
    }

    const nextGrid = patch.concentrationGrid
      ? Array.from(new Set(patch.concentrationGrid)).sort((a, b) => a - b)
      : existing.concentrationGrid;

    if (nextGrid.length < 2) {
      throw new Error('Concentration series must contain at least 2 concentrations.');
    }

    const next: ProtocolProfile = {
      ...existing,
      ...patch,
      concentrationGrid: nextGrid,
      expectedReplicates: Math.max(
        1,
        Math.round(patch.expectedReplicates ?? existing.expectedReplicates)
      ),
      updatedAt: nowIso(),
      updatedBy: actor.actorId,
    };

    if (next.hvisaLowerThreshold <= 0 || next.visaUpperThreshold <= next.hvisaLowerThreshold) {
      throw new Error('Upper threshold must be greater than lower threshold, and both must be positive.');
    }
    if (next.defaultPlatedVolumeMl <= 0 || next.defaultDilutionFraction <= 0 || next.defaultDilutionFraction > 1) {
      throw new Error('Default plated volume must be > 0 and dilution fraction must be in (0, 1].');
    }

    this.db
      .prepare(
        `UPDATE protocol_profiles
         SET name = ?, version = ?, source_citation = ?, concentration_grid_json = ?,
             expected_replicates = ?, default_plated_volume_ml = ?, default_dilution_fraction = ?,
             incubation_conditions = ?, zero_colony_policy = ?, aggregation_method = ?,
             hvisa_lower_threshold = ?, visa_upper_threshold = ?,
             interpretation_below_label = ?, interpretation_hvisa_label = ?, interpretation_above_label = ?,
             disclaimer_text = ?, updated_at = ?, updated_by = ?
         WHERE id = ?`
      )
      .run(
        next.name,
        next.version,
        next.sourceCitation,
        JSON.stringify(next.concentrationGrid),
        next.expectedReplicates,
        next.defaultPlatedVolumeMl,
        next.defaultDilutionFraction,
        next.incubationConditions,
        next.zeroColonyPolicy,
        next.aggregationMethod,
        next.hvisaLowerThreshold,
        next.visaUpperThreshold,
        next.interpretationBelowLabel,
        next.interpretationHvisaLabel,
        next.interpretationAboveLabel,
        next.disclaimerText,
        next.updatedAt,
        next.updatedBy,
        id
      );

    // Invalidate calculations on experiments using this protocol if threshold/method changed
    const affectedExps = this.db
      .prepare(`SELECT id, status FROM experiments WHERE protocol_profile_id = ?`)
      .all(id);
    for (const expRow of affectedExps) {
      const expId = String(expRow.id);
      const status = String(expRow.status);
      if (status === 'CALCULATED' || status === 'REVIEWED') {
        this.db
          .prepare(`UPDATE calculations SET is_valid = 0 WHERE experiment_id = ?`)
          .run(expId);
        this.db
          .prepare(`UPDATE experiments SET status = 'CALCULATION_INVALIDATED', updated_at = ? WHERE id = ?`)
          .run(nowIso(), expId);
      }
      this.logAudit(
        expId,
        actor,
        'PROTOCOL_UPDATED',
        'protocol_profile',
        id,
        `Protocol profile "${next.name}" updated (${next.zeroColonyPolicy}, thresholds ${next.hvisaLowerThreshold.toFixed(2)}–${next.visaUpperThreshold.toFixed(2)}); active calculations marked for recalculation.`,
        patch
      );
    }

    return next;
  }

  listReferenceStrains(): ReferenceStrain[] {
    return this.db
      .prepare(`SELECT * FROM reference_strains ORDER BY strain_code ASC`)
      .all()
      .map((r) => this.mapReferenceStrain(r));
  }

  listExperiments(): ExperimentSummaryItem[] {
    const rows = this.db
      .prepare(
        `SELECT e.*, p.name AS protocol_name, p.version AS protocol_version
         FROM experiments e
         JOIN protocol_profiles p ON p.id = e.protocol_profile_id
         ORDER BY e.updated_at DESC`
      )
      .all();

    return rows.map((row) => {
      const expId = String(row.id);
      const testIsoCount = this.db
        .prepare(`SELECT COUNT(DISTINCT strain_id) AS c FROM isolates WHERE experiment_id = ? AND strain_role = 'TEST'`)
        .get(expId);
      const obsCount = this.db
        .prepare(`SELECT COUNT(*) AS c FROM observations WHERE experiment_id = ?`)
        .get(expId);
      const blockingCount = this.db
        .prepare(`SELECT COUNT(*) AS c FROM qa_flags WHERE experiment_id = ? AND severity = 'BLOCKING'`)
        .get(expId);
      const warningCount = this.db
        .prepare(`SELECT COUNT(*) AS c FROM qa_flags WHERE experiment_id = ? AND severity = 'WARNING'`)
        .get(expId);
      const latestCalc = this.db
        .prepare(`SELECT calculated_at, mu3_auc FROM calculations WHERE experiment_id = ? ORDER BY calculated_at DESC LIMIT 1`)
        .get(expId);

      return {
        id: expId,
        runId: String(row.run_id),
        experimentDate: String(row.experiment_date),
        protocolProfileId: String(row.protocol_profile_id),
        protocolName: String(row.protocol_name),
        protocolVersion: String(row.protocol_version),
        analystId: String(row.analyst_id),
        status: String(row.status) as ExperimentStatus,
        isSyntheticDemo: Boolean(row.is_synthetic_demo),
        testIsolateCount: Number(testIsoCount?.c ?? 0),
        observationCount: Number(obsCount?.c ?? 0),
        blockingFlagCount: Number(blockingCount?.c ?? 0),
        warningFlagCount: Number(warningCount?.c ?? 0),
        latestCalculationAt: latestCalc?.calculated_at ? String(latestCalc.calculated_at) : null,
        latestMu3Auc:
          latestCalc?.mu3_auc !== null && latestCalc?.mu3_auc !== undefined
            ? Number(latestCalc.mu3_auc)
            : null,
        updatedAt: String(row.updated_at),
      };
    });
  }

  getDashboardSummary(): DashboardSummary {
    const recentExperiments = this.listExperiments();
    const totalExperiments = recentExperiments.length;
    const calculatedExperiments = recentExperiments.filter(
      (e) => e.status === 'CALCULATED' || e.status === 'REVIEWED'
    ).length;
    const pendingReviewCount = recentExperiments.filter(
      (e) => e.status === 'CALCULATED'
    ).length;
    const reviewedCount = recentExperiments.filter((e) => e.status === 'REVIEWED').length;
    const blockingQaExperimentsCount = recentExperiments.filter(
      (e) => e.blockingFlagCount > 0
    ).length;

    return {
      totalExperiments,
      calculatedExperiments,
      pendingReviewCount,
      reviewedCount,
      blockingQaExperimentsCount,
      recentExperiments,
    };
  }

  getExperimentDetail(id: string): ExperimentDetail | null {
    const expRow = this.db.prepare(`SELECT * FROM experiments WHERE id = ?`).get(id);
    if (!expRow) return null;
    const experiment = this.mapExperiment(expRow);
    const protocol = this.getProtocol(experiment.protocolProfileId);
    const refRow = this.db
      .prepare(`SELECT * FROM reference_strains WHERE id = ?`)
      .get(experiment.referenceStrainId);
    if (!protocol || !refRow) return null;

    const isolates = this.db
      .prepare(`SELECT * FROM isolates WHERE experiment_id = ? ORDER BY strain_role ASC, strain_id ASC`)
      .all(id)
      .map((r) => this.mapIsolate(r));

    const observations = this.db
      .prepare(`SELECT * FROM observations WHERE experiment_id = ? ORDER BY row_order ASC, created_at ASC`)
      .all(id)
      .map((r) => this.mapObservation(r));

    const calcRow = this.db
      .prepare(`SELECT * FROM calculations WHERE experiment_id = ? ORDER BY calculated_at DESC LIMIT 1`)
      .get(id);

    const qaFlags = this.db
      .prepare(`SELECT * FROM qa_flags WHERE experiment_id = ? ORDER BY CASE severity WHEN 'BLOCKING' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END, created_at ASC`)
      .all(id)
      .map((r) => this.mapQaFlag(r));

    const reviews = this.db
      .prepare(`SELECT * FROM reviews WHERE experiment_id = ? ORDER BY created_at DESC`)
      .all(id)
      .map((r) => this.mapReview(r));

    const auditHistory = this.db
      .prepare(`SELECT * FROM audit_history WHERE experiment_id = ? ORDER BY created_at DESC LIMIT 100`)
      .all(id)
      .map((r) => this.mapAudit(r));

    return {
      experiment,
      protocol,
      referenceStrain: this.mapReferenceStrain(refRow),
      isolates,
      observations,
      latestCalculation: calcRow ? this.mapCalculation(calcRow) : null,
      qaFlags,
      reviews,
      auditHistory,
    };
  }

  createExperiment(
    input: {
      runId: string;
      experimentDate: string;
      protocolProfileId: string;
      referenceStrainId: string;
      analystId: string;
      notes?: string;
      isSyntheticDemo?: boolean;
    },
    actor: ActorContext
  ): ExperimentDetail {
    const id = uid('exp');
    const ts = nowIso();
    const cleanRunId = input.runId.trim();
    if (!cleanRunId) {
      throw new Error('Run ID is required.');
    }

    this.db
      .prepare(
        `INSERT INTO experiments (
          id, run_id, experiment_date, protocol_profile_id, reference_strain_id,
          analyst_id, notes, status, is_synthetic_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`
      )
      .run(
        id,
        cleanRunId,
        input.experimentDate || ts.slice(0, 10),
        input.protocolProfileId,
        input.referenceStrainId,
        input.analystId || actor.actorId,
        input.notes ?? '',
        input.isSyntheticDemo === false ? 0 : 1,
        ts,
        ts
      );

    this.logAudit(
      id,
      actor,
      'EXPERIMENT_CREATED',
      'experiment',
      id,
      `Created experiment ${cleanRunId} using protocol ${input.protocolProfileId}.`,
      input
    );

    return this.getExperimentDetail(id)!;
  }

  updateExperimentMetadata(
    id: string,
    patch: Partial<{
      runId: string;
      experimentDate: string;
      protocolProfileId: string;
      referenceStrainId: string;
      analystId: string;
      notes: string;
    }>,
    actor: ActorContext
  ): ExperimentDetail {
    const existing = this.getExperimentDetail(id);
    if (!existing) throw new Error('Experiment not found.');
    const exp = existing.experiment;

    const protocolChanged =
      patch.protocolProfileId !== undefined &&
      patch.protocolProfileId !== exp.protocolProfileId;

    const nextRunId = patch.runId !== undefined ? patch.runId.trim() : exp.runId;
    const nextDate = patch.experimentDate ?? exp.experimentDate;
    const nextProto = patch.protocolProfileId ?? exp.protocolProfileId;
    const nextRef = patch.referenceStrainId ?? exp.referenceStrainId;
    const nextAnalyst = patch.analystId ?? exp.analystId;
    const nextNotes = patch.notes ?? exp.notes;

    let nextStatus = exp.status;
    if (protocolChanged && (exp.status === 'CALCULATED' || exp.status === 'REVIEWED')) {
      nextStatus = 'CALCULATION_INVALIDATED';
      this.db.prepare(`UPDATE calculations SET is_valid = 0 WHERE experiment_id = ?`).run(id);
    }

    this.db
      .prepare(
        `UPDATE experiments
         SET run_id = ?, experiment_date = ?, protocol_profile_id = ?, reference_strain_id = ?,
             analyst_id = ?, notes = ?, status = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(nextRunId, nextDate, nextProto, nextRef, nextAnalyst, nextNotes, nextStatus, nowIso(), id);

    this.logAudit(
      id,
      actor,
      'EXPERIMENT_METADATA_UPDATED',
      'experiment',
      id,
      protocolChanged
        ? `Updated experiment metadata & switched protocol to ${nextProto}; prior calculation invalidated.`
        : `Updated experiment metadata for ${nextRunId}.`,
      patch
    );

    if (protocolChanged) {
      this.validateExperiment(id, actor, true);
    }

    return this.getExperimentDetail(id)!;
  }

  replaceObservations(
    experimentId: string,
    rows: Array<{
      id?: string;
      strainId: string;
      strainRole: StrainRole;
      vancomycinConcentrationMgL: number;
      replicateId: string;
      dilutionFraction: number;
      platedVolumeMl: number;
      colonyCount: number;
      dataOrigin?: string;
    }>,
    actor: ActorContext
  ): ExperimentDetail {
    const detail = this.getExperimentDetail(experimentId);
    if (!detail) throw new Error('Experiment not found.');

    const ts = nowIso();
    const hadPriorCalculation =
      detail.experiment.status === 'CALCULATED' ||
      detail.experiment.status === 'REVIEWED' ||
      detail.latestCalculation !== null;

    const previousSnapshot = detail.observations.map((o) => ({
      strainId: o.strainId,
      strainRole: o.strainRole,
      vancomycinConcentrationMgL: o.vancomycinConcentrationMgL,
      replicateId: o.replicateId,
      dilutionFraction: o.dilutionFraction,
      platedVolumeMl: o.platedVolumeMl,
      colonyCount: o.colonyCount,
      dataOrigin: o.dataOrigin,
    }));

    const hasOriginalSnapshot = Boolean(
      this.db
        .prepare(
          `SELECT id FROM audit_history WHERE experiment_id = ? AND action_type = 'ORIGINAL_OBSERVATIONS_CAPTURED' LIMIT 1`
        )
        .get(experimentId)
    );

    this.db.exec('BEGIN');
    try {
      this.db.prepare(`DELETE FROM observations WHERE experiment_id = ?`).run(experimentId);
      this.db.prepare(`DELETE FROM isolates WHERE experiment_id = ?`).run(experimentId);

      // Build distinct isolates
      const isolateIdMap = new Map<string, string>();
      const insertIsolate = this.db.prepare(
        `INSERT INTO isolates (id, experiment_id, strain_id, strain_role, display_label, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      const insertObs = this.db.prepare(
        `INSERT INTO observations (
          id, experiment_id, isolate_id, strain_id, strain_role,
          vancomycin_concentration_mg_L, replicate_id, dilution_fraction,
          plated_volume_ml, colony_count, data_origin, row_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      rows.forEach((row, index) => {
        const cleanStrain = row.strainId.trim() || 'UNNAMED';
        const isoKey = `${row.strainRole}::${cleanStrain}`;
        let isolateId = isolateIdMap.get(isoKey);
        if (!isolateId) {
          isolateId = uid('iso');
          isolateIdMap.set(isoKey, isolateId);
          insertIsolate.run(
            isolateId,
            experimentId,
            cleanStrain,
            row.strainRole,
            row.strainRole === 'REFERENCE_MU3' ? `${cleanStrain} (Mu3 Reference)` : cleanStrain,
            ''
          );
        }

        const obsId = row.id && row.id.startsWith('obs-') ? row.id : uid('obs');
        insertObs.run(
          obsId,
          experimentId,
          isolateId,
          cleanStrain,
          row.strainRole,
          Number(row.vancomycinConcentrationMgL),
          row.replicateId.trim() || 'R1',
          Number(row.dilutionFraction),
          Number(row.platedVolumeMl),
          Number(row.colonyCount),
          row.dataOrigin?.trim() || 'SYNTHETIC_DEMO_MANUAL_ENTRY',
          index + 1,
          ts,
          ts
        );
      });

      const nextStatus: ExperimentStatus = hadPriorCalculation
        ? 'CALCULATION_INVALIDATED'
        : 'DRAFT';

      if (hadPriorCalculation) {
        this.db
          .prepare(`UPDATE calculations SET is_valid = 0 WHERE experiment_id = ?`)
          .run(experimentId);
      }

      this.db
        .prepare(`UPDATE experiments SET status = ?, updated_at = ? WHERE id = ?`)
        .run(nextStatus, ts, experimentId);

      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }

    const newSnapshot = rows.map((r) => ({
      strainId: r.strainId.trim() || 'UNNAMED',
      strainRole: r.strainRole,
      vancomycinConcentrationMgL: Number(r.vancomycinConcentrationMgL),
      replicateId: r.replicateId.trim() || 'R1',
      dilutionFraction: Number(r.dilutionFraction),
      platedVolumeMl: Number(r.platedVolumeMl),
      colonyCount: Number(r.colonyCount),
      dataOrigin: r.dataOrigin?.trim() || 'SYNTHETIC_DEMO_MANUAL_ENTRY',
    }));

    if (!hasOriginalSnapshot && newSnapshot.length > 0) {
      this.logAudit(
        experimentId,
        actor,
        'ORIGINAL_OBSERVATIONS_CAPTURED',
        'observation_batch',
        experimentId,
        `Preserved immutable baseline snapshot of ${newSnapshot.length} original observation row(s).`,
        { originalObservations: newSnapshot }
      );
    }

    this.logAudit(
      experimentId,
      actor,
      'OBSERVATIONS_SAVED',
      'observation_batch',
      experimentId,
      `Saved ${rows.length} observation row(s)${hadPriorCalculation ? ' — prior calculation invalidated; recalculation required' : ''}.`,
      {
        rowCount: rows.length,
        previousRowCount: previousSnapshot.length,
        invalidatedPriorCalculation: hadPriorCalculation,
        previousObservations: previousSnapshot,
        newObservations: newSnapshot,
      }
    );

    // Re-run validation flags automatically after saving observations
    this.validateExperiment(experimentId, actor, true);
    return this.getExperimentDetail(experimentId)!;
  }

  validateExperiment(
    experimentId: string,
    actor: ActorContext,
    silentAudit = false
  ): ExperimentDetail {
    const detail = this.getExperimentDetail(experimentId);
    if (!detail) throw new Error('Experiment not found.');

    const flags = validateExperimentObservations(
      detail.observations,
      detail.protocol,
      detail.experiment.status
    );
    const hasBlocking = flags.some((f) => f.severity === 'BLOCKING');
    const ts = nowIso();

    this.db.prepare(`DELETE FROM qa_flags WHERE experiment_id = ?`).run(experimentId);
    const insertFlag = this.db.prepare(
      `INSERT INTO qa_flags (
        id, experiment_id, calculation_id, severity, code, message, resolution_hint,
        observation_id, row_reference, field_name, acknowledged, acknowledged_by, acknowledged_at, created_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?)`
    );

    for (const f of flags) {
      insertFlag.run(
        uid('qa'),
        experimentId,
        f.severity,
        f.code,
        f.message,
        f.resolutionHint,
        f.observationId,
        f.rowReference,
        f.fieldName,
        ts
      );
    }

    if (
      !hasBlocking &&
      detail.experiment.status === 'DRAFT'
    ) {
      this.db
        .prepare(`UPDATE experiments SET status = 'VALIDATED', updated_at = ? WHERE id = ?`)
        .run(ts, experimentId);
    }

    if (!silentAudit) {
      this.logAudit(
        experimentId,
        actor,
        'INPUTS_VALIDATED',
        'experiment',
        experimentId,
        `Validated ${detail.observations.length} observations: ${flags.filter((f) => f.severity === 'BLOCKING').length} blocking, ${flags.filter((f) => f.severity === 'WARNING').length} warning(s).`
      );
    }

    return this.getExperimentDetail(experimentId)!;
  }

  calculateExperiment(experimentId: string, actor: ActorContext): {
    ok: boolean;
    error?: string;
    detail: ExperimentDetail;
  } {
    const detail = this.getExperimentDetail(experimentId);
    if (!detail) throw new Error('Experiment not found.');

    // Run deterministic calculation + QA validation (pass VALIDATED so stale warning clears upon fresh run)
    const analysis = runPapAucAnalysis(detail.observations, detail.protocol, 'VALIDATED');
    const ts = nowIso();

    this.db.prepare(`DELETE FROM qa_flags WHERE experiment_id = ?`).run(experimentId);
    const insertFlag = this.db.prepare(
      `INSERT INTO qa_flags (
        id, experiment_id, calculation_id, severity, code, message, resolution_hint,
        observation_id, row_reference, field_name, acknowledged, acknowledged_by, acknowledged_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?)`
    );

    if (!analysis.canCalculate || !analysis.payload) {
      for (const f of analysis.flags) {
        insertFlag.run(
          uid('qa'),
          experimentId,
          null,
          f.severity,
          f.code,
          f.message,
          f.resolutionHint,
          f.observationId,
          f.rowReference,
          f.fieldName,
          ts
        );
      }

      this.logAudit(
        experimentId,
        actor,
        'CALCULATION_BLOCKED',
        'experiment',
        experimentId,
        `PAP-AUC calculation blocked by ${analysis.flags.filter((f) => f.severity === 'BLOCKING').length} blocking QA error(s).`
      );

      return {
        ok: false,
        error: 'Calculation blocked due to unresolved blocking QA errors.',
        detail: this.getExperimentDetail(experimentId)!,
      };
    }

    const calcId = uid('calc');
    this.db
      .prepare(`UPDATE calculations SET is_valid = 0 WHERE experiment_id = ?`)
      .run(experimentId);

    this.db
      .prepare(
        `INSERT INTO calculations (
          id, experiment_id, calculation_version, protocol_profile_id, protocol_version,
          protocol_snapshot_json, mu3_auc, is_valid, results_json, calculated_by, calculated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .run(
        calcId,
        experimentId,
        analysis.payload.calculationVersion,
        detail.protocol.id,
        detail.protocol.version,
        JSON.stringify(detail.protocol),
        analysis.payload.mu3Auc,
        JSON.stringify(analysis.payload),
        actor.actorId,
        ts
      );

    for (const f of analysis.flags) {
      insertFlag.run(
        uid('qa'),
        experimentId,
        calcId,
        f.severity,
        f.code,
        f.message,
        f.resolutionHint,
        f.observationId,
        f.rowReference,
        f.fieldName,
        ts
      );
    }

    this.db
      .prepare(`UPDATE experiments SET status = 'CALCULATED', updated_at = ? WHERE id = ?`)
      .run(ts, experimentId);

    this.logAudit(
      experimentId,
      actor,
      'PAP_AUC_CALCULATED',
      'calculation',
      calcId,
      `Calculated trapezoidal PAP-AUC (${analysis.payload.calculationVersion}): Mu3 AUC = ${analysis.payload.mu3Auc?.toFixed(3)}, ${analysis.payload.testProfiles.length} test isolate(s).`
    );

    return {
      ok: true,
      detail: this.getExperimentDetail(experimentId)!,
    };
  }

  acknowledgeQaFlag(experimentId: string, flagId: string, actor: ActorContext): ExperimentDetail {
    const ts = nowIso();
    this.db
      .prepare(
        `UPDATE qa_flags SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?
         WHERE id = ? AND experiment_id = ?`
      )
      .run(actor.actorId, ts, flagId, experimentId);

    this.logAudit(
      experimentId,
      actor,
      'QA_FLAG_ACKNOWLEDGED',
      'qa_flag',
      flagId,
      `Acknowledged QA flag ${flagId}.`
    );

    return this.getExperimentDetail(experimentId)!;
  }

  addReview(
    experimentId: string,
    decision: ReviewDecision,
    comment: string,
    actor: ActorContext
  ): ExperimentDetail {
    const detail = this.getExperimentDetail(experimentId);
    if (!detail) throw new Error('Experiment not found.');

    if (decision === 'MARKED_REVIEWED') {
      if (!detail.latestCalculation || !detail.latestCalculation.isValid) {
        throw new Error('Cannot mark run reviewed without a valid, up-to-date PAP-AUC calculation.');
      }
      if (detail.qaFlags.some((f) => f.severity === 'BLOCKING')) {
        throw new Error('Cannot mark run reviewed while blocking QA flags remain.');
      }
    }

    const ts = nowIso();
    const reviewId = uid('rev');
    this.db
      .prepare(
        `INSERT INTO reviews (id, experiment_id, calculation_id, reviewer_id, reviewer_role, decision, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        reviewId,
        experimentId,
        detail.latestCalculation?.id ?? null,
        actor.actorId,
        actor.actorRole,
        decision,
        comment.trim(),
        ts
      );

    if (decision === 'MARKED_REVIEWED') {
      this.db
        .prepare(`UPDATE experiments SET status = 'REVIEWED', updated_at = ? WHERE id = ?`)
        .run(ts, experimentId);
    } else if (decision === 'RETURNED_FOR_CORRECTION') {
      this.db
        .prepare(`UPDATE experiments SET status = 'CALCULATION_INVALIDATED', updated_at = ? WHERE id = ?`)
        .run(ts, experimentId);
    }

    this.logAudit(
      experimentId,
      actor,
      `REVIEW_${decision}`,
      'review',
      reviewId,
      `Reviewer decision: ${decision}${comment.trim() ? ` — "${comment.trim()}"` : ''}.`
    );

    return this.getExperimentDetail(experimentId)!;
  }

  loadSampleDemoRun(actor: ActorContext): ExperimentDetail {
    const existingCount = this.db
      .prepare(`SELECT COUNT(*) AS c FROM experiments WHERE run_id LIKE 'DEMO-RUN-%'`)
      .get();
    const nextNum = Number(existingCount?.c ?? 0) + 1;
    const runId = `DEMO-RUN-SAMPLE-${String(nextNum).padStart(2, '0')}`;

    const sampleText = readSampleCsvText();
    const parsed = parseObservationsCsv(sampleText);

    const created = this.createExperiment(
      {
        runId,
        experimentDate: nowIso().slice(0, 10),
        protocolProfileId: 'proto-icmr-2019',
        referenceStrainId: 'ref-mu3-atcc700698',
        analystId: actor.actorId,
        notes:
          'SYNTHETIC DEMONSTRATION RUN imported from sample_data.csv. Fictional values only — not for clinical or research conclusions.',
        isSyntheticDemo: true,
      },
      actor
    );

    this.replaceObservations(
      created.experiment.id,
      parsed.rows.map((r) => ({
        strainId: r.strainId,
        strainRole: r.strainRole,
        vancomycinConcentrationMgL: r.vancomycinConcentrationMgL,
        replicateId: r.replicateId,
        dilutionFraction: r.dilutionFraction,
        platedVolumeMl: r.platedVolumeMl,
        colonyCount: r.colonyCount,
        dataOrigin: r.dataOrigin,
      })),
      actor
    );

    const calc = this.calculateExperiment(created.experiment.id, actor);
    return calc.detail;
  }

  getComparativeData(): ComparativeDataset {
    const expRows = this.db
      .prepare(`SELECT * FROM experiments ORDER BY experiment_date DESC, updated_at DESC`)
      .all();

    const runs: ComparativeRunItem[] = [];
    for (const row of expRows) {
      const experiment = this.mapExperiment(row);
      const protocol = this.getProtocol(experiment.protocolProfileId);
      const refRow = this.db
        .prepare(`SELECT * FROM reference_strains WHERE id = ?`)
        .get(experiment.referenceStrainId);
      if (!protocol || !refRow) continue;

      const isolates = this.db
        .prepare(`SELECT * FROM isolates WHERE experiment_id = ? ORDER BY strain_role ASC, strain_id ASC`)
        .all(experiment.id)
        .map((r) => this.mapIsolate(r));

      const obsCountRow = this.db
        .prepare(`SELECT COUNT(*) AS c FROM observations WHERE experiment_id = ?`)
        .get(experiment.id);

      const calcRow = this.db
        .prepare(`SELECT * FROM calculations WHERE experiment_id = ? ORDER BY calculated_at DESC LIMIT 1`)
        .get(experiment.id);

      const qaFlags = this.db
        .prepare(
          `SELECT * FROM qa_flags WHERE experiment_id = ? ORDER BY CASE severity WHEN 'BLOCKING' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END, created_at ASC`
        )
        .all(experiment.id)
        .map((r) => this.mapQaFlag(r));

      runs.push({
        experiment,
        protocol,
        referenceStrain: this.mapReferenceStrain(refRow),
        latestCalculation: calcRow ? this.mapCalculation(calcRow) : null,
        qaFlags,
        isolates,
        observationCount: Number(obsCountRow?.c ?? 0),
      });
    }

    return {
      runs,
      protocols: this.listProtocols(),
    };
  }

  getGlobalAuditHistory(limit = 150): AuditEvent[] {
    const rows = this.db
      .prepare(
        `SELECT a.*, e.run_id AS run_id
         FROM audit_history a
         LEFT JOIN experiments e ON e.id = a.experiment_id
         ORDER BY a.created_at DESC
         LIMIT ?`
      )
      .all(limit);
    return rows.map((r) => this.mapAudit(r));
  }

  private mapTribalCluster(row: Record<string, unknown>): TribalCluster {
    const rawLang = String(row.primary_language);
    const normalizedLang: TribalLanguageCode =
      rawLang === 'mr' || rawLang === 'gon'
        ? 'mr'
        : rawLang === 'hi' || rawLang === 'sat' || rawLang === 'or'
        ? 'hi'
        : rawLang === 'en'
        ? 'en'
        : 'hi';
    return {
      id: String(row.id),
      clusterCode: String(row.cluster_code),
      name: String(row.name),
      district: String(row.district),
      stateName: String(row.state_name),
      primaryLanguage: normalizedLang,
      connectivityProfile: String(row.connectivity_profile) as ConnectivityProfile,
      referralLabName: String(row.referral_lab_name),
      activeChwCount: Number(row.active_chw_count),
      createdAt: String(row.created_at),
    };
  }

  private mapFieldDispatch(row: Record<string, unknown>): FieldSampleDispatch {
    return {
      id: String(row.id),
      sampleCode: String(row.sample_code),
      clusterId: String(row.cluster_id),
      clusterName: row.cluster_name ? String(row.cluster_name) : undefined,
      experimentId: row.experiment_id ? String(row.experiment_id) : null,
      runId: row.run_id ? String(row.run_id) : null,
      villageName: String(row.village_name),
      chwId: String(row.chw_id),
      collectedAt: String(row.collected_at),
      coldChainMethod: String(row.cold_chain_method) as ColdChainMethod,
      transitHours: Number(row.transit_hours),
      coldChainIntact: Boolean(row.cold_chain_intact),
      viabilityAlert: String(row.viability_alert) as FieldSampleDispatch['viabilityAlert'],
      status: String(row.status) as DispatchStatus,
      notes: String(row.notes ?? ''),
      syncedFromOffline: Boolean(row.synced_from_offline),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private mapMobileCamp(row: Record<string, unknown>): MobileClinicCamp {
    return {
      id: String(row.id),
      campCode: String(row.camp_code),
      clusterId: String(row.cluster_id),
      clusterName: row.cluster_name ? String(row.cluster_name) : undefined,
      villageName: String(row.village_name),
      campDate: String(row.camp_date),
      servicesSummary: String(row.services_summary),
      leadChwId: String(row.lead_chw_id),
      expectedHouseholds: Number(row.expected_households),
      status: String(row.status) as CampStatus,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  listTribalClusters(): TribalCluster[] {
    return this.db
      .prepare(`SELECT * FROM tribal_clusters ORDER BY name ASC`)
      .all()
      .map((r) => this.mapTribalCluster(r));
  }

  createTribalCluster(
    input: {
      clusterCode: string;
      name: string;
      district: string;
      stateName: string;
      primaryLanguage: TribalLanguageCode;
      connectivityProfile: ConnectivityProfile;
      referralLabName: string;
      activeChwCount: number;
    },
    actor: ActorContext
  ): TribalCluster {
    const code = input.clusterCode.trim().toUpperCase();
    const name = input.name.trim();
    if (!code || !name || !input.district.trim()) {
      throw new Error('Cluster code, PHC/unit name, and district are required.');
    }
    const id = uid('cl');
    const ts = nowIso();
    this.db
      .prepare(
        `INSERT INTO tribal_clusters (
          id, cluster_code, name, district, state_name, primary_language,
          connectivity_profile, referral_lab_name, active_chw_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        code,
        name,
        input.district.trim(),
        input.stateName.trim() || 'Regional Tribal Belt',
        input.primaryLanguage || 'hi',
        input.connectivityProfile || 'OFFLINE_FIRST',
        input.referralLabName.trim() || 'District Referral Microbiology Lab',
        Math.max(1, Math.round(input.activeChwCount || 1)),
        ts
      );

    this.logAudit(
      null,
      actor,
      'TRIBAL_CLUSTER_CREATED',
      'tribal_cluster',
      id,
      `Registered tribal outreach cluster ${code} (${name}, ${input.district.trim()}).`,
      input
    );

    const row = this.db.prepare(`SELECT * FROM tribal_clusters WHERE id = ?`).get(id)!;
    return this.mapTribalCluster(row);
  }

  listFieldDispatches(): FieldSampleDispatch[] {
    return this.db
      .prepare(
        `SELECT d.*, c.name AS cluster_name, e.run_id AS run_id
         FROM field_sample_dispatches d
         JOIN tribal_clusters c ON c.id = d.cluster_id
         LEFT JOIN experiments e ON e.id = d.experiment_id
         ORDER BY d.updated_at DESC`
      )
      .all()
      .map((r) => this.mapFieldDispatch(r));
  }

  createFieldDispatch(
    input: {
      sampleCode: string;
      clusterId: string;
      experimentId?: string | null;
      villageName: string;
      chwId: string;
      collectedAt?: string;
      coldChainMethod: ColdChainMethod;
      transitHours: number;
      coldChainIntact: boolean;
      notes?: string;
      syncedFromOffline?: boolean;
    },
    actor: ActorContext
  ): FieldSampleDispatch {
    const sampleCode = input.sampleCode.trim().toUpperCase();
    const villageName = input.villageName.trim();
    if (!sampleCode || !villageName || !input.clusterId) {
      throw new Error('Anonymous Sample Code, Cluster, and Village/Hamlet are required.');
    }
    const cluster = this.db
      .prepare(`SELECT id FROM tribal_clusters WHERE id = ?`)
      .get(input.clusterId);
    if (!cluster) {
      throw new Error('Selected tribal cluster does not exist.');
    }

    const transitHours = Math.max(0, Number(input.transitHours ?? 0));
    const coldChainIntact = Boolean(input.coldChainIntact);
    const coldChainMethod: ColdChainMethod = input.coldChainMethod || 'ICE_BOX_2_8C';
    const viabilityAlert = this.computeViabilityAlert(
      transitHours,
      coldChainIntact,
      coldChainMethod
    );

    const id = uid('dsp');
    const ts = nowIso();
    this.db
      .prepare(
        `INSERT INTO field_sample_dispatches (
          id, sample_code, cluster_id, experiment_id, village_name, chw_id,
          collected_at, cold_chain_method, transit_hours, cold_chain_intact,
          viability_alert, status, notes, synced_from_offline, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_TRANSIT', ?, ?, ?, ?)`
      )
      .run(
        id,
        sampleCode,
        input.clusterId,
        input.experimentId || null,
        villageName,
        input.chwId.trim() || actor.actorId,
        input.collectedAt || ts,
        coldChainMethod,
        transitHours,
        coldChainIntact ? 1 : 0,
        viabilityAlert,
        (input.notes ?? '').trim(),
        input.syncedFromOffline ? 1 : 0,
        ts,
        ts
      );

    this.logAudit(
      input.experimentId || null,
      actor,
      'FIELD_DISPATCH_CREATED',
      'field_sample_dispatch',
      id,
      `Logged anonymized field sample ${sampleCode} from ${villageName} (${viabilityAlert}, ${transitHours}h transit${input.syncedFromOffline ? ', synced from offline queue' : ''}).`,
      input
    );

    const row = this.db
      .prepare(
        `SELECT d.*, c.name AS cluster_name, e.run_id AS run_id
         FROM field_sample_dispatches d
         JOIN tribal_clusters c ON c.id = d.cluster_id
         LEFT JOIN experiments e ON e.id = d.experiment_id
         WHERE d.id = ?`
      )
      .get(id)!;
    return this.mapFieldDispatch(row);
  }

  bulkSyncFieldDispatches(
    items: Array<{
      sampleCode: string;
      clusterId: string;
      experimentId?: string | null;
      villageName: string;
      chwId: string;
      collectedAt?: string;
      coldChainMethod: ColdChainMethod;
      transitHours: number;
      coldChainIntact: boolean;
      notes?: string;
    }>,
    actor: ActorContext
  ): { syncedCount: number; skippedCodes: string[]; dispatches: FieldSampleDispatch[] } {
    const created: FieldSampleDispatch[] = [];
    const skippedCodes: string[] = [];

    for (const item of items) {
      const code = String(item.sampleCode || '').trim().toUpperCase();
      if (!code) continue;
      const exists = this.db
        .prepare(`SELECT id FROM field_sample_dispatches WHERE sample_code = ?`)
        .get(code);
      if (exists) {
        skippedCodes.push(code);
        continue;
      }
      created.push(
        this.createFieldDispatch({ ...item, syncedFromOffline: true }, actor)
      );
    }

    return {
      syncedCount: created.length,
      skippedCodes,
      dispatches: created,
    };
  }

  updateDispatchStatus(
    dispatchId: string,
    patch: {
      status?: DispatchStatus;
      experimentId?: string | null;
      transitHours?: number;
      coldChainIntact?: boolean;
    },
    actor: ActorContext
  ): FieldSampleDispatch {
    const existingRow = this.db
      .prepare(`SELECT * FROM field_sample_dispatches WHERE id = ?`)
      .get(dispatchId);
    if (!existingRow) {
      throw new Error('Field sample dispatch not found.');
    }
    const existing = this.mapFieldDispatch(existingRow);

    const nextStatus = patch.status ?? existing.status;
    const nextExpId =
      patch.experimentId !== undefined ? patch.experimentId : existing.experimentId;
    const nextTransit =
      patch.transitHours !== undefined
        ? Math.max(0, Number(patch.transitHours))
        : existing.transitHours;
    const nextIntact =
      patch.coldChainIntact !== undefined
        ? Boolean(patch.coldChainIntact)
        : existing.coldChainIntact;
    const nextAlert = this.computeViabilityAlert(
      nextTransit,
      nextIntact,
      existing.coldChainMethod
    );
    const ts = nowIso();

    this.db
      .prepare(
        `UPDATE field_sample_dispatches
         SET status = ?, experiment_id = ?, transit_hours = ?, cold_chain_intact = ?, viability_alert = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(nextStatus, nextExpId, nextTransit, nextIntact ? 1 : 0, nextAlert, ts, dispatchId);

    this.logAudit(
      nextExpId,
      actor,
      'FIELD_DISPATCH_UPDATED',
      'field_sample_dispatch',
      dispatchId,
      `Updated field sample ${existing.sampleCode} status to ${nextStatus}${nextExpId ? ` (linked run ${nextExpId})` : ''}.`,
      patch
    );

    const updatedRow = this.db
      .prepare(
        `SELECT d.*, c.name AS cluster_name, e.run_id AS run_id
         FROM field_sample_dispatches d
         JOIN tribal_clusters c ON c.id = d.cluster_id
         LEFT JOIN experiments e ON e.id = d.experiment_id
         WHERE d.id = ?`
      )
      .get(dispatchId)!;
    return this.mapFieldDispatch(updatedRow);
  }

  listMobileCamps(): MobileClinicCamp[] {
    return this.db
      .prepare(
        `SELECT m.*, c.name AS cluster_name
         FROM mobile_clinic_camps m
         JOIN tribal_clusters c ON c.id = m.cluster_id
         ORDER BY m.camp_date ASC, m.created_at DESC`
      )
      .all()
      .map((r) => this.mapMobileCamp(r));
  }

  createMobileCamp(
    input: {
      campCode: string;
      clusterId: string;
      villageName: string;
      campDate: string;
      servicesSummary: string;
      leadChwId: string;
      expectedHouseholds: number;
    },
    actor: ActorContext
  ): MobileClinicCamp {
    const campCode = input.campCode.trim().toUpperCase();
    const villageName = input.villageName.trim();
    if (!campCode || !villageName || !input.clusterId || !input.campDate) {
      throw new Error('Camp code, cluster, village, and camp date are required.');
    }
    const id = uid('cmp');
    const ts = nowIso();
    this.db
      .prepare(
        `INSERT INTO mobile_clinic_camps (
          id, camp_code, cluster_id, village_name, camp_date,
          services_summary, lead_chw_id, expected_households, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)`
      )
      .run(
        id,
        campCode,
        input.clusterId,
        villageName,
        input.campDate,
        input.servicesSummary.trim() || 'Wound hygiene education & anonymized swab pickup',
        input.leadChwId.trim() || actor.actorId,
        Math.max(1, Math.round(input.expectedHouseholds || 25)),
        ts,
        ts
      );

    this.logAudit(
      null,
      actor,
      'MOBILE_CAMP_SCHEDULED',
      'mobile_clinic_camp',
      id,
      `Scheduled mobile outreach camp ${campCode} in ${villageName} on ${input.campDate}.`,
      input
    );

    const row = this.db
      .prepare(
        `SELECT m.*, c.name AS cluster_name
         FROM mobile_clinic_camps m
         JOIN tribal_clusters c ON c.id = m.cluster_id
         WHERE m.id = ?`
      )
      .get(id)!;
    return this.mapMobileCamp(row);
  }

  updateCampStatus(campId: string, status: CampStatus, actor: ActorContext): MobileClinicCamp {
    const existing = this.db
      .prepare(`SELECT * FROM mobile_clinic_camps WHERE id = ?`)
      .get(campId);
    if (!existing) {
      throw new Error('Mobile camp not found.');
    }
    const ts = nowIso();
    this.db
      .prepare(`UPDATE mobile_clinic_camps SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, ts, campId);

    this.logAudit(
      null,
      actor,
      'MOBILE_CAMP_STATUS_UPDATED',
      'mobile_clinic_camp',
      campId,
      `Updated camp ${String(existing.camp_code)} status to ${status}.`
    );

    const row = this.db
      .prepare(
        `SELECT m.*, c.name AS cluster_name
         FROM mobile_clinic_camps m
         JOIN tribal_clusters c ON c.id = m.cluster_id
         WHERE m.id = ?`
      )
      .get(campId)!;
    return this.mapMobileCamp(row);
  }

  getTribalOutreachOverview(): TribalOutreachOverview {
    const clusters = this.listTribalClusters();
    const dispatches = this.listFieldDispatches();
    const camps = this.listMobileCamps();

    const comparative = this.getComparativeData();
    const calcByExpId = new Map(
      comparative.runs.map((r) => [r.experiment.id, r.latestCalculation])
    );

    const clusterStats: ClusterSurveillanceStat[] = clusters.map((cluster) => {
      const clusterDispatches = dispatches.filter((d) => d.clusterId === cluster.id);
      const linkedRunIds = Array.from(
        new Set(
          clusterDispatches
            .map((d) => d.experimentId)
            .filter((id): id is string => Boolean(id))
        )
      );

      let hvisaCompatibleCount = 0;
      let expertReviewCount = 0;
      for (const expId of linkedRunIds) {
        const calc = calcByExpId.get(expId);
        if (!calc || !calc.isValid) continue;
        for (const tp of calc.results.testProfiles) {
          if (tp.interpretationBand === 'COMPATIBLE_HVISA') hvisaCompatibleCount += 1;
          if (tp.interpretationBand === 'EXPERT_REVIEW_VISA_RANGE') expertReviewCount += 1;
        }
      }

      const coldChainAlertCount = clusterDispatches.filter(
        (d) => d.viabilityAlert !== 'OK'
      ).length;

      return {
        clusterId: cluster.id,
        clusterCode: cluster.clusterCode,
        clusterName: cluster.name,
        district: cluster.district,
        primaryLanguage: cluster.primaryLanguage,
        linkedDispatchesCount: clusterDispatches.length,
        linkedRunsCount: linkedRunIds.length,
        hvisaCompatibleCount,
        expertReviewCount,
        coldChainAlertCount,
      };
    });

    return {
      clusters,
      dispatches,
      camps,
      clusterStats,
      totals: {
        activeClusters: clusters.length,
        pendingSamples: dispatches.filter((d) => d.status !== 'REPORT_RETURNED').length,
        coldChainAlerts: dispatches.filter((d) => d.viabilityAlert !== 'OK').length,
        upcomingCamps: camps.filter((c) => c.status !== 'COMPLETED').length,
      },
    };
  }

  getPublicPortalOverview(): PublicPortalOverview {
    const dashboard = this.getDashboardSummary();
    const outreach = this.getTribalOutreachOverview();
    const protocols = this.listProtocols();
    return {
      dashboard,
      clustersCount: outreach.totals.activeClusters,
      upcomingCampsCount: outreach.totals.upcomingCamps,
      pendingSamplesCount: outreach.totals.pendingSamples,
      coldChainAlertsCount: outreach.totals.coldChainAlerts,
      upcomingCamps: outreach.camps.slice(0, 5).map((c) => ({
        campCode: c.campCode,
        villageName: c.villageName,
        campDate: c.campDate,
        clusterName: c.clusterName ?? '',
        status: c.status,
      })),
      protocols: protocols.map((p) => ({
        id: p.id,
        name: p.name,
        version: p.version,
        hvisaLowerThreshold: p.hvisaLowerThreshold,
        visaUpperThreshold: p.visaUpperThreshold,
      })),
    };
  }

  // ==================== Authentication & Face Lock (SQLite) ====================

  private hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
    const salt = saltHex ?? crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return { salt, hash: derived };
  }

  private verifyPassword(password: string, saltHex: string, storedHashHex: string): boolean {
    const derivedBuf = crypto.scryptSync(password, saltHex, 64);
    const storedBuf = Buffer.from(storedHashHex, 'hex');
    if (derivedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derivedBuf, storedBuf);
  }

  private normalizeFaceDescriptor(raw: unknown): number[] {
    if (!Array.isArray(raw) || raw.length < 64 || raw.length > 1024) {
      throw new Error('Invalid face descriptor payload. Please recapture your face.');
    }
    const nums = raw.map((v) => Number(v));
    if (nums.some((n) => !Number.isFinite(n))) {
      throw new Error('Face descriptor contains invalid numeric values.');
    }
    let normSq = 0;
    for (const n of nums) normSq += n * n;
    const norm = Math.sqrt(normSq);
    if (norm < 1e-6) {
      throw new Error('Face capture appears blank or uniform. Ensure clear lighting.');
    }
    return nums.map((n) => Number((n / norm).toFixed(6)));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    if (len === 0 || a.length !== b.length) return -1;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < len; i += 1) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom > 1e-9 ? dot / denom : -1;
  }

  private mapAuthUser(row: Record<string, unknown>): AuthUser {
    const rawLang = String(row.preferred_language ?? 'en');
    const preferredLanguage: TribalLanguageCode =
      rawLang === 'hi' || rawLang === 'mr' ? rawLang : 'en';
    return {
      id: String(row.id),
      username: String(row.username),
      displayName: String(row.display_name),
      email: String(row.email ?? ''),
      role: String(row.role) as UserRole,
      faceLockEnabled: Boolean(row.face_lock_enabled) && Boolean(row.face_descriptor_json),
      faceEnrolledAt: row.face_enrolled_at ? String(row.face_enrolled_at) : null,
      preferredLanguage,
      highContrast: Boolean(row.high_contrast),
      lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
      createdAt: String(row.created_at),
    };
  }

  private validateStrongPassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error('Password must include at least one letter and one number.');
    }
  }

  private createAuthSession(
    userId: string,
    authMethod: 'PASSWORD' | 'FACE_LOCK',
    matchScore?: number
  ): AuthSessionResponse {
    const ts = nowIso();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const token = crypto.randomBytes(32).toString('hex');

    this.db
      .prepare(
        `UPDATE auth_users
         SET last_login_at = ?, failed_login_attempts = 0, locked_until = NULL
         WHERE id = ?`
      )
      .run(ts, userId);

    this.db
      .prepare(
        `INSERT INTO auth_sessions (token, user_id, auth_method, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(token, userId, authMethod, ts, expiresAt);

    const userRow = this.db.prepare(`SELECT * FROM auth_users WHERE id = ?`).get(userId)!;
    const user = this.mapAuthUser(userRow);

    this.logAudit(
      null,
      { actorId: user.username, actorRole: user.role },
      authMethod === 'FACE_LOCK' ? 'AUTH_LOGIN_FACE_LOCK' : 'AUTH_LOGIN_PASSWORD',
      'auth_user',
      user.id,
      `User "${user.username}" (${user.displayName}) signed in via ${authMethod}${
        matchScore !== undefined ? ` (similarity ${(matchScore * 100).toFixed(1)}%)` : ''
      }.`
    );

    return {
      token,
      authMethod,
      matchScore,
      user,
    };
  }

  private ensureAuthSeeded(): void {
    const countRow = this.db.prepare(`SELECT COUNT(*) AS c FROM auth_users`).get();
    if (Number(countRow?.c ?? 0) > 0) return;

    const ts = nowIso();
    const seedUsers: Array<{
      id: string;
      username: string;
      displayName: string;
      email: string;
      role: UserRole;
      password: string;
    }> = [
      {
        id: 'usr-analyst',
        username: 'analyst',
        displayName: 'Dr. A. Sharma (Lab Analyst)',
        email: 'analyst@hvisa-demo.org',
        role: 'LAB_ANALYST',
        password: 'hvisa123',
      },
      {
        id: 'usr-reviewer',
        username: 'reviewer',
        displayName: 'Dr. Arvind Rao (Supervisor)',
        email: 'reviewer@hvisa-demo.org',
        role: 'REVIEWER_MICROBIOLOGIST',
        password: 'hvisa123',
      },
      {
        id: 'usr-auditor',
        username: 'auditor',
        displayName: 'Meera Nair (Viewer / Auditor)',
        email: 'auditor@hvisa-demo.org',
        role: 'AUDITOR',
        password: 'hvisa123',
      },
    ];

    const stmt = this.db.prepare(
      `INSERT INTO auth_users (
        id, username, display_name, email, role, password_salt, password_hash,
        face_lock_enabled, face_descriptor_json, face_enrolled_at,
        preferred_language, high_contrast, failed_login_attempts, locked_until,
        last_login_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, 'en', 0, 0, NULL, NULL, ?)`
    );

    for (const u of seedUsers) {
      const { salt, hash } = this.hashPassword(u.password);
      stmt.run(u.id, u.username, u.displayName, u.email, u.role, salt, hash, ts);
    }
  }

  listAuthUsersDirectory(): AuthUserDirectoryItem[] {
    return this.db
      .prepare(
        `SELECT username, display_name, role, face_lock_enabled, face_descriptor_json
         FROM auth_users
         ORDER BY created_at ASC`
      )
      .all()
      .map((r) => ({
        username: String(r.username),
        displayName: String(r.display_name),
        role: String(r.role) as UserRole,
        faceLockEnabled: Boolean(r.face_lock_enabled) && Boolean(r.face_descriptor_json),
      }));
  }

  registerAuthUser(input: {
    username: string;
    displayName: string;
    email?: string;
    role: UserRole;
    password: string;
    faceDescriptor?: number[] | null;
    preferredLanguage?: TribalLanguageCode;
  }): AuthSessionResponse {
    const username = String(input.username || '').trim().toLowerCase();
    const displayName = String(input.displayName || '').trim() || username;
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');
    const role: UserRole =
      input.role === 'REVIEWER_MICROBIOLOGIST' || input.role === 'AUDITOR'
        ? input.role
        : 'LAB_ANALYST';
    const preferredLanguage: TribalLanguageCode =
      input.preferredLanguage === 'hi' || input.preferredLanguage === 'mr'
        ? input.preferredLanguage
        : 'en';

    if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
      throw new Error(
        'Username must be 3-32 characters (letters, numbers, dot, underscore, or dash).'
      );
    }
    this.validateStrongPassword(password);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please enter a valid registered email address.');
    }

    const existing = this.db
      .prepare(`SELECT id FROM auth_users WHERE username = ?`)
      .get(username);
    if (existing) {
      throw new Error(`Username "${username}" is already registered.`);
    }

    let normalizedFace: number[] | null = null;
    if (input.faceDescriptor && input.faceDescriptor.length > 0) {
      normalizedFace = this.normalizeFaceDescriptor(input.faceDescriptor);
    }

    const id = uid('usr');
    const ts = nowIso();
    const { salt, hash } = this.hashPassword(password);

    this.db
      .prepare(
        `INSERT INTO auth_users (
          id, username, display_name, email, role, password_salt, password_hash,
          face_lock_enabled, face_descriptor_json, face_enrolled_at,
          preferred_language, high_contrast, failed_login_attempts, locked_until,
          last_login_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, NULL, ?)`
      )
      .run(
        id,
        username,
        displayName,
        email,
        role,
        salt,
        hash,
        normalizedFace ? 1 : 0,
        normalizedFace ? JSON.stringify(normalizedFace) : null,
        normalizedFace ? ts : null,
        preferredLanguage,
        ts
      );

    this.logAudit(
      null,
      { actorId: username, actorRole: role },
      'AUTH_USER_REGISTERED',
      'auth_user',
      id,
      `Registered user account "${username}" (${role})${normalizedFace ? ' with Face Lock enrolled' : ''}.`
    );

    return this.createAuthSession(id, 'PASSWORD');
  }

  loginWithPassword(usernameRaw: string, passwordRaw: string): AuthSessionResponse {
    const username = String(usernameRaw || '').trim().toLowerCase();
    const password = String(passwordRaw || '');
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    const row = this.db
      .prepare(`SELECT * FROM auth_users WHERE username = ?`)
      .get(username);
    if (!row) {
      throw new Error('Invalid username or password.');
    }

    const lockedUntilRaw = row.locked_until ? String(row.locked_until) : null;
    if (lockedUntilRaw && new Date(lockedUntilRaw).getTime() > Date.now()) {
      const minsLeft = Math.max(
        1,
        Math.ceil((new Date(lockedUntilRaw).getTime() - Date.now()) / 60000)
      );
      throw new Error(
        `Account temporarily locked after 5 wrong password attempts. Please try again in ${minsLeft} minute(s).`
      );
    }

    const valid = this.verifyPassword(
      password,
      String(row.password_salt),
      String(row.password_hash)
    );
    if (!valid) {
      const prevAttempts = Number(row.failed_login_attempts ?? 0);
      const nextAttempts = prevAttempts + 1;
      if (nextAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        this.db
          .prepare(
            `UPDATE auth_users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`
          )
          .run(nextAttempts, lockUntil, String(row.id));
        throw new Error(
          'Account locked for 15 minutes after 5 failed login attempts.'
        );
      } else {
        this.db
          .prepare(
            `UPDATE auth_users SET failed_login_attempts = ?, locked_until = NULL WHERE id = ?`
          )
          .run(nextAttempts, String(row.id));
        throw new Error(
          `Invalid username or password. ${5 - nextAttempts} attempt(s) remaining before 15-minute lockout.`
        );
      }
    }

    return this.createAuthSession(String(row.id), 'PASSWORD');
  }

  loginWithFace(faceDescriptorRaw: unknown, usernameRaw?: string): AuthSessionResponse {
    const probe = this.normalizeFaceDescriptor(faceDescriptorRaw);
    const targetUsername = String(usernameRaw || '').trim().toLowerCase();

    const rows = targetUsername
      ? this.db
          .prepare(
            `SELECT * FROM auth_users WHERE username = ? AND face_lock_enabled = 1 AND face_descriptor_json IS NOT NULL`
          )
          .all(targetUsername)
      : this.db
          .prepare(
            `SELECT * FROM auth_users WHERE face_lock_enabled = 1 AND face_descriptor_json IS NOT NULL`
          )
          .all();

    if (rows.length === 0) {
      const err = new Error(
        targetUsername
          ? `Face Lock is not set up for user "${targetUsername}". Switching back to Password login.`
          : 'Face Lock is not set up for any account yet. Please sign in with Password and enable Face Lock in Settings.'
      ) as Error & { code?: string };
      err.code = 'FACE_NOT_ENROLLED';
      throw err;
    }

    let bestRow: Record<string, unknown> | null = null;
    let bestScore = -1;

    for (const row of rows) {
      try {
        const stored = JSON.parse(String(row.face_descriptor_json)) as number[];
        const score = this.cosineSimilarity(probe, stored);
        if (score > bestScore) {
          bestScore = score;
          bestRow = row;
        }
      } catch {
        // skip malformed
      }
    }

    const MATCH_THRESHOLD = 0.78;
    if (!bestRow || bestScore < MATCH_THRESHOLD) {
      throw new Error(
        `Face did not match enrolled profile (similarity ${Math.max(0, bestScore * 100).toFixed(0)}%, need >= ${Math.round(MATCH_THRESHOLD * 100)}%). Center your face in good lighting or use Password instead.`
      );
    }

    return this.createAuthSession(String(bestRow.id), 'FACE_LOCK', bestScore);
  }

  requestPasswordResetOtp(usernameRaw: string, emailRaw: string): ForgotPasswordResponse {
    const username = String(usernameRaw || '').trim().toLowerCase();
    const email = String(emailRaw || '').trim().toLowerCase();
    const neutralMessage = 'If the account exists, an OTP has been sent.';

    if (!username || !email) {
      throw new Error('Username and registered email are required.');
    }

    const userRow = this.db
      .prepare(`SELECT * FROM auth_users WHERE username = ? AND LOWER(email) = ?`)
      .get(username, email);

    if (!userRow) {
      // Return identical neutral message without OTP
      return {
        ok: true,
        message: neutralMessage,
      };
    }

    const userId = String(userRow.id);
    const activeOtp = this.db
      .prepare(
        `SELECT * FROM password_reset_otps
         WHERE user_id = ? AND used_at IS NULL AND expires_at > ?
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(userId, nowIso());

    let nextResendCount = 0;
    if (activeOtp) {
      const currentResends = Number(activeOtp.resend_count ?? 0);
      if (currentResends >= 3) {
        throw new Error('Maximum OTP resend limit (3) reached. Please wait 10 minutes before trying again.');
      }
      nextResendCount = currentResends + 1;
      // Invalidate prior active OTP
      this.db
        .prepare(`UPDATE password_reset_otps SET used_at = ? WHERE id = ?`)
        .run(nowIso(), String(activeOtp.id));
    }

    const otpCode = String(crypto.randomInt(100000, 999999));
    const { salt, hash } = this.hashPassword(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    this.db
      .prepare(
        `INSERT INTO password_reset_otps (
          id, user_id, otp_salt, otp_hash, expires_at, attempts, resend_count, used_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?)`
      )
      .run(uid('otp'), userId, salt, hash, expiresAt, nextResendCount, nowIso());

    this.logAudit(
      null,
      { actorId: username, actorRole: String(userRow.role) as UserRole },
      'AUTH_OTP_REQUESTED',
      'auth_user',
      userId,
      `Password reset OTP issued for "${username}" (valid 10 minutes).`
    );

    return {
      ok: true,
      message: neutralMessage,
      demoOtp: otpCode,
      expiresInMinutes: 10,
      resendCount: nextResendCount,
      maxResends: 3,
    };
  }

  resetPasswordWithOtp(input: {
    username: string;
    email: string;
    otp: string;
    newPassword: string;
  }): { ok: boolean; message: string } {
    const username = String(input.username || '').trim().toLowerCase();
    const email = String(input.email || '').trim().toLowerCase();
    const otp = String(input.otp || '').trim();
    const newPassword = String(input.newPassword || '');

    if (!username || !email || !otp) {
      throw new Error('Username, email, and 6-digit OTP are required.');
    }
    this.validateStrongPassword(newPassword);

    const userRow = this.db
      .prepare(`SELECT * FROM auth_users WHERE username = ? AND LOWER(email) = ?`)
      .get(username, email);

    if (!userRow) {
      throw new Error('Invalid or expired OTP.');
    }

    const userId = String(userRow.id);
    const otpRow = this.db
      .prepare(
        `SELECT * FROM password_reset_otps
         WHERE user_id = ? AND used_at IS NULL
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(userId);

    if (!otpRow) {
      throw new Error('No active OTP found. Please request a new OTP.');
    }
    if (String(otpRow.expires_at) < nowIso()) {
      throw new Error('OTP has expired. Please request a new OTP.');
    }
    const attempts = Number(otpRow.attempts ?? 0);
    if (attempts >= 5) {
      throw new Error('Too many wrong OTP attempts. Please request a new OTP.');
    }

    const otpValid = this.verifyPassword(
      otp,
      String(otpRow.otp_salt),
      String(otpRow.otp_hash)
    );
    if (!otpValid) {
      this.db
        .prepare(`UPDATE password_reset_otps SET attempts = ? WHERE id = ?`)
        .run(attempts + 1, String(otpRow.id));
      throw new Error('Invalid OTP. Please check the 6-digit code and try again.');
    }

    const { salt, hash } = this.hashPassword(newPassword);
    this.db
      .prepare(
        `UPDATE auth_users
         SET password_salt = ?, password_hash = ?, failed_login_attempts = 0, locked_until = NULL
         WHERE id = ?`
      )
      .run(salt, hash, userId);

    this.db
      .prepare(`UPDATE password_reset_otps SET used_at = ? WHERE id = ?`)
      .run(nowIso(), String(otpRow.id));

    this.logAudit(
      null,
      { actorId: username, actorRole: String(userRow.role) as UserRole },
      'AUTH_PASSWORD_RESET',
      'auth_user',
      userId,
      `Password reset via verified OTP for "${username}".`
    );

    return {
      ok: true,
      message: 'Password updated successfully. You can now log in with your new password.',
    };
  }

  changeUserPassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): { ok: boolean; message: string } {
    const row = this.db.prepare(`SELECT * FROM auth_users WHERE id = ?`).get(userId);
    if (!row) {
      throw new Error('User account not found.');
    }
    const currentValid = this.verifyPassword(
      String(currentPassword || ''),
      String(row.password_salt),
      String(row.password_hash)
    );
    if (!currentValid) {
      throw new Error('Current password is incorrect.');
    }
    this.validateStrongPassword(String(newPassword || ''));

    const { salt, hash } = this.hashPassword(String(newPassword));
    this.db
      .prepare(`UPDATE auth_users SET password_salt = ?, password_hash = ? WHERE id = ?`)
      .run(salt, hash, userId);

    this.logAudit(
      null,
      { actorId: String(row.username), actorRole: String(row.role) as UserRole },
      'AUTH_PASSWORD_CHANGED',
      'auth_user',
      userId,
      `Password changed from Settings by "${String(row.username)}".`
    );

    return { ok: true, message: 'Password changed successfully.' };
  }

  updateUserPreferences(
    userId: string,
    patch: { preferredLanguage?: TribalLanguageCode; highContrast?: boolean }
  ): AuthUser {
    const row = this.db.prepare(`SELECT * FROM auth_users WHERE id = ?`).get(userId);
    if (!row) {
      throw new Error('User account not found.');
    }

    const nextLang: TribalLanguageCode =
      patch.preferredLanguage === 'hi' || patch.preferredLanguage === 'mr' || patch.preferredLanguage === 'en'
        ? patch.preferredLanguage
        : ((String(row.preferred_language ?? 'en') as TribalLanguageCode) || 'en');

    const nextContrast =
      typeof patch.highContrast === 'boolean'
        ? patch.highContrast
        : Boolean(row.high_contrast);

    this.db
      .prepare(
        `UPDATE auth_users SET preferred_language = ?, high_contrast = ? WHERE id = ?`
      )
      .run(nextLang, nextContrast ? 1 : 0, userId);

    return this.mapAuthUser(
      this.db.prepare(`SELECT * FROM auth_users WHERE id = ?`).get(userId)!
    );
  }

  getAuthSession(token: string): { user: AuthUser; authMethod: 'PASSWORD' | 'FACE_LOCK' } | null {
    const clean = String(token || '').trim();
    if (!clean) return null;

    const row = this.db
      .prepare(
        `SELECT s.auth_method, s.expires_at, u.*
         FROM auth_sessions s
         JOIN auth_users u ON u.id = s.user_id
         WHERE s.token = ?`
      )
      .get(clean);

    if (!row) return null;
    if (String(row.expires_at) < nowIso()) {
      this.db.prepare(`DELETE FROM auth_sessions WHERE token = ?`).run(clean);
      return null;
    }

    return {
      authMethod: String(row.auth_method) as 'PASSWORD' | 'FACE_LOCK',
      user: this.mapAuthUser(row),
    };
  }

  logoutAuthSession(token: string): void {
    const clean = String(token || '').trim();
    if (!clean) return;
    this.db.prepare(`DELETE FROM auth_sessions WHERE token = ?`).run(clean);
  }

  logoutAllUserSessions(userId: string): void {
    this.db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(userId);
  }

  enrollFaceLock(userId: string, faceDescriptorRaw: unknown): AuthUser {
    const normalized = this.normalizeFaceDescriptor(faceDescriptorRaw);
    const row = this.db.prepare(`SELECT * FROM auth_users WHERE id = ?`).get(userId);
    if (!row) {
      throw new Error('User account not found.');
    }
    const ts = nowIso();
    this.db
      .prepare(
        `UPDATE auth_users
         SET face_lock_enabled = 1, face_descriptor_json = ?, face_enrolled_at = ?
         WHERE id = ?`
      )
      .run(JSON.stringify(normalized), ts, userId);

    const updated = this.mapAuthUser(
      this.db.prepare(`SELECT * FROM auth_users WHERE id = ?`).get(userId)!
    );

    this.logAudit(
      null,
      { actorId: updated.username, actorRole: updated.role },
      'FACE_LOCK_ENROLLED',
      'auth_user',
      updated.id,
      `Enrolled/updated Face Lock profile in SQLite database for "${updated.username}".`
    );

    return updated;
  }

  disableFaceLock(userId: string): AuthUser {
    const row = this.db.prepare(`SELECT * FROM auth_users WHERE id = ?`).get(userId);
    if (!row) {
      throw new Error('User account not found.');
    }
    this.db
      .prepare(
        `UPDATE auth_users
         SET face_lock_enabled = 0, face_descriptor_json = NULL, face_enrolled_at = NULL
         WHERE id = ?`
      )
      .run(userId);

    const updated = this.mapAuthUser(
      this.db.prepare(`SELECT * FROM auth_users WHERE id = ?`).get(userId)!
    );

    this.logAudit(
      null,
      { actorId: updated.username, actorRole: updated.role },
      'FACE_LOCK_DISABLED',
      'auth_user',
      updated.id,
      `Removed Face Lock profile for "${updated.username}".`
    );

    return updated;
  }
}

export const db = new HvisaDatabase();


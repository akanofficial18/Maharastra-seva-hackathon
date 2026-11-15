export type UserRole = 'LAB_ANALYST' | 'REVIEWER_MICROBIOLOGIST' | 'AUDITOR';

export type StrainRole = 'REFERENCE_MU3' | 'TEST';

export type ZeroColonyPolicy =
  | 'UNSPECIFIED'
  | 'EXCLUDE_POINT'
  | 'DETECTION_LIMIT'
  | 'FLOOR_ZERO';

export type AggregationMethod = 'ARITHMETIC_MEAN_LOG10' | 'MEDIAN_LOG10';

export type ExperimentStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'CALCULATED'
  | 'CALCULATION_INVALIDATED'
  | 'REVIEWED';

export type QaSeverity = 'BLOCKING' | 'WARNING' | 'INFO';

export type InterpretationBand =
  | 'BELOW_THRESHOLD'
  | 'COMPATIBLE_HVISA'
  | 'EXPERT_REVIEW_VISA_RANGE'
  | 'NOT_CALCULATED';

export type ReviewDecision =
  | 'COMMENT'
  | 'MARKED_REVIEWED'
  | 'RETURNED_FOR_CORRECTION';

export interface ProtocolProfile {
  id: string;
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
  updatedAt: string;
  updatedBy: string;
}

export interface ReferenceStrain {
  id: string;
  strainCode: string;
  atccNumber: string;
  species: string;
  description: string;
  isSyntheticDemo: boolean;
}

export interface Experiment {
  id: string;
  runId: string;
  experimentDate: string;
  protocolProfileId: string;
  referenceStrainId: string;
  analystId: string;
  notes: string;
  status: ExperimentStatus;
  isSyntheticDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Isolate {
  id: string;
  experimentId: string;
  strainId: string;
  strainRole: StrainRole;
  displayLabel: string;
  notes: string;
}

export interface Observation {
  id: string;
  experimentId: string;
  isolateId: string;
  strainId: string;
  strainRole: StrainRole;
  vancomycinConcentrationMgL: number;
  replicateId: string;
  dilutionFraction: number;
  platedVolumeMl: number;
  colonyCount: number;
  dataOrigin: string;
  rowOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ObservationDerived {
  observationId: string;
  strainId: string;
  strainRole: StrainRole;
  concentrationMgL: number;
  replicateId: string;
  colonyCount: number;
  dilutionFraction: number;
  platedVolumeMl: number;
  cfuPerMl: number | null;
  log10CfuPerMl: number | null;
  isZeroCensored: boolean;
  effectiveLog10ForCurve: number | null;
  handlingNote: string;
  isValidInput: boolean;
}

export interface CurveReplicatePoint {
  observationId: string;
  replicateId: string;
  colonyCount: number;
  cfuPerMl: number | null;
  log10CfuPerMl: number | null;
  effectiveLog10: number | null;
  isZeroCensored: boolean;
}

export interface CurveConcentrationPoint {
  concentrationMgL: number;
  aggregatedLog10CfuPerMl: number | null;
  replicates: CurveReplicatePoint[];
  includedCount: number;
  censoredCount: number;
}

export interface TrapezoidalSegment {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  deltaX: number;
  meanY: number;
  segmentArea: number;
}

export interface StrainProfileResult {
  strainId: string;
  strainRole: StrainRole;
  points: CurveConcentrationPoint[];
  validCurvePoints: Array<{ x: number; y: number }>;
  segments: TrapezoidalSegment[];
  auc: number | null;
  papAucRatio: number | null;
  interpretationBand: InterpretationBand;
  interpretationLabel: string;
  interpretationDetail: string;
  cannotComputeReason: string | null;
}

export interface CalculationResultPayload {
  calculationVersion: string;
  protocolProfileId: string;
  protocolName: string;
  protocolVersion: string;
  sourceCitation: string;
  disclaimerText: string;
  zeroColonyPolicy: ZeroColonyPolicy;
  aggregationMethod: AggregationMethod;
  hvisaLowerThreshold: number;
  visaUpperThreshold: number;
  mu3StrainId: string | null;
  mu3Auc: number | null;
  referenceProfile: StrainProfileResult | null;
  testProfiles: StrainProfileResult[];
  observationDerived: ObservationDerived[];
}

export interface CalculationRecord {
  id: string;
  experimentId: string;
  calculationVersion: string;
  protocolProfileId: string;
  protocolVersion: string;
  protocolSnapshot: ProtocolProfile;
  mu3Auc: number | null;
  isValid: boolean;
  results: CalculationResultPayload;
  calculatedBy: string;
  calculatedAt: string;
}

export interface QaFlag {
  id: string;
  experimentId: string;
  calculationId: string | null;
  severity: QaSeverity;
  code: string;
  message: string;
  resolutionHint: string;
  observationId: string | null;
  rowReference: string | null;
  fieldName: string | null;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  experimentId: string;
  calculationId: string | null;
  reviewerId: string;
  reviewerRole: UserRole;
  decision: ReviewDecision;
  comment: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  experimentId: string | null;
  runId?: string | null;
  actorId: string;
  actorRole: UserRole;
  actionType: string;
  entityType: string;
  entityId: string;
  summary: string;
  diffJson: string | null;
  createdAt: string;
}

export interface ExperimentDetail {
  experiment: Experiment;
  protocol: ProtocolProfile;
  referenceStrain: ReferenceStrain;
  isolates: Isolate[];
  observations: Observation[];
  latestCalculation: CalculationRecord | null;
  qaFlags: QaFlag[];
  reviews: ReviewRecord[];
  auditHistory: AuditEvent[];
}

export interface ExperimentSummaryItem {
  id: string;
  runId: string;
  experimentDate: string;
  protocolProfileId: string;
  protocolName: string;
  protocolVersion: string;
  analystId: string;
  status: ExperimentStatus;
  isSyntheticDemo: boolean;
  testIsolateCount: number;
  observationCount: number;
  blockingFlagCount: number;
  warningFlagCount: number;
  latestCalculationAt: string | null;
  latestMu3Auc: number | null;
  updatedAt: string;
}

export interface DashboardSummary {
  totalExperiments: number;
  calculatedExperiments: number;
  pendingReviewCount: number;
  reviewedCount: number;
  blockingQaExperimentsCount: number;
  recentExperiments: ExperimentSummaryItem[];
}

export interface ComparativeRunItem {
  experiment: Experiment;
  protocol: ProtocolProfile;
  referenceStrain: ReferenceStrain;
  latestCalculation: CalculationRecord | null;
  qaFlags: QaFlag[];
  isolates: Isolate[];
  observationCount: number;
}

export interface ComparativeDataset {
  runs: ComparativeRunItem[];
  protocols: ProtocolProfile[];
}

export type ConnectivityProfile = 'OFFLINE_FIRST' | 'INTERMITTENT' | 'ONLINE';

export type ColdChainMethod =
  | 'ICE_BOX_2_8C'
  | 'PORTABLE_INCUBATOR'
  | 'AMBIENT_CARRIER';

export type DispatchStatus =
  | 'IN_TRANSIT'
  | 'RECEIVED_AT_LAB'
  | 'REPORT_RETURNED';

export type CampStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';

export type TribalLanguageCode = 'en' | 'hi' | 'mr';

export interface TribalCluster {
  id: string;
  clusterCode: string;
  name: string;
  district: string;
  stateName: string;
  primaryLanguage: TribalLanguageCode;
  connectivityProfile: ConnectivityProfile;
  referralLabName: string;
  activeChwCount: number;
  createdAt: string;
}

export interface FieldSampleDispatch {
  id: string;
  sampleCode: string;
  clusterId: string;
  clusterName?: string;
  experimentId: string | null;
  runId?: string | null;
  villageName: string;
  chwId: string;
  collectedAt: string;
  coldChainMethod: ColdChainMethod;
  transitHours: number;
  coldChainIntact: boolean;
  viabilityAlert: 'OK' | 'DELAY_WARNING' | 'COLD_CHAIN_BREACH';
  status: DispatchStatus;
  notes: string;
  syncedFromOffline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MobileClinicCamp {
  id: string;
  campCode: string;
  clusterId: string;
  clusterName?: string;
  villageName: string;
  campDate: string;
  servicesSummary: string;
  leadChwId: string;
  expectedHouseholds: number;
  status: CampStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClusterSurveillanceStat {
  clusterId: string;
  clusterCode: string;
  clusterName: string;
  district: string;
  primaryLanguage: TribalLanguageCode;
  linkedDispatchesCount: number;
  linkedRunsCount: number;
  hvisaCompatibleCount: number;
  expertReviewCount: number;
  coldChainAlertCount: number;
}

export interface TribalOutreachOverview {
  clusters: TribalCluster[];
  dispatches: FieldSampleDispatch[];
  camps: MobileClinicCamp[];
  clusterStats: ClusterSurveillanceStat[];
  totals: {
    activeClusters: number;
    pendingSamples: number;
    coldChainAlerts: number;
    upcomingCamps: number;
  };
}

export interface CommunityHealthCard {
  id: string;
  topicKey: 'antibiotic_completion' | 'wound_hygiene' | 'sample_journey';
  iconType: 'shield' | 'droplets' | 'truck';
  translations: Record<
    TribalLanguageCode,
    {
      title: string;
      summary: string;
      actionSteps: string[];
      spokenScript: string;
    }
  >;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  faceLockEnabled: boolean;
  faceEnrolledAt: string | null;
  preferredLanguage: TribalLanguageCode;
  highContrast: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthSessionResponse {
  token: string;
  authMethod: 'PASSWORD' | 'FACE_LOCK';
  matchScore?: number;
  user: AuthUser;
}

export interface AuthUserDirectoryItem {
  username: string;
  displayName: string;
  role: UserRole;
  faceLockEnabled: boolean;
}

export interface ForgotPasswordResponse {
  ok: boolean;
  message: string;
  demoOtp?: string;
  expiresInMinutes?: number;
  resendCount?: number;
  maxResends?: number;
}

export interface PublicPortalOverview {
  dashboard: DashboardSummary;
  clustersCount: number;
  upcomingCampsCount: number;
  pendingSamplesCount: number;
  coldChainAlertsCount: number;
  upcomingCamps: Array<{
    campCode: string;
    villageName: string;
    campDate: string;
    clusterName: string;
    status: CampStatus;
  }>;
  protocols: Array<{
    id: string;
    name: string;
    version: string;
    hvisaLowerThreshold: number;
    visaUpperThreshold: number;
  }>;
}

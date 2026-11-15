/**
 * Normalized SQLite relational schema for hVISA Insight.
 * Covers: protocol_profiles, reference_strains, experiments, isolates,
 * observations, calculations, qa_flags, reviews, and audit_history.
 */
export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS protocol_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  source_citation TEXT NOT NULL,
  concentration_grid_json TEXT NOT NULL,
  expected_replicates INTEGER NOT NULL DEFAULT 1,
  default_plated_volume_ml REAL NOT NULL DEFAULT 0.1,
  default_dilution_fraction REAL NOT NULL DEFAULT 0.001,
  incubation_conditions TEXT NOT NULL DEFAULT 'BHI agar, 37 C for 48 hours',
  zero_colony_policy TEXT NOT NULL DEFAULT 'DETECTION_LIMIT',
  aggregation_method TEXT NOT NULL DEFAULT 'ARITHMETIC_MEAN_LOG10',
  hvisa_lower_threshold REAL NOT NULL DEFAULT 0.90,
  visa_upper_threshold REAL NOT NULL DEFAULT 1.30,
  interpretation_below_label TEXT NOT NULL,
  interpretation_hvisa_label TEXT NOT NULL,
  interpretation_above_label TEXT NOT NULL,
  disclaimer_text TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reference_strains (
  id TEXT PRIMARY KEY,
  strain_code TEXT NOT NULL,
  atcc_number TEXT NOT NULL,
  species TEXT NOT NULL,
  description TEXT NOT NULL,
  is_synthetic_demo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  experiment_date TEXT NOT NULL,
  protocol_profile_id TEXT NOT NULL,
  reference_strain_id TEXT NOT NULL,
  analyst_id TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  is_synthetic_demo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (protocol_profile_id) REFERENCES protocol_profiles(id),
  FOREIGN KEY (reference_strain_id) REFERENCES reference_strains(id)
);

CREATE TABLE IF NOT EXISTS isolates (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  strain_id TEXT NOT NULL,
  strain_role TEXT NOT NULL,
  display_label TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  isolate_id TEXT NOT NULL,
  strain_id TEXT NOT NULL,
  strain_role TEXT NOT NULL,
  vancomycin_concentration_mg_L REAL NOT NULL,
  replicate_id TEXT NOT NULL,
  dilution_fraction REAL NOT NULL,
  plated_volume_ml REAL NOT NULL,
  colony_count REAL NOT NULL,
  data_origin TEXT NOT NULL,
  row_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
  FOREIGN KEY (isolate_id) REFERENCES isolates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calculations (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  calculation_version TEXT NOT NULL,
  protocol_profile_id TEXT NOT NULL,
  protocol_version TEXT NOT NULL,
  protocol_snapshot_json TEXT NOT NULL,
  mu3_auc REAL,
  is_valid INTEGER NOT NULL DEFAULT 1,
  results_json TEXT NOT NULL,
  calculated_by TEXT NOT NULL,
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qa_flags (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  calculation_id TEXT,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  resolution_hint TEXT NOT NULL,
  observation_id TEXT,
  row_reference TEXT,
  field_name TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_by TEXT,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  calculation_id TEXT,
  reviewer_id TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  decision TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_history (
  id TEXT PRIMARY KEY,
  experiment_id TEXT,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  diff_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tribal_clusters (
  id TEXT PRIMARY KEY,
  cluster_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  state_name TEXT NOT NULL,
  primary_language TEXT NOT NULL DEFAULT 'hi',
  connectivity_profile TEXT NOT NULL DEFAULT 'INTERMITTENT',
  referral_lab_name TEXT NOT NULL,
  active_chw_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS field_sample_dispatches (
  id TEXT PRIMARY KEY,
  sample_code TEXT NOT NULL UNIQUE,
  cluster_id TEXT NOT NULL,
  experiment_id TEXT,
  village_name TEXT NOT NULL,
  chw_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  cold_chain_method TEXT NOT NULL DEFAULT 'ICE_BOX_2_8C',
  transit_hours REAL NOT NULL DEFAULT 0,
  cold_chain_intact INTEGER NOT NULL DEFAULT 1,
  viability_alert TEXT NOT NULL DEFAULT 'OK',
  status TEXT NOT NULL DEFAULT 'IN_TRANSIT',
  notes TEXT NOT NULL DEFAULT '',
  synced_from_offline INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (cluster_id) REFERENCES tribal_clusters(id) ON DELETE CASCADE,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mobile_clinic_camps (
  id TEXT PRIMARY KEY,
  camp_code TEXT NOT NULL UNIQUE,
  cluster_id TEXT NOT NULL,
  village_name TEXT NOT NULL,
  camp_date TEXT NOT NULL,
  services_summary TEXT NOT NULL,
  lead_chw_id TEXT NOT NULL,
  expected_households INTEGER NOT NULL DEFAULT 25,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (cluster_id) REFERENCES tribal_clusters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'LAB_ANALYST',
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  face_lock_enabled INTEGER NOT NULL DEFAULT 0,
  face_descriptor_json TEXT,
  face_enrolled_at TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  high_contrast INTEGER NOT NULL DEFAULT 0,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  auth_method TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  otp_salt TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  resend_count INTEGER NOT NULL DEFAULT 0,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_observations_experiment ON observations(experiment_id, row_order);
CREATE INDEX IF NOT EXISTS idx_calculations_experiment ON calculations(experiment_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_flags_experiment ON qa_flags(experiment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_experiment ON reviews(experiment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_experiment ON audit_history(experiment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatches_cluster ON field_sample_dispatches(cluster_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_camps_cluster ON mobile_clinic_camps(cluster_id, camp_date ASC);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_user ON password_reset_otps(user_id, created_at DESC);
`;


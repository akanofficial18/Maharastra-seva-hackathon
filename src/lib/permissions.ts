import type { UserRole } from '../types/hvisa.ts';

export interface RoleDefinition {
  role: UserRole;
  label: string;
  shortLabel: string;
  demoActorId: string;
  description: string;
}

export const DEMO_ROLES: Record<UserRole, RoleDefinition> = {
  LAB_ANALYST: {
    role: 'LAB_ANALYST',
    label: 'Lab Analyst',
    shortLabel: 'Analyst',
    demoActorId: 'DEMO-ANALYST-01',
    description:
      'Create experiments, enter or import observations, run validation and PAP-AUC calculations, and draft reports.',
  },
  REVIEWER_MICROBIOLOGIST: {
    role: 'REVIEWER_MICROBIOLOGIST',
    label: 'Reviewer / Microbiologist',
    shortLabel: 'Reviewer',
    demoActorId: 'DEMO-REVIEWER-01',
    description:
      'Inspect calculations and QA flags, configure interpretation boundaries/wording, add comments, and mark runs reviewed.',
  },
  AUDITOR: {
    role: 'AUDITOR',
    label: 'Auditor',
    shortLabel: 'Auditor',
    demoActorId: 'DEMO-AUDITOR-01',
    description:
      'Read-only access to experiment metadata, raw input records, calculation versions, audit history, and exported reports.',
  },
};

export interface RolePermissions {
  canCreateExperiment: boolean;
  canEditExperimentMetadata: boolean;
  canEditObservations: boolean;
  canImportCsv: boolean;
  canRunValidationAndCalculation: boolean;
  canCreateProtocolProfile: boolean;
  canConfigureProtocolThresholds: boolean;
  canAcknowledgeQaFlags: boolean;
  canSubmitReview: boolean;
  canExportReport: boolean;
  canViewAuditHistory: boolean;
  canManageFieldOutreach: boolean;
  canReturnCommunityReport: boolean;
}

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'LAB_ANALYST':
      return {
        canCreateExperiment: true,
        canEditExperimentMetadata: true,
        canEditObservations: true,
        canImportCsv: true,
        canRunValidationAndCalculation: true,
        canCreateProtocolProfile: true,
        canConfigureProtocolThresholds: false,
        canAcknowledgeQaFlags: false,
        canSubmitReview: false,
        canExportReport: true,
        canViewAuditHistory: true,
        canManageFieldOutreach: true,
        canReturnCommunityReport: false,
      };
    case 'REVIEWER_MICROBIOLOGIST':
      return {
        canCreateExperiment: false,
        canEditExperimentMetadata: false,
        canEditObservations: false,
        canImportCsv: false,
        canRunValidationAndCalculation: true,
        canCreateProtocolProfile: true,
        canConfigureProtocolThresholds: true,
        canAcknowledgeQaFlags: true,
        canSubmitReview: true,
        canExportReport: true,
        canViewAuditHistory: true,
        canManageFieldOutreach: true,
        canReturnCommunityReport: true,
      };
    case 'AUDITOR':
      return {
        canCreateExperiment: false,
        canEditExperimentMetadata: false,
        canEditObservations: false,
        canImportCsv: false,
        canRunValidationAndCalculation: false,
        canCreateProtocolProfile: false,
        canConfigureProtocolThresholds: false,
        canAcknowledgeQaFlags: false,
        canSubmitReview: false,
        canExportReport: true,
        canViewAuditHistory: true,
        canManageFieldOutreach: false,
        canReturnCommunityReport: false,
      };
  }
}


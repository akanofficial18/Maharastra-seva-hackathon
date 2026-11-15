import type {
  AuditEvent,
  AuthSessionResponse,
  AuthUser,
  AuthUserDirectoryItem,
  CampStatus,
  ColdChainMethod,
  ComparativeDataset,
  ConnectivityProfile,
  DashboardSummary,
  DispatchStatus,
  ExperimentDetail,
  ExperimentSummaryItem,
  FieldSampleDispatch,
  ForgotPasswordResponse,
  MobileClinicCamp,
  ProtocolProfile,
  PublicPortalOverview,
  ReferenceStrain,
  ReviewDecision,
  StrainRole,
  TribalCluster,
  TribalLanguageCode,
  TribalOutreachOverview,
  UserRole,
} from '../types/hvisa.ts';

export const AUTH_TOKEN_STORAGE_KEY = 'hvisa_auth_token_v1';

export function getStoredAuthToken(): string {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function apiRequest<T>(
  url: string,
  role: UserRole,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Demo-Role', role);
  const token = getStoredAuthToken();
  if (token) {
    headers.set('X-Auth-Token', token);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `Request failed (${response.status})`;
    const error = new Error(message) as Error & { status?: number; data?: unknown };
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  getPublicPortalOverview() {
    return apiRequest<PublicPortalOverview>('/api/portal/overview', 'LAB_ANALYST');
  },

  getDashboard(role: UserRole) {
    return apiRequest<DashboardSummary>('/api/dashboard', role);
  },

  getComparativeData(role: UserRole) {
    return apiRequest<ComparativeDataset>('/api/comparative', role);
  },

  getAuditHistory(role: UserRole) {
    return apiRequest<{ events: AuditEvent[] }>('/api/audit', role);
  },

  getProtocols(role: UserRole) {
    return apiRequest<{ protocols: ProtocolProfile[]; referenceStrains: ReferenceStrain[] }>(
      '/api/protocols',
      role
    );
  },

  createProtocol(
    role: UserRole,
    input: Omit<ProtocolProfile, 'id' | 'updatedAt' | 'updatedBy'>
  ) {
    return apiRequest<ProtocolProfile>('/api/protocols', role, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateProtocol(
    role: UserRole,
    protocolId: string,
    patch: Partial<ProtocolProfile>
  ) {
    return apiRequest<ProtocolProfile>(`/api/protocols/${protocolId}`, role, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  },

  listExperiments(role: UserRole) {
    return apiRequest<ExperimentSummaryItem[]>('/api/experiments', role);
  },

  getExperiment(role: UserRole, id: string) {
    return apiRequest<ExperimentDetail>(`/api/experiments/${id}`, role);
  },

  createExperiment(
    role: UserRole,
    input: {
      runId: string;
      experimentDate: string;
      protocolProfileId: string;
      referenceStrainId: string;
      analystId: string;
      notes: string;
      isSyntheticDemo: boolean;
    }
  ) {
    return apiRequest<ExperimentDetail>('/api/experiments', role, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateExperimentMetadata(
    role: UserRole,
    id: string,
    patch: Partial<{
      runId: string;
      experimentDate: string;
      protocolProfileId: string;
      referenceStrainId: string;
      analystId: string;
      notes: string;
    }>
  ) {
    return apiRequest<ExperimentDetail>(`/api/experiments/${id}`, role, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  saveObservations(
    role: UserRole,
    experimentId: string,
    observations: Array<{
      id?: string;
      strainId: string;
      strainRole: StrainRole;
      vancomycinConcentrationMgL: number;
      replicateId: string;
      dilutionFraction: number;
      platedVolumeMl: number;
      colonyCount: number;
      dataOrigin?: string;
    }>
  ) {
    return apiRequest<ExperimentDetail>(`/api/experiments/${experimentId}/observations`, role, {
      method: 'PUT',
      body: JSON.stringify({ observations }),
    });
  },

  validateExperiment(role: UserRole, experimentId: string) {
    return apiRequest<ExperimentDetail>(`/api/experiments/${experimentId}/validate`, role, {
      method: 'POST',
    });
  },

  calculateExperiment(role: UserRole, experimentId: string) {
    return apiRequest<{ ok: boolean; error?: string; detail: ExperimentDetail }>(
      `/api/experiments/${experimentId}/calculate`,
      role,
      { method: 'POST' }
    );
  },

  acknowledgeQaFlag(role: UserRole, experimentId: string, flagId: string) {
    return apiRequest<ExperimentDetail>(
      `/api/experiments/${experimentId}/qa-flags/${flagId}/acknowledge`,
      role,
      { method: 'POST' }
    );
  },

  submitReview(
    role: UserRole,
    experimentId: string,
    decision: ReviewDecision,
    comment: string
  ) {
    return apiRequest<ExperimentDetail>(`/api/experiments/${experimentId}/reviews`, role, {
      method: 'POST',
      body: JSON.stringify({ decision, comment }),
    });
  },

  loadSampleDemo(role: UserRole) {
    return apiRequest<ExperimentDetail>('/api/demo/load-sample', role, {
      method: 'POST',
    });
  },

  getSampleCsv(role: UserRole) {
    return apiRequest<{ csv: string }>('/api/demo/sample-csv', role);
  },

  explainQaFlag(
    role: UserRole,
    flag: { code: string; message: string; resolutionHint: string }
  ) {
    return apiRequest<{ source: string; explanation: string }>('/api/qa/explain', role, {
      method: 'POST',
      body: JSON.stringify(flag),
    });
  },

  getTribalOverview(role: UserRole) {
    return apiRequest<TribalOutreachOverview>('/api/tribal/overview', role);
  },

  createTribalCluster(
    role: UserRole,
    input: {
      clusterCode: string;
      name: string;
      district: string;
      stateName: string;
      primaryLanguage: TribalLanguageCode;
      connectivityProfile: ConnectivityProfile;
      referralLabName: string;
      activeChwCount: number;
    }
  ) {
    return apiRequest<TribalCluster>('/api/tribal/clusters', role, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  createFieldDispatch(
    role: UserRole,
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
    }
  ) {
    return apiRequest<FieldSampleDispatch>('/api/tribal/dispatches', role, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  bulkSyncFieldDispatches(
    role: UserRole,
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
    }>
  ) {
    return apiRequest<{
      syncedCount: number;
      skippedCodes: string[];
      dispatches: FieldSampleDispatch[];
    }>('/api/tribal/dispatches/bulk-sync', role, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  updateDispatchStatus(
    role: UserRole,
    dispatchId: string,
    patch: {
      status?: DispatchStatus;
      experimentId?: string | null;
      transitHours?: number;
      coldChainIntact?: boolean;
    }
  ) {
    return apiRequest<FieldSampleDispatch>(`/api/tribal/dispatches/${dispatchId}/status`, role, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  createMobileCamp(
    role: UserRole,
    input: {
      campCode: string;
      clusterId: string;
      villageName: string;
      campDate: string;
      servicesSummary: string;
      leadChwId: string;
      expectedHouseholds: number;
    }
  ) {
    return apiRequest<MobileClinicCamp>('/api/tribal/camps', role, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateCampStatus(role: UserRole, campId: string, status: CampStatus) {
    return apiRequest<MobileClinicCamp>(`/api/tribal/camps/${campId}/status`, role, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  getCommunitySummary(
    role: UserRole,
    experimentId: string | null,
    language: TribalLanguageCode
  ) {
    return apiRequest<{ source: string; language: TribalLanguageCode; summary: string }>(
      '/api/tribal/community-summary',
      role,
      {
        method: 'POST',
        body: JSON.stringify({ experimentId, language }),
      }
    );
  },

  listAuthUsers() {
    return apiRequest<{ users: AuthUserDirectoryItem[] }>('/api/auth/users', 'LAB_ANALYST');
  },

  getAuthSession() {
    return apiRequest<{ token: string; authMethod: 'PASSWORD' | 'FACE_LOCK'; user: AuthUser }>(
      '/api/auth/session',
      'LAB_ANALYST'
    );
  },

  registerUser(input: {
    username: string;
    displayName: string;
    email: string;
    role: UserRole;
    password: string;
    faceDescriptor?: number[] | null;
    preferredLanguage?: TribalLanguageCode;
  }) {
    return apiRequest<AuthSessionResponse>('/api/auth/register', input.role, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  loginWithPassword(username: string, password: string) {
    return apiRequest<AuthSessionResponse>('/api/auth/login', 'LAB_ANALYST', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  loginWithFace(faceDescriptor: number[], username?: string) {
    return apiRequest<AuthSessionResponse>('/api/auth/face-login', 'LAB_ANALYST', {
      method: 'POST',
      body: JSON.stringify({ faceDescriptor, username }),
    });
  },

  requestPasswordResetOtp(username: string, email: string) {
    return apiRequest<ForgotPasswordResponse>('/api/auth/forgot-password', 'LAB_ANALYST', {
      method: 'POST',
      body: JSON.stringify({ username, email }),
    });
  },

  resetPasswordWithOtp(input: {
    username: string;
    email: string;
    otp: string;
    newPassword: string;
  }) {
    return apiRequest<{ ok: boolean; message: string }>('/api/auth/reset-password', 'LAB_ANALYST', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  changePassword(role: UserRole, currentPassword: string, newPassword: string) {
    return apiRequest<{ ok: boolean; message: string }>('/api/auth/change-password', role, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  updateUserPreferences(
    role: UserRole,
    patch: { preferredLanguage?: TribalLanguageCode; highContrast?: boolean }
  ) {
    return apiRequest<{ user: AuthUser }>('/api/auth/preferences', role, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  enrollFaceLock(role: UserRole, faceDescriptor: number[]) {
    return apiRequest<{ user: AuthUser }>('/api/auth/face/enroll', role, {
      method: 'POST',
      body: JSON.stringify({ faceDescriptor }),
    });
  },

  disableFaceLock(role: UserRole) {
    return apiRequest<{ user: AuthUser }>('/api/auth/face/enroll', role, {
      method: 'DELETE',
    });
  },

  logout(allDevices = false) {
    return apiRequest<{ ok: boolean }>('/api/auth/logout', 'LAB_ANALYST', {
      method: 'POST',
      body: JSON.stringify({ allDevices }),
    });
  },
};


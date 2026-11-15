import { useCallback, useEffect, useState } from 'react';
import {
  api,
  getStoredAuthToken,
  setStoredAuthToken,
} from './lib/api.ts';
import { LanguageProvider, useI18n } from './lib/i18n.tsx';
import { getRolePermissions } from './lib/permissions.ts';
import { PORTAL_CONTENT } from './lib/portalContent.ts';
import type {
  AuthSessionResponse,
  AuthUser,
  DashboardSummary,
  ExperimentDetail,
  ProtocolProfile,
  ReferenceStrain,
  TribalLanguageCode,
  UserRole,
} from './types/hvisa.ts';
import { DashboardView } from './components/DashboardView.tsx';
import { ExperimentWorkspaceView } from './components/ExperimentWorkspaceView.tsx';
import { LoginView } from './components/LoginView.tsx';
import { PapAucAnalysisView } from './components/PapAucAnalysisView.tsx';
import { PortalFooter } from './components/PortalFooter.tsx';
import { PortalHomeView } from './components/PortalHomeView.tsx';
import { QualityAssuranceView } from './components/QualityAssuranceView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { TopHeader, type AppScreen } from './components/TopHeader.tsx';
import { TribalOutreachView } from './components/TribalOutreachView.tsx';

const PROTECTED_ROUTES: AppScreen[] = [
  'dashboard',
  'experiments',
  'analysis',
  'qa',
  'reports',
  'outreach',
  'settings',
];

function parseProtectedHash(): AppScreen | null {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if ((PROTECTED_ROUTES as string[]).includes(hash)) {
    return hash as AppScreen;
  }
  return null;
}

function PortalShell() {
  const { lang, setLang, setHighContrast, t } = useI18n();
  const content = PORTAL_CONTENT[lang] ?? PORTAL_CONTENT.en;

  const [checkingSession, setCheckingSession] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [viewMode, setViewMode] = useState<'public' | 'workspace'>('public');
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authInitialScreen, setAuthInitialScreen] = useState<'login' | 'register'>('login');
  const [pendingScreen, setPendingScreen] = useState<AppScreen | null>(null);
  const [pendingExperimentId, setPendingExperimentId] = useState<string | null>(null);
  const [activePublicSection, setActivePublicSection] = useState<string>('home');

  const [role, setRole] = useState<UserRole>('LAB_ANALYST');
  const [activeScreen, setActiveScreen] = useState<AppScreen>('dashboard');
  const [analysisMode, setAnalysisMode] = useState<'single' | 'comparative'>('single');

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [protocols, setProtocols] = useState<ProtocolProfile[]>([]);
  const [referenceStrains, setReferenceStrains] = useState<ReferenceStrain[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [experimentDetail, setExperimentDetail] = useState<ExperimentDetail | null>(null);

  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [highlightObservationId, setHighlightObservationId] = useState<string | null>(null);
  const [openProtocolConfigTick, setOpenProtocolConfigTick] = useState(0);

  // Restore existing session or redirect protected URL hashes to login
  useEffect(() => {
    const requestedHash = parseProtectedHash();
    const token = getStoredAuthToken();

    if (!token) {
      if (requestedHash) {
        setPendingScreen(requestedHash);
        setAuthInitialScreen('login');
        setShowAuthScreen(true);
      }
      setCheckingSession(false);
      return;
    }

    api
      .getAuthSession()
      .then((res) => {
        setCurrentUser(res.user);
        setRole(res.user.role);
        if (res.user.preferredLanguage) {
          setLang(res.user.preferredLanguage);
        }
        if (typeof res.user.highContrast === 'boolean') {
          setHighContrast(res.user.highContrast);
        }
        setViewMode('workspace');
        setActiveScreen(requestedHash ?? 'dashboard');
      })
      .catch(() => {
        setStoredAuthToken(null);
        setCurrentUser(null);
        if (requestedHash) {
          setPendingScreen(requestedHash);
          setAuthInitialScreen('login');
          setShowAuthScreen(true);
        }
      })
      .finally(() => {
        setCheckingSession(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Protect manual hash changes while logged out
  useEffect(() => {
    const handleHashChange = () => {
      const requestedHash = parseProtectedHash();
      if (!requestedHash) return;
      if (!currentUser) {
        setPendingScreen(requestedHash);
        setAuthInitialScreen('login');
        setShowAuthScreen(true);
      } else {
        setViewMode('workspace');
        setActiveScreen(requestedHash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  const refreshProtocolsAndDashboard = useCallback(
    async (currentRole: UserRole) => {
      if (!currentUser) return;
      setLoadingDashboard(true);
      setGlobalError(null);
      try {
        const [dash, protoRes] = await Promise.all([
          api.getDashboard(currentRole),
          api.getProtocols(currentRole),
        ]);
        setDashboard(dash);
        setProtocols(protoRes.protocols);
        setReferenceStrains(protoRes.referenceStrains);

        setSelectedExperimentId((prev) => {
          if (prev && dash.recentExperiments.some((e) => e.id === prev)) {
            return prev;
          }
          return dash.recentExperiments[0]?.id ?? null;
        });
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : 'Failed to load workspace data');
      } finally {
        setLoadingDashboard(false);
      }
    },
    [currentUser]
  );

  const loadExperimentDetail = useCallback(
    async (expId: string, currentRole: UserRole) => {
      if (!currentUser) return;
      setLoadingDetail(true);
      try {
        const detail = await api.getExperiment(currentRole, expId);
        setExperimentDetail(detail);
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : 'Failed to load experiment');
      } finally {
        setLoadingDetail(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    if (currentUser) {
      refreshProtocolsAndDashboard(role);
    } else {
      setDashboard(null);
      setExperimentDetail(null);
    }
  }, [currentUser, role, refreshProtocolsAndDashboard]);

  useEffect(() => {
    if (currentUser && selectedExperimentId) {
      loadExperimentDetail(selectedExperimentId, role);
    } else if (!currentUser) {
      setExperimentDetail(null);
    }
  }, [currentUser, selectedExperimentId, role, loadExperimentDetail]);

  const screenLabel = (screen: AppScreen): string => {
    const nav = content.header.authNav;
    switch (screen) {
      case 'dashboard':
        return nav.dashboard;
      case 'experiments':
        return nav.experiments;
      case 'analysis':
        return nav.analysis;
      case 'qa':
        return nav.qa;
      case 'reports':
        return nav.reports;
      case 'outreach':
        return nav.outreach;
      case 'settings':
        return nav.settings;
      default:
        return content.header.siteName;
    }
  };

  const navigateOrPromptAuth = (screen: AppScreen, expId?: string) => {
    if (screen !== 'experiments') {
      setHighlightObservationId(null);
    }
    if (screen === 'home') {
      openPublicHome('home');
      return;
    }
    if (!currentUser) {
      setPendingScreen(screen);
      setPendingExperimentId(expId ?? null);
      setAuthInitialScreen('login');
      setShowAuthScreen(true);
      return;
    }
    if (expId) {
      setSelectedExperimentId(expId);
    }
    setShowAuthScreen(false);
    setViewMode('workspace');
    setActiveScreen(screen);
    window.history.replaceState(null, '', `#${screen}`);
  };

  const openPublicHome = (sectionId = 'home') => {
    setShowAuthScreen(false);
    setViewMode('public');
    setActivePublicSection(sectionId);
    window.history.replaceState(null, '', `#${sectionId}`);
    requestAnimationFrame(() => {
      if (sectionId === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleAuthenticated = (session: AuthSessionResponse) => {
    setStoredAuthToken(session.token);
    setCurrentUser(session.user);
    setRole(session.user.role);
    if (session.user.preferredLanguage) {
      setLang(session.user.preferredLanguage);
    }
    if (typeof session.user.highContrast === 'boolean') {
      setHighContrast(session.user.highContrast);
    }
    setShowAuthScreen(false);
    setViewMode('workspace');
    if (pendingExperimentId) {
      setSelectedExperimentId(pendingExperimentId);
      setPendingExperimentId(null);
    }
    const target = pendingScreen ?? 'dashboard';
    setPendingScreen(null);
    setActiveScreen(target);
    window.history.replaceState(null, '', `#${target}`);
  };

  const handleLogout = async (allDevices = false) => {
    try {
      await api.logout(allDevices);
    } catch {
      // ignore
    }
    setStoredAuthToken(null);
    setCurrentUser(null);
    setShowAuthScreen(false);
    setViewMode('public');
    setActivePublicSection('home');
    window.history.replaceState(null, '', '#home');
  };

  const handleLanguageChangeFromHeader = (nextLang: TribalLanguageCode) => {
    if (!currentUser) return;
    api
      .updateUserPreferences(role, { preferredLanguage: nextLang })
      .then((res) => setCurrentUser(res.user))
      .catch(() => {});
  };

  const handleDetailUpdated = (next: ExperimentDetail) => {
    setExperimentDetail(next);
    setSelectedExperimentId(next.experiment.id);
    if (currentUser) {
      api.getDashboard(role).then(setDashboard).catch(() => {});
    }
  };

  const handleSelectExperiment = (id: string, targetScreen?: AppScreen) => {
    setHighlightObservationId(null);
    setSelectedExperimentId(id);
    if (targetScreen) {
      navigateOrPromptAuth(targetScreen, id);
    }
  };

  const handleCreateExperiment = async (input: {
    runId: string;
    experimentDate: string;
    protocolProfileId: string;
    referenceStrainId: string;
    analystId: string;
    notes: string;
    isSyntheticDemo: boolean;
  }) => {
    const created = await api.createExperiment(role, input);
    await refreshProtocolsAndDashboard(role);
    setSelectedExperimentId(created.experiment.id);
    setExperimentDetail(created);
    setViewMode('workspace');
    setActiveScreen('experiments');
  };

  const handleLoadSampleDemo = async () => {
    setGlobalError(null);
    try {
      const created = await api.loadSampleDemo(role);
      await refreshProtocolsAndDashboard(role);
      setSelectedExperimentId(created.experiment.id);
      setExperimentDetail(created);
      setViewMode('workspace');
      setActiveScreen('experiments');
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to load sample run');
    }
  };

  const handleJumpToRow = (observationId: string) => {
    setHighlightObservationId(observationId);
    setViewMode('workspace');
    setActiveScreen('experiments');
  };

  const permissions = getRolePermissions(role);
  const runScopedScreen =
    currentUser &&
    viewMode === 'workspace' &&
    ['experiments', 'analysis', 'qa', 'reports'].includes(activeScreen);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#F7F8F9] flex items-center justify-center text-sm text-[#1F2933]">
        Loading सूक्ष्मवेध (SukshmaVedh)...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8F9] text-[#1F2933]">
      <TopHeader
        viewMode={showAuthScreen && !currentUser ? 'public' : viewMode}
        activeScreen={activeScreen}
        activePublicSection={activePublicSection}
        currentUser={currentUser}
        onNavigate={(screen) => navigateOrPromptAuth(screen)}
        onOpenPublicHome={(sectionId) => openPublicHome(sectionId ?? 'home')}
        onOpenWorkspace={() => {
          setShowAuthScreen(false);
          setViewMode('workspace');
          setActiveScreen(activeScreen === 'home' ? 'dashboard' : activeScreen);
        }}
        onOpenAuth={(mode) => {
          setPendingScreen(null);
          setAuthInitialScreen(mode);
          setShowAuthScreen(true);
        }}
        onOpenSettings={() => navigateOrPromptAuth('settings')}
        onLogout={() => handleLogout(false)}
        onLanguageChange={handleLanguageChangeFromHeader}
      />

      <main id="main-content" className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-8">
        {globalError && (
          <div className="mb-5 px-4 py-3 bg-[#FDF2F2] border border-[#B3261E] text-[#B3261E] text-sm rounded-[4px]">
            {globalError}
          </div>
        )}

        {showAuthScreen && !currentUser ? (
          <LoginView
            key={authInitialScreen}
            onAuthenticated={handleAuthenticated}
            initialScreen={authInitialScreen}
            pendingScreenLabel={pendingScreen ? screenLabel(pendingScreen) : null}
            onBackToHome={() => openPublicHome('home')}
          />
        ) : !currentUser || viewMode === 'public' ? (
          <PortalHomeView
            currentUser={currentUser}
            onOpenAuth={(mode) => {
              setPendingScreen(null);
              setAuthInitialScreen(mode);
              setShowAuthScreen(true);
            }}
            onOpenWorkspace={() => {
              setViewMode('workspace');
              setActiveScreen('dashboard');
            }}
            onActiveSectionChange={setActivePublicSection}
          />
        ) : (
          <div className="space-y-5">
            {runScopedScreen && (
              <div className="no-print bg-white border border-[#DCE1E6] rounded-[4px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <label htmlFor="workspace-active-run" className="font-bold text-[#1F2933]">
                    {t('activeRunLabel')}:
                  </label>
                  <select
                    id="workspace-active-run"
                    value={selectedExperimentId ?? ''}
                    onChange={(e) => {
                      if (e.target.value) handleSelectExperiment(e.target.value);
                    }}
                    className="font-mono text-xs font-bold text-[#1F2933] bg-[#F7F8F9] border border-[#DCE1E6] rounded-[4px] px-2.5 py-1.5 focus:outline-2 focus:outline-[#FF9933]"
                  >
                    {(dashboard?.recentExperiments ?? []).length === 0 ? (
                      <option value="">—</option>
                    ) : (
                      (dashboard?.recentExperiments ?? []).map((exp) => (
                        <option key={exp.id} value={exp.id}>
                          {exp.runId} ({exp.experimentDate})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {permissions.canCreateExperiment && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveScreen('dashboard');
                      setShowNewModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-[#0B5D1E] hover:bg-[#094a17] text-white rounded-[4px] cursor-pointer"
                  >
                    {content.dashboard.btnNewExperiment}
                  </button>
                )}
              </div>
            )}

            {activeScreen === 'dashboard' && (
              <DashboardView
                currentUser={currentUser}
                summary={dashboard}
                loading={loadingDashboard}
                role={role}
                protocols={protocols}
                referenceStrains={referenceStrains}
                onSelectExperiment={(id, targetScreen) => handleSelectExperiment(id, targetScreen)}
                onNavigate={(screen) => navigateOrPromptAuth(screen)}
                onCreateExperiment={handleCreateExperiment}
                onLoadSampleDemo={handleLoadSampleDemo}
                onOpenComparative={() => {
                  setAnalysisMode('comparative');
                  setActiveScreen('analysis');
                }}
                showNewModal={showNewModal}
                setShowNewModal={setShowNewModal}
              />
            )}

            {activeScreen === 'experiments' && (
              <ExperimentWorkspaceView
                detail={experimentDetail}
                loading={loadingDetail}
                role={role}
                protocols={protocols}
                referenceStrains={referenceStrains}
                highlightObservationId={highlightObservationId}
                onDetailUpdated={handleDetailUpdated}
                onNavigate={(screen) => {
                  if (screen === 'lab') navigateOrPromptAuth('experiments');
                  else navigateOrPromptAuth(screen);
                }}
                onOpenProtocolSettings={() => {
                  setAnalysisMode('single');
                  setOpenProtocolConfigTick((tick) => tick + 1);
                  setActiveScreen('analysis');
                }}
              />
            )}

            {activeScreen === 'analysis' && (
              <PapAucAnalysisView
                detail={experimentDetail}
                loading={loadingDetail}
                role={role}
                analysisMode={analysisMode}
                onAnalysisModeChange={setAnalysisMode}
                onSelectRunAndOpen={(expId) => handleSelectExperiment(expId, 'analysis')}
                openProtocolConfigTick={openProtocolConfigTick}
                onDetailUpdated={handleDetailUpdated}
                onProtocolUpdated={async () => {
                  await refreshProtocolsAndDashboard(role);
                  if (selectedExperimentId) {
                    await loadExperimentDetail(selectedExperimentId, role);
                  }
                }}
                onNavigate={(screen) => {
                  if (screen === 'lab') navigateOrPromptAuth('experiments');
                  else navigateOrPromptAuth(screen);
                }}
              />
            )}

            {activeScreen === 'qa' && (
              <QualityAssuranceView
                detail={experimentDetail}
                loading={loadingDetail}
                role={role}
                onDetailUpdated={handleDetailUpdated}
                onJumpToRow={handleJumpToRow}
              />
            )}

            {activeScreen === 'reports' && (
              <ReportsView detail={experimentDetail} loading={loadingDetail} role={role} />
            )}

            {activeScreen === 'outreach' && (
              <TribalOutreachView
                role={role}
                experiments={dashboard?.recentExperiments ?? []}
                selectedExperimentId={selectedExperimentId}
                onSelectExperiment={(id) => handleSelectExperiment(id)}
              />
            )}

            {activeScreen === 'settings' && (
              <SettingsView
                currentUser={currentUser}
                role={role}
                onRoleChange={(nextRole) => setRole(nextRole)}
                onUserUpdated={(nextUser) => setCurrentUser(nextUser)}
                onGoHome={() => openPublicHome('home')}
                onLogout={(allDevices) => handleLogout(Boolean(allDevices))}
              />
            )}
          </div>
        )}
      </main>

      <PortalFooter onJumpSection={(sectionId) => openPublicHome(sectionId)} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <PortalShell />
    </LanguageProvider>
  );
}

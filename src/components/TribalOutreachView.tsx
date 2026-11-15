import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  CheckCircle2,
  CloudOff,
  Copy,
  Download,
  Droplets,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ThermometerSnowflake,
  Truck,
  Volume2,
  VolumeX,
  Wifi,
  Printer,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { COMMUNITY_HEALTH_CARDS, TRIBAL_LANGUAGES } from '../lib/communityHealthContent.ts';
import { useI18n } from '../lib/i18n.tsx';
import { getRolePermissions } from '../lib/permissions.ts';
import type {
  CampStatus,
  ColdChainMethod,
  ConnectivityProfile,
  DispatchStatus,
  ExperimentSummaryItem,
  FieldSampleDispatch,
  TribalLanguageCode,
  TribalOutreachOverview,
  UserRole,
} from '../types/hvisa.ts';

interface TribalOutreachViewProps {
  role: UserRole;
  experiments: ExperimentSummaryItem[];
  selectedExperimentId: string | null;
  onSelectExperiment: (id: string) => void;
}

interface OfflineDispatchDraft {
  localId: string;
  sampleCode: string;
  clusterId: string;
  experimentId: string | null;
  villageName: string;
  chwId: string;
  collectedAt: string;
  coldChainMethod: ColdChainMethod;
  transitHours: number;
  coldChainIntact: boolean;
  notes: string;
}

const OFFLINE_QUEUE_KEY = 'hvisa_tribal_offline_queue_v1';

type OutreachTab = 'dispatches' | 'clusters_camps' | 'community_cards';

function readOfflineQueue(): OfflineDispatchDraft[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(items: OfflineDispatchDraft[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota failures
  }
}

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function TribalOutreachView({
  role,
  experiments,
  selectedExperimentId,
  onSelectExperiment,
}: TribalOutreachViewProps) {
  const permissions = getRolePermissions(role);
  const { lang: globalLang, setLang: setGlobalLang, t } = useI18n();

  const [activeTab, setActiveTab] = useState<OutreachTab>('dispatches');
  const [overview, setOverview] = useState<TribalOutreachOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Offline-first field queue state
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineDispatchDraft[]>(() =>
    readOfflineQueue()
  );
  const [syncingQueue, setSyncingQueue] = useState(false);

  // Dispatch form state
  const [sampleCode, setSampleCode] = useState(
    `TRB-FLD-${Math.floor(100 + Math.random() * 900)}`
  );
  const [dispatchClusterId, setDispatchClusterId] = useState('');
  const [dispatchExpId, setDispatchExpId] = useState<string>('');
  const [villageName, setVillageName] = useState('');
  const [chwId, setChwId] = useState('ASHA-FLD-01');
  const [coldChainMethod, setColdChainMethod] = useState<ColdChainMethod>('ICE_BOX_2_8C');
  const [transitHours, setTransitHours] = useState('12');
  const [coldChainIntact, setColdChainIntact] = useState(true);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Cluster registration form state
  const [showClusterForm, setShowClusterForm] = useState(false);
  const [clusterCode, setClusterCode] = useState('');
  const [clusterName, setClusterName] = useState('');
  const [clusterDistrict, setClusterDistrict] = useState('');
  const [clusterState, setClusterState] = useState('');
  const [clusterLang, setClusterLang] = useState<TribalLanguageCode>('hi');
  const [clusterConn, setClusterConn] = useState<ConnectivityProfile>('OFFLINE_FIRST');
  const [clusterLab, setClusterLab] = useState('');
  const [clusterChwCount, setClusterChwCount] = useState('10');
  const [submittingCluster, setSubmittingCluster] = useState(false);

  // Camp form state
  const [campCode, setCampCode] = useState(`CAMP-${Math.floor(100 + Math.random() * 900)}`);
  const [campClusterId, setCampClusterId] = useState('');
  const [campVillage, setCampVillage] = useState('');
  const [campDate, setCampDate] = useState(new Date().toISOString().slice(0, 10));
  const [campServices, setCampServices] = useState(
    'Wound hygiene kits, local-language antibiotic counseling, anonymized swab pickup'
  );
  const [campChwId, setCampChwId] = useState('ASHA-CAMP-01');
  const [campHouseholds, setCampHouseholds] = useState('40');
  const [submittingCamp, setSubmittingCamp] = useState(false);

  // Community cards & audio state (synced with global language)
  const selectedLanguage = globalLang;
  const setSelectedLanguage = setGlobalLang;
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [communitySummary, setCommunitySummary] = useState<string>('');
  const [summarySource, setSummarySource] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  const isEffectiveOnline = browserOnline && !simulateOffline;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTribalOverview(role);
      setOverview(data);
      if (data.clusters.length > 0) {
        setDispatchClusterId((prev) =>
          prev && data.clusters.some((c) => c.id === prev) ? prev : data.clusters[0].id
        );
        setCampClusterId((prev) =>
          prev && data.clusters.some((c) => c.id === prev) ? prev : data.clusters[0].id
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tribal outreach data');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleGenerateCommunitySummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await api.getCommunitySummary(
        role,
        selectedExperimentId,
        selectedLanguage
      );
      setCommunitySummary(res.summary);
      setSummarySource(res.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build community summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [role, selectedExperimentId, selectedLanguage]);

  useEffect(() => {
    if (activeTab === 'community_cards') {
      handleGenerateCommunitySummary();
    }
  }, [activeTab, handleGenerateCommunitySummary]);

  const handleSyncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !isEffectiveOnline) return;
    setSyncingQueue(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.bulkSyncFieldDispatches(
        role,
        offlineQueue.map((item) => ({
          sampleCode: item.sampleCode,
          clusterId: item.clusterId,
          experimentId: item.experimentId,
          villageName: item.villageName,
          chwId: item.chwId,
          collectedAt: item.collectedAt,
          coldChainMethod: item.coldChainMethod,
          transitHours: item.transitHours,
          coldChainIntact: item.coldChainIntact,
          notes: item.notes,
        }))
      );
      writeOfflineQueue([]);
      setOfflineQueue([]);
      setNotice(
        `Synced ${result.syncedCount} offline field sample(s) to SQLite.${
          result.skippedCodes.length > 0
            ? ` Skipped duplicate code(s): ${result.skippedCodes.join(', ')}.`
            : ''
        }`
      );
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync offline queue');
    } finally {
      setSyncingQueue(false);
    }
  };

  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!sampleCode.trim() || !dispatchClusterId || !villageName.trim()) {
      setError('Sample Code, Tribal PHC Cluster, and Village/Hamlet are required.');
      return;
    }

    const payload = {
      sampleCode: sampleCode.trim().toUpperCase(),
      clusterId: dispatchClusterId,
      experimentId: dispatchExpId || null,
      villageName: villageName.trim(),
      chwId: chwId.trim() || 'ASHA-FLD-01',
      collectedAt: new Date().toISOString(),
      coldChainMethod,
      transitHours: Number(transitHours) || 0,
      coldChainIntact,
      notes: dispatchNotes.trim(),
    };

    if (!isEffectiveOnline) {
      const draft: OfflineDispatchDraft = {
        localId: `off-${Date.now()}`,
        ...payload,
      };
      const nextQueue = [draft, ...offlineQueue];
      setOfflineQueue(nextQueue);
      writeOfflineQueue(nextQueue);
      setNotice(
        `Saved ${payload.sampleCode} to local Offline Field Queue (${nextQueue.length} pending sync).`
      );
      setSampleCode(`TRB-FLD-${Math.floor(100 + Math.random() * 900)}`);
      setVillageName('');
      setDispatchNotes('');
      return;
    }

    setSubmittingDispatch(true);
    try {
      const created = await api.createFieldDispatch(role, payload);
      setNotice(
        `Logged anonymized dispatch ${created.sampleCode} (${created.viabilityAlert.replace(/_/g, ' ')}).`
      );
      setSampleCode(`TRB-FLD-${Math.floor(100 + Math.random() * 900)}`);
      setVillageName('');
      setDispatchNotes('');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create field dispatch');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const handleAdvanceDispatch = async (
    dispatch: FieldSampleDispatch,
    nextStatus: DispatchStatus
  ) => {
    setError(null);
    setNotice(null);
    try {
      await api.updateDispatchStatus(role, dispatch.id, { status: nextStatus });
      setNotice(`Updated ${dispatch.sampleCode} status to ${nextStatus.replace(/_/g, ' ')}.`);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update dispatch status');
    }
  };

  const handleLinkRunToDispatch = async (dispatchId: string, expId: string) => {
    setError(null);
    try {
      await api.updateDispatchStatus(role, dispatchId, {
        experimentId: expId || null,
      });
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link experiment run');
    }
  };

  const handleCreateCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmittingCluster(true);
    try {
      const created = await api.createTribalCluster(role, {
        clusterCode,
        name: clusterName,
        district: clusterDistrict,
        stateName: clusterState,
        primaryLanguage: clusterLang,
        connectivityProfile: clusterConn,
        referralLabName: clusterLab,
        activeChwCount: Number(clusterChwCount) || 5,
      });
      setNotice(`Registered tribal outreach cluster ${created.clusterCode} (${created.name}).`);
      setShowClusterForm(false);
      setClusterCode('');
      setClusterName('');
      setClusterDistrict('');
      setClusterState('');
      setClusterLab('');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register tribal cluster');
    } finally {
      setSubmittingCluster(false);
    }
  };

  const handleCreateCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmittingCamp(true);
    try {
      const created = await api.createMobileCamp(role, {
        campCode,
        clusterId: campClusterId,
        villageName: campVillage,
        campDate,
        servicesSummary: campServices,
        leadChwId: campChwId,
        expectedHouseholds: Number(campHouseholds) || 25,
      });
      setNotice(`Scheduled mobile camp ${created.campCode} for ${created.villageName}.`);
      setCampCode(`CAMP-${Math.floor(100 + Math.random() * 900)}`);
      setCampVillage('');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule mobile camp');
    } finally {
      setSubmittingCamp(false);
    }
  };

  const handleUpdateCampStatus = async (campId: string, status: CampStatus) => {
    setError(null);
    try {
      await api.updateCampStatus(role, campId, status);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update camp status');
    }
  };

  const handleSpeak = (id: string, text: string, langCode: TribalLanguageCode) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError('Audio read-aloud is not supported in this browser.');
      return;
    }
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMeta = TRIBAL_LANGUAGES.find((l) => l.code === langCode);
    utterance.lang = langMeta?.speechLocale ?? 'en-IN';
    utterance.rate = 0.92;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Could not copy text to clipboard.');
    }
  };

  const buildSmsStatusSnippet = (d: FieldSampleDispatch) => {
    const statusText =
      d.status === 'REPORT_RETURNED'
        ? t('statusReturned')
        : d.status === 'RECEIVED_AT_LAB'
        ? t('statusAtLab')
        : t('statusInTransit');
    return `hVISA · ${d.sampleCode} (${d.villageName}) · ${statusText}${
      d.runId ? ` · ${t('colRunId')}: ${d.runId}` : ''
    }${d.viabilityAlert !== 'OK' ? ` · ${d.viabilityAlert === 'DELAY_WARNING' ? t('delayWarning') : t('coldChainBreach')}` : ''}`;
  };

  const handleExportFieldBundle = () => {
    downloadJsonFile(`tribal_field_bundle_${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      scope: 'ANONYMIZED_TRIBAL_FIELD_SYNC_BUNDLE',
      pendingOfflineQueue: offlineQueue,
      clusters: overview?.clusters ?? [],
      dispatches: overview?.dispatches ?? [],
      upcomingCamps: overview?.camps ?? [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Offline-First Field Sync Controls */}
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222B33] tracking-tight">
            {t('outreachTitle')}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t('outreachSubtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSimulateOffline((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded border transition-colors cursor-pointer whitespace-nowrap ${
              isEffectiveOnline
                ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
            }`}
          >
            {isEffectiveOnline ? (
              <Wifi className="w-3.5 h-3.5 text-teal-700" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-amber-700" />
            )}
            <span>
              {isEffectiveOnline ? t('onlineSimulateOffline') : t('offlineModeActive')}
            </span>
          </button>

          {offlineQueue.length > 0 && (
            <button
              type="button"
              disabled={!isEffectiveOnline || syncingQueue || !permissions.canManageFieldOutreach}
              onClick={handleSyncOfflineQueue}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-[#0B5D1E] hover:bg-[#094a17] disabled:opacity-50 text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingQueue ? 'animate-spin' : ''}`} />
              <span>
                {t('syncQueuedBtn')} ({offlineQueue.length})
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportFieldBundle}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportBundleBtn')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="no-print px-4 py-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-lg">
          {error}
        </div>
      )}

      {notice && (
        <div className="no-print px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg">
          {notice}
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('kpiClusters')}
          </div>
          <div className="mt-2 text-2xl font-mono tabular-nums font-bold text-[#222B33]">
            {loading ? '—' : overview?.totals.activeClusters ?? 0}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('kpiActiveSamples')}
          </div>
          <div className="mt-2 text-2xl font-mono tabular-nums font-bold text-[#0B5D1E]">
            {loading ? '—' : (overview?.totals.pendingSamples ?? 0) + offlineQueue.length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('kpiColdAlerts')}
          </div>
          <div className="mt-2 text-2xl font-mono tabular-nums font-bold text-amber-700">
            {loading ? '—' : overview?.totals.coldChainAlerts ?? 0}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('kpiCamps')}
          </div>
          <div className="mt-2 text-2xl font-mono tabular-nums font-bold text-teal-800">
            {loading ? '—' : overview?.totals.upcomingCamps ?? 0}
          </div>
        </div>
      </div>

      {/* Segmented Sub-Navigation */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div
          className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg gap-1"
          role="tablist"
          aria-label="Tribal Outreach Sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dispatches'}
            onClick={() => setActiveTab('dispatches')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'dispatches'
                ? 'bg-white text-[#222B33] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('tabFieldSamples')} ({overview?.dispatches.length ?? 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'clusters_camps'}
            onClick={() => setActiveTab('clusters_camps')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'clusters_camps'
                ? 'bg-white text-[#222B33] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('tabClustersCamps')} ({overview?.camps.length ?? 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'community_cards'}
            onClick={() => setActiveTab('community_cards')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'community_cards'
                ? 'bg-white text-[#222B33] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('tabCardsAudio')}
          </button>
        </div>
      </div>

      {/* TAB 1: Field Sample & Cold-Chain Tracker */}
      {activeTab === 'dispatches' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form: Log Field Sample Dispatch */}
          <section className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#222B33]">
                {t('logSampleTitle')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('logSampleSub')}</p>
            </div>

            {!permissions.canManageFieldOutreach ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                {t('roleAuditor')}
              </div>
            ) : (
              <form onSubmit={handleSubmitDispatch} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('sampleCodeLabel')}
                    </label>
                    <input
                      type="text"
                      required
                      value={sampleCode}
                      onChange={(e) => setSampleCode(e.target.value)}
                      placeholder="TRB-GAD-042"
                      className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FF9933]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('chwIdLabel')}
                    </label>
                    <input
                      type="text"
                      required
                      value={chwId}
                      onChange={(e) => setChwId(e.target.value)}
                      placeholder="ASHA-GAD-03"
                      className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FF9933]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('clusterSelectLabel')}
                  </label>
                  <select
                    value={dispatchClusterId}
                    onChange={(e) => setDispatchClusterId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9933]"
                  >
                    {(overview?.clusters ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clusterCode} · {c.name} ({c.district})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('villageLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={villageName}
                    onChange={(e) => setVillageName(e.target.value)}
                    placeholder="Laheri Hamlet"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FF9933]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('carrierLabel')}
                    </label>
                    <select
                      value={coldChainMethod}
                      onChange={(e) => setColdChainMethod(e.target.value as ColdChainMethod)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9933]"
                    >
                      <option value="ICE_BOX_2_8C">{t('iceBoxOption')}</option>
                      <option value="PORTABLE_INCUBATOR">{t('incubatorOption')}</option>
                      <option value="AMBIENT_CARRIER">{t('ambientOption')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('transitHoursLabel')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      value={transitHours}
                      onChange={(e) => setTransitHours(e.target.value)}
                      className="w-full font-mono tabular-nums border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FF9933]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('linkRunLabel')}
                  </label>
                  <select
                    value={dispatchExpId}
                    onChange={(e) => setDispatchExpId(e.target.value)}
                    className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9933]"
                  >
                    <option value="">—</option>
                    {experiments.map((exp) => (
                      <option key={exp.id} value={exp.id}>
                        {exp.runId}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-slate-700 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coldChainIntact}
                    onChange={(e) => setColdChainIntact(e.target.checked)}
                    className="rounded border-slate-300 text-[#0B5D1E] focus:ring-[#FF9933]"
                  />
                  <span>{t('coldSealCheck')}</span>
                </label>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('notesLabel')}
                  </label>
                  <textarea
                    rows={2}
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FF9933]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingDispatch}
                  className="w-full px-4 py-2 text-xs font-semibold text-white bg-[#222B33] hover:bg-slate-800 rounded disabled:opacity-50 cursor-pointer"
                >
                  {!isEffectiveOnline
                    ? t('saveQueueBtn')
                    : submittingDispatch
                    ? '...'
                    : t('saveDispatchBtn')}
                </button>
              </form>
            )}
          </section>

          {/* Right Table: Pending Offline Queue + Persisted Cold-Chain Tracker */}
          <div className="lg:col-span-8 space-y-5">
            {offlineQueue.length > 0 && (
              <section className="bg-[#FEF9EE] border border-[#E5D5B5] rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-amber-950">
                      {t('offlineQueueTitle')} ({offlineQueue.length})
                    </h3>
                    <p className="text-xs text-amber-900">{t('offlineQueueSub')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        writeOfflineQueue([]);
                        setOfflineQueue([]);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-amber-900 border border-amber-300 rounded hover:bg-amber-100 cursor-pointer"
                    >
                      {t('clearQueueBtn')}
                    </button>
                    <button
                      type="button"
                      disabled={!isEffectiveOnline || syncingQueue || !permissions.canManageFieldOutreach}
                      onClick={handleSyncOfflineQueue}
                      className="px-3 py-1 text-xs font-semibold bg-[#0B5D1E] hover:bg-[#094a17] disabled:opacity-50 text-white rounded cursor-pointer"
                    >
                      {syncingQueue ? t('syncingLabel') : t('syncNowBtn')}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto bg-white border border-amber-200 rounded">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-amber-50/70 border-b border-amber-200 text-[11px] font-semibold text-amber-950">
                        <th className="py-2 px-3">{t('sampleCodeLabel')}</th>
                        <th className="py-2 px-3">{t('villageLabel')}</th>
                        <th className="py-2 px-3">{t('chwIdLabel')}</th>
                        <th className="py-2 px-3 text-right">{t('transitHoursLabel')}</th>
                        <th className="py-2 px-3">{t('carrierLabel')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {offlineQueue.map((q) => (
                        <tr key={q.localId}>
                          <td className="py-2 px-3 font-mono font-semibold">{q.sampleCode}</td>
                          <td className="py-2 px-3">{q.villageName}</td>
                          <td className="py-2 px-3 font-mono">{q.chwId}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">
                            {q.transitHours}
                          </td>
                          <td className="py-2 px-3 font-mono">{q.coldChainMethod}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-[#222B33]">
                    {t('dispatchesTitle')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t('dispatchesSub')}</p>
                </div>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {overview?.dispatches.length ?? 0}
                </span>
              </div>

              {loading ? (
                <div className="p-6 text-xs text-slate-500">...</div>
              ) : !overview || overview.dispatches.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">—</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                        <th className="py-2.5 px-3">{t('sampleCodeLabel')} &amp; {t('villageLabel')}</th>
                        <th className="py-2.5 px-3">{t('carrierLabel')}</th>
                        <th className="py-2.5 px-3">{t('colRunId')}</th>
                        <th className="py-2.5 px-3">{t('colStatus')}</th>
                        <th className="py-2.5 px-3 text-right">{t('colActions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {overview.dispatches.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 align-top">
                            <div className="font-mono font-semibold text-[#222B33]">
                              {d.sampleCode}
                            </div>
                            <div className="text-slate-700 mt-0.5">
                              {d.villageName} · <span className="text-slate-500">{d.clusterName}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {d.chwId}
                            </div>
                          </td>
                          <td className="py-3 px-3 align-top">
                            <div className="font-mono tabular-nums text-slate-800">
                              {d.transitHours.toFixed(1)} h
                            </div>
                            <div className="mt-1">
                              {d.viabilityAlert === 'OK' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>{t('coldChainOk')}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-800 font-semibold">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                                  <span>
                                    {d.viabilityAlert === 'DELAY_WARNING'
                                      ? t('delayWarning')
                                      : t('coldChainBreach')}
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 align-top">
                            {permissions.canManageFieldOutreach ? (
                              <select
                                value={d.experimentId ?? ''}
                                onChange={(e) => handleLinkRunToDispatch(d.id, e.target.value)}
                                className="font-mono text-[11px] border border-slate-300 rounded px-2 py-1 bg-white max-w-[175px]"
                              >
                                <option value="">—</option>
                                {experiments.map((exp) => (
                                  <option key={exp.id} value={exp.id}>
                                    {exp.runId}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-mono text-slate-700">
                                {d.runId ?? '—'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 align-top">
                            <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                              <Truck className="w-3.5 h-3.5 text-[#0B5D1E] shrink-0" />
                              <span>
                                {d.status === 'IN_TRANSIT'
                                  ? t('statusInTransit')
                                  : d.status === 'RECEIVED_AT_LAB'
                                  ? t('statusAtLab')
                                  : t('statusReturned')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 align-top text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              {permissions.canManageFieldOutreach && d.status === 'IN_TRANSIT' && (
                                <button
                                  type="button"
                                  onClick={() => handleAdvanceDispatch(d, 'RECEIVED_AT_LAB')}
                                  className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded cursor-pointer whitespace-nowrap"
                                >
                                  {t('markReceivedBtn')}
                                </button>
                              )}
                              {permissions.canReturnCommunityReport &&
                                d.status === 'RECEIVED_AT_LAB' && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceDispatch(d, 'REPORT_RETURNED')}
                                    className="px-2 py-1 text-[11px] font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded cursor-pointer whitespace-nowrap"
                                  >
                                    {t('returnPhcBtn')}
                                  </button>
                                )}
                              <button
                                type="button"
                                onClick={() => handleCopyText(d.id, buildSmsStatusSnippet(d))}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded cursor-pointer whitespace-nowrap"
                              >
                                {copiedId === d.id ? (
                                  <Check className="w-3 h-3 text-emerald-700" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedId === d.id ? t('copiedSmsBtn') : t('copySmsBtn')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: Cluster Resistance Surveillance & Mobile Medical Camps */}
      {activeTab === 'clusters_camps' && (
        <div className="space-y-6">
          {/* Cluster Resistance Surveillance Table */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#222B33]">
                  {t('clusterTableTitle')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('clusterTableSub')}</p>
              </div>
              {permissions.canManageFieldOutreach && (
                <button
                  type="button"
                  onClick={() => setShowClusterForm((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#0B5D1E]" />
                  <span>{t('registerClusterBtn')}</span>
                </button>
              )}
            </div>

            {showClusterForm && permissions.canManageFieldOutreach && (
              <form
                onSubmit={handleCreateCluster}
                className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('clusterCodeLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={clusterCode}
                    onChange={(e) => setClusterCode(e.target.value)}
                    placeholder="PHC-BAS-05"
                    className="w-full font-mono bg-white border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('clusterSelectLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={clusterName}
                    onChange={(e) => setClusterName(e.target.value)}
                    placeholder="Abujhmad Mobile Clinic"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('districtLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={clusterDistrict}
                    onChange={(e) => setClusterDistrict(e.target.value)}
                    placeholder="Narayanpur"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('stateLabel')}
                  </label>
                  <input
                    type="text"
                    value={clusterState}
                    onChange={(e) => setClusterState(e.target.value)}
                    placeholder="Chhattisgarh"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('primaryLangLabel')}
                  </label>
                  <select
                    value={clusterLang}
                    onChange={(e) => setClusterLang(e.target.value as TribalLanguageCode)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    {TRIBAL_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('connectivityLabel')}
                  </label>
                  <select
                    value={clusterConn}
                    onChange={(e) => setClusterConn(e.target.value as ConnectivityProfile)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="OFFLINE_FIRST">Offline-First</option>
                    <option value="INTERMITTENT">Intermittent 2G/3G</option>
                    <option value="ONLINE">Stable Online</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('referralLabLabel')}
                  </label>
                  <input
                    type="text"
                    value={clusterLab}
                    onChange={(e) => setClusterLab(e.target.value)}
                    placeholder="District Microbiology Lab"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('ashaCountLabel')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={clusterChwCount}
                      onChange={(e) => setClusterChwCount(e.target.value)}
                      className="w-full font-mono bg-white border border-slate-300 rounded px-2.5 py-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingCluster}
                    className="px-4 py-1.5 text-xs font-semibold bg-[#222B33] hover:bg-slate-800 text-white rounded cursor-pointer whitespace-nowrap"
                  >
                    {submittingCluster ? t('savingLabel') : t('saveClusterBtn')}
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                    <th className="py-2.5 px-4">{t('colClusterDistrict')}</th>
                    <th className="py-2.5 px-4">{t('colLangSync')}</th>
                    <th className="py-2.5 px-4 text-right">{t('colFieldSamples')}</th>
                    <th className="py-2.5 px-4 text-right">{t('colLinkedRuns')}</th>
                    <th className="py-2.5 px-4 text-right">{t('colHvisaRange')}</th>
                    <th className="py-2.5 px-4 text-right">{t('colExpertReview')}</th>
                    <th className="py-2.5 px-4 text-right">{t('colColdAlerts')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(overview?.clusterStats ?? []).map((cs) => {
                    const clusterMeta = overview?.clusters.find((c) => c.id === cs.clusterId);
                    const langInfo = TRIBAL_LANGUAGES.find((l) => l.code === cs.primaryLanguage);
                    return (
                      <tr key={cs.clusterId} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#222B33]">
                            {cs.clusterName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {cs.clusterCode} · {cs.district}
                            {clusterMeta ? `, ${clusterMeta.stateName}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800">{langInfo?.label ?? cs.primaryLanguage}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {clusterMeta?.connectivityProfile} · {clusterMeta?.activeChwCount ?? 0} ASHAs
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                          {cs.linkedDispatchesCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {cs.linkedRunsCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-800 font-semibold">
                          {cs.hvisaCompatibleCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-800 font-semibold">
                          {cs.expertReviewCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <span
                            className={
                              cs.coldChainAlertCount > 0
                                ? 'text-rose-700 font-semibold'
                                : 'text-slate-500'
                            }
                          >
                            {cs.coldChainAlertCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mobile Clinic Camps Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-[#0B5D1E]" />
                <h2 className="text-base font-semibold text-[#222B33]">
                  {t('scheduleCampTitle')}
                </h2>
              </div>
              {!permissions.canManageFieldOutreach ? (
                <p className="text-xs text-slate-600">{t('switchRoleNote')}</p>
              ) : (
                <form onSubmit={handleCreateCamp} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t('campCodeLabel')}
                      </label>
                      <input
                        type="text"
                        required
                        value={campCode}
                        onChange={(e) => setCampCode(e.target.value)}
                        className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t('campDateLabel')}
                      </label>
                      <input
                        type="date"
                        required
                        value={campDate}
                        onChange={(e) => setCampDate(e.target.value)}
                        className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('campClusterLabel')}
                    </label>
                    <select
                      value={campClusterId}
                      onChange={(e) => setCampClusterId(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    >
                      {(overview?.clusters ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.district})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('campVillageLabel')}
                    </label>
                    <input
                      type="text"
                      required
                      value={campVillage}
                      onChange={(e) => setCampVillage(e.target.value)}
                      placeholder="e.g. Kuwakodi & Laheri"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t('campChwLabel')}
                      </label>
                      <input
                        type="text"
                        required
                        value={campChwId}
                        onChange={(e) => setCampChwId(e.target.value)}
                        className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t('campHouseholdsLabel')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={campHouseholds}
                        onChange={(e) => setCampHouseholds(e.target.value)}
                        className="w-full font-mono tabular-nums border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('campServicesLabel')}
                    </label>
                    <textarea
                      rows={2}
                      value={campServices}
                      onChange={(e) => setCampServices(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingCamp}
                    className="w-full px-4 py-2 text-xs font-semibold bg-[#222B33] hover:bg-slate-800 text-white rounded disabled:opacity-50 cursor-pointer"
                  >
                    {submittingCamp ? t('savingLabel') : t('scheduleCampBtn')}
                  </button>
                </form>
              )}
            </section>

            <section className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#222B33]">
                    {t('campsTableTitle')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t('campsTableSub')}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                      <th className="py-2.5 px-4">{t('colCampDate')}</th>
                      <th className="py-2.5 px-4">{t('colClusterHamlets')}</th>
                      <th className="py-2.5 px-4">{t('colServices')}</th>
                      <th className="py-2.5 px-4 text-right">{t('colHouseholds')}</th>
                      <th className="py-2.5 px-4 text-right">{t('colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(overview?.camps ?? []).map((camp) => (
                      <tr key={camp.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 align-top">
                          <div className="font-mono font-semibold text-[#222B33]">
                            {camp.campCode}
                          </div>
                          <div className="font-mono text-slate-600 mt-0.5">{camp.campDate}</div>
                        </td>
                        <td className="py-3 px-4 align-top">
                          <div className="font-medium text-slate-900">{camp.villageName}</div>
                          <div className="text-[11px] text-slate-500">
                            {camp.clusterName} · {camp.leadChwId}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top text-slate-700 max-w-xs">
                          {camp.servicesSummary}
                        </td>
                        <td className="py-3 px-4 align-top text-right font-mono tabular-nums">
                          {camp.expectedHouseholds}
                        </td>
                        <td className="py-3 px-4 align-top text-right">
                          {permissions.canManageFieldOutreach ? (
                            <select
                              value={camp.status}
                              onChange={(e) =>
                                handleUpdateCampStatus(camp.id, e.target.value as CampStatus)
                              }
                              className="text-xs font-medium border border-slate-300 rounded px-2 py-1 bg-white"
                            >
                              <option value="SCHEDULED">{t('campScheduled')}</option>
                              <option value="ACTIVE">{t('campActive')}</option>
                              <option value="COMPLETED">{t('campCompleted')}</option>
                            </select>
                          ) : (
                            <span className="font-mono text-slate-700">{camp.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 3: Local-Language Community Health Cards & Audio Guide */}
      {activeTab === 'community_cards' && (
        <div className="space-y-6">
          {/* Language & Print Controls */}
          <section className="no-print bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#222B33]">
                {t('selectLangTitle')}
              </h2>
              <p className="text-xs text-slate-500">{t('selectLangSub')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg">
                {TRIBAL_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedLanguage === lang.code
                        ? 'bg-[#222B33] text-white'
                        : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    {lang.nativeLabel}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#222B33] hover:bg-slate-800 text-white rounded cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('printCardsBtn')}</span>
              </button>
            </div>
          </section>

          {/* Run-Specific Community / ASHA Summary Generator */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#222B33]">
                  {t('runSummaryTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{t('runSummarySub')}</p>
              </div>
              <div className="no-print flex flex-wrap items-center gap-2">
                <select
                  value={selectedExperimentId ?? ''}
                  onChange={(e) => {
                    if (e.target.value) onSelectExperiment(e.target.value);
                  }}
                  className="font-mono text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                >
                  {experiments.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.runId}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={loadingSummary}
                  onClick={handleGenerateCommunitySummary}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#0B5D1E] hover:bg-[#094a17] disabled:opacity-50 text-white rounded cursor-pointer whitespace-nowrap"
                >
                  {loadingSummary ? '...' : t('refreshSummaryBtn')}
                </button>
              </div>
            </div>

            <div className="bg-[#FAF8F3] border border-slate-200 rounded p-4 space-y-3">
              <p className="text-sm text-slate-900 leading-relaxed">
                {loadingSummary ? '...' : communitySummary || '—'}
              </p>
              {communitySummary && (
                <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200">
                  <span className="text-[11px] font-mono text-slate-500">
                    {summarySource}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSpeak('run-summary', communitySummary, selectedLanguage)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded cursor-pointer"
                    >
                      {speakingId === 'run-summary' ? (
                        <VolumeX className="w-3.5 h-3.5 text-rose-700" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-[#0B5D1E]" />
                      )}
                      <span>
                        {speakingId === 'run-summary' ? t('stopAudioBtn') : t('listenAudioBtn')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText('run-summary', communitySummary)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded cursor-pointer"
                    >
                      {copiedId === 'run-summary' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === 'run-summary' ? t('copiedSmsBtn') : t('copyTextBtn')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 3 Visual & Audio Health Awareness Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COMMUNITY_HEALTH_CARDS.map((card) => {
              const content = card.translations[selectedLanguage] ?? card.translations.en;
              const isSpeaking = speakingId === card.id;
              return (
                <article
                  key={card.id}
                  className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4 print-only-break"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="p-2 bg-[#FAF8F3] border border-slate-200 rounded-md text-[#222B33]">
                        {card.iconType === 'shield' ? (
                          <ShieldCheck className="w-5 h-5 text-teal-800" />
                        ) : card.iconType === 'droplets' ? (
                          <Droplets className="w-5 h-5 text-[#0B5D1E]" />
                        ) : (
                          <ThermometerSnowflake className="w-5 h-5 text-sky-800" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleSpeak(card.id, content.spokenScript, selectedLanguage)
                        }
                        className="no-print inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded cursor-pointer"
                      >
                        {isSpeaking ? (
                          <VolumeX className="w-3.5 h-3.5 text-rose-700" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-[#0B5D1E]" />
                        )}
                        <span>{isSpeaking ? t('stopAudioBtn') : t('listenAudioBtn')}</span>
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-[#222B33] leading-snug">
                      {content.title}
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed">{content.summary}</p>

                    <ol className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-800 list-decimal list-inside">
                      {content.actionSteps.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{t('communityAidLabel')}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          card.id,
                          `${content.title}\n${content.summary}\n- ${content.actionSteps.join('\n- ')}`
                        )
                      }
                      className="no-print text-[#0B5D1E] hover:underline font-medium cursor-pointer"
                    >
                      {copiedId === card.id ? t('copiedSmsBtn') : t('copyCardBtn')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

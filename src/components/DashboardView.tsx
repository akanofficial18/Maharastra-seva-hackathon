import { useEffect, useState } from 'react';
import {
  FilePlus2,
  FlaskConical,
  GitCompare,
  Play,
  ShieldAlert,
} from 'lucide-react';
import { useI18n } from '../lib/i18n.tsx';
import { DEMO_ROLES, getRolePermissions } from '../lib/permissions.ts';
import { PORTAL_CONTENT } from '../lib/portalContent.ts';
import type {
  AuthUser,
  DashboardSummary,
  ProtocolProfile,
  ReferenceStrain,
  UserRole,
} from '../types/hvisa.ts';
import type { AppScreen } from './TopHeader.tsx';
import { ExperimentStatusLabel } from './StatusIndicator.tsx';

interface DashboardViewProps {
  currentUser: AuthUser;
  summary: DashboardSummary | null;
  loading: boolean;
  role: UserRole;
  protocols: ProtocolProfile[];
  referenceStrains: ReferenceStrain[];
  onSelectExperiment: (id: string, targetScreen?: AppScreen) => void;
  onNavigate: (screen: AppScreen) => void;
  onCreateExperiment: (input: {
    runId: string;
    experimentDate: string;
    protocolProfileId: string;
    referenceStrainId: string;
    analystId: string;
    notes: string;
    isSyntheticDemo: boolean;
  }) => Promise<void>;
  onLoadSampleDemo: () => Promise<void>;
  onOpenComparative: () => void;
  showNewModal: boolean;
  setShowNewModal: (open: boolean) => void;
}

export function DashboardView({
  currentUser,
  summary,
  loading,
  role,
  protocols,
  referenceStrains,
  onSelectExperiment,
  onNavigate,
  onCreateExperiment,
  onLoadSampleDemo,
  onOpenComparative,
  showNewModal,
  setShowNewModal,
}: DashboardViewProps) {
  const permissions = getRolePermissions(role);
  const roleInfo = DEMO_ROLES[role];
  const { lang, t, translateRoleShort } = useI18n();
  const content = PORTAL_CONTENT[lang] ?? PORTAL_CONTENT.en;
  const d = content.dashboard;

  const [runId, setRunId] = useState(`DEMO-RUN-${Math.floor(100 + Math.random() * 900)}`);
  const [experimentDate, setExperimentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [protocolProfileId, setProtocolProfileId] = useState(
    protocols[0]?.id ?? 'proto-icmr-2019'
  );
  const [referenceStrainId, setReferenceStrainId] = useState(
    referenceStrains[0]?.id ?? 'ref-mu3-atcc700698'
  );
  const [analystId, setAnalystId] = useState(roleInfo.demoActorId);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (protocols.length > 0 && !protocols.some((p) => p.id === protocolProfileId)) {
      setProtocolProfileId(protocols[0].id);
    }
  }, [protocols, protocolProfileId]);

  useEffect(() => {
    if (referenceStrains.length > 0 && !referenceStrains.some((r) => r.id === referenceStrainId)) {
      setReferenceStrainId(referenceStrains[0].id);
    }
  }, [referenceStrains, referenceStrainId]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!runId.trim()) {
      setFormError('Run ID is required.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreateExperiment({
        runId: runId.trim(),
        experimentDate,
        protocolProfileId: protocolProfileId || protocols[0]?.id || 'proto-icmr-2019',
        referenceStrainId:
          referenceStrainId || referenceStrains[0]?.id || 'ref-mu3-atcc700698',
        analystId: analystId.trim() || roleInfo.demoActorId,
        notes: notes.trim(),
        isSyntheticDemo: true,
      });
      setShowNewModal(false);
      setRunId(`DEMO-RUN-${Math.floor(100 + Math.random() * 900)}`);
      setNotes('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create experiment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSample = async () => {
    setLoadingSample(true);
    try {
      await onLoadSampleDemo();
    } finally {
      setLoadingSample(false);
    }
  };

  const formattedLastLogin = currentUser.lastLoginAt
    ? new Date(currentUser.lastLoginAt).toLocaleString(
        lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN',
        { dateStyle: 'medium', timeStyle: 'short' }
      )
    : d.firstLoginLabel;

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar + Synthetic Demo Warning Tag */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222B33] tracking-tight">
            {d.welcomePrefix} {currentUser.displayName}
          </h1>
          <p className="text-sm text-[#222B33]/75 mt-1">
            {d.roleLabel} <span className="font-semibold text-[#222B33]">{translateRoleShort(role)}</span>
            {' · '}
            {d.lastLoginLabel} <span className="font-mono text-xs">{formattedLastLogin}</span>
          </p>
        </div>

        <div className="border border-[#FF9933] bg-[#FFF9ED] text-[#B26A00] text-xs font-bold px-3.5 py-2 rounded-[4px]">
          {d.demoTag}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE1E6] rounded-[4px] p-4 gov-card">
          <div className="text-3xl font-mono tabular-nums font-bold text-[#0B5D1E]">
            {loading ? '—' : summary?.totalExperiments ?? 0}
          </div>
          <div className="mt-1.5 text-sm font-medium text-[#1F2933]/80">{d.kpiTotal}</div>
        </div>

        <div className="bg-white border border-[#DCE1E6] rounded-[4px] p-4 gov-card">
          <div className="text-3xl font-mono tabular-nums font-bold text-[#B26A00]">
            {loading ? '—' : summary?.pendingReviewCount ?? 0}
          </div>
          <div className="mt-1.5 text-sm font-medium text-[#1F2933]/80">{d.kpiAwaiting}</div>
        </div>

        <div className="bg-white border border-[#DCE1E6] rounded-[4px] p-4 gov-card">
          <div className="text-3xl font-mono tabular-nums font-bold text-[#B3261E]">
            {loading ? '—' : summary?.blockingQaExperimentsCount ?? 0}
          </div>
          <div className="mt-1.5 text-sm font-medium text-[#1F2933]/80">{d.kpiBlocking}</div>
        </div>

        <div className="bg-white border border-[#DCE1E6] rounded-[4px] p-4 gov-card">
          <div className="text-3xl font-mono tabular-nums font-bold text-[#0B5D1E]">
            {loading ? '—' : summary?.reviewedCount ?? 0}
          </div>
          <div className="mt-1.5 text-sm font-medium text-[#1F2933]/80">{d.kpiReviewed}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section className="lg:col-span-8 bg-white border border-[#DCE1E6] rounded-[4px] overflow-hidden gov-card">
          <div className="px-5 py-3.5 border-b border-[#E6E2D8]">
            <h2 className="text-lg font-bold text-[#222B33]">{d.recentHeading}</h2>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-[#222B33]/75">Loading...</div>
          ) : !summary || summary.recentExperiments.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-[#222B33]/75">—</p>
              {permissions.canCreateExperiment && (
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-4 py-2 text-sm font-bold bg-[#0B5D1E] text-white rounded-[4px] hover:bg-[#094a17] cursor-pointer"
                >
                  {d.btnLoadDemo}
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F3] border-b border-[#E6E2D8] text-xs font-bold text-[#222B33]">
                    <th className="py-2.5 px-4">{d.colRunId}</th>
                    <th className="py-2.5 px-4">{d.colDate}</th>
                    <th className="py-2.5 px-4">{d.colProtocol}</th>
                    <th className="py-2.5 px-4">{d.colStatus}</th>
                    <th className="py-2.5 px-4 text-right">{d.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2D8] text-sm">
                  {summary.recentExperiments.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#FAF8F3]/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#222B33]">
                        {exp.runId}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-[#222B33]/85 whitespace-nowrap">
                        {exp.experimentDate}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#222B33]">
                        <div className="font-medium">{exp.protocolName}</div>
                        <div className="font-mono text-[11px] text-[#222B33]/65">
                          v{exp.protocolVersion} · {exp.testIsolateCount} iso
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <ExperimentStatusLabel status={exp.status} />
                          {exp.blockingFlagCount > 0 && (
                            <div className="text-[11px] font-mono font-bold text-[#B3261E]">
                              ✖ {exp.blockingFlagCount} {t('blockingLabel')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectExperiment(exp.id, 'experiments')}
                            className="px-2.5 py-1 text-xs font-bold text-[#0B5D1E] border border-[#0B5D1E] bg-white hover:bg-[#FAF8F3] rounded-[4px] cursor-pointer whitespace-nowrap"
                          >
                            {d.openRunBtn}
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectExperiment(exp.id, 'analysis')}
                            className="px-2.5 py-1 text-xs font-semibold text-[#222B33] border border-[#E6E2D8] bg-white hover:bg-[#FAF8F3] rounded-[4px] cursor-pointer whitespace-nowrap"
                          >
                            {t('navAnalysis')}
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectExperiment(exp.id, 'reports')}
                            className="px-2.5 py-1 text-xs font-semibold text-[#222B33] border border-[#E6E2D8] bg-white hover:bg-[#FAF8F3] rounded-[4px] cursor-pointer whitespace-nowrap"
                          >
                            {t('navReports')}
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

        {/* Right Quick Actions Panel */}
        <aside className="lg:col-span-4 bg-white border border-[#E6E2D8] rounded-[4px] p-5 space-y-3 gov-card">
          <h2 className="text-lg font-bold text-[#222B33]">{d.quickActionsHeading}</h2>

          <div className="space-y-2.5">
            {permissions.canCreateExperiment && (
              <>
                <button
                  type="button"
                  onClick={() => setShowNewModal(true)}
                  className="w-full py-2.5 px-4 text-sm font-bold bg-[#0B5D1E] hover:bg-[#094a17] text-white rounded-[4px] inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>{d.btnNewExperiment}</span>
                </button>

                <button
                  type="button"
                  disabled={loadingSample}
                  onClick={handleLoadSample}
                  className="w-full py-2.5 px-4 text-sm font-bold border border-[#0B5D1E] text-[#0B5D1E] bg-white hover:bg-[#FAF8F3] disabled:opacity-50 rounded-[4px] inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>{loadingSample ? '...' : d.btnLoadDemo}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onNavigate('analysis')}
              className="w-full py-2.5 px-4 text-sm font-bold border border-[#0B5D1E] text-[#0B5D1E] bg-white hover:bg-[#FAF8F3] rounded-[4px] inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <FlaskConical className="w-4 h-4" />
              <span>{d.btnOpenAnalysis}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('qa')}
              className="w-full py-2.5 px-4 text-sm font-bold border border-[#0B5D1E] text-[#0B5D1E] bg-white hover:bg-[#FAF8F3] rounded-[4px] inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{d.btnViewQa}</span>
            </button>

            <button
              type="button"
              onClick={onOpenComparative}
              className="w-full py-2.5 px-4 text-sm font-semibold border border-[#222B33]/40 text-[#222B33] bg-white hover:bg-[#FAF8F3] rounded-[4px] inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <GitCompare className="w-4 h-4" />
              <span>{d.btnCompareRuns}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Create Experiment Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-exp-title"
        >
          <div className="bg-white border border-[#1F2933] rounded-[6px] w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-[#1F2933] text-white border-b border-white/15 flex items-center justify-between">
              <h2 id="create-exp-title" className="text-base font-bold">
                {t('modalNewRunTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-xs text-white/80 hover:text-white cursor-pointer"
              >
                {t('modalClose')}
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-sm">
              {formError && (
                <div className="p-3 bg-[#FDF2F2] border border-[#B3261E] text-[#B3261E] text-xs rounded-[4px]">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#222B33] mb-1">
                    {t('colRunId')}
                  </label>
                  <input
                    type="text"
                    required
                    value={runId}
                    onChange={(e) => setRunId(e.target.value)}
                    placeholder="e.g. DEMO-RUN-004"
                    className="w-full font-mono text-xs border border-[#222B33]/40 rounded-[4px] px-3 py-2 focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#222B33] mb-1">
                    {t('colDate')}
                  </label>
                  <input
                    type="date"
                    required
                    value={experimentDate}
                    onChange={(e) => setExperimentDate(e.target.value)}
                    className="w-full font-mono text-xs border border-[#222B33]/40 rounded-[4px] px-3 py-2 focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222B33] mb-1">
                  {t('colMethod')}
                </label>
                <select
                  value={protocolProfileId}
                  onChange={(e) => setProtocolProfileId(e.target.value)}
                  className="w-full text-xs border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white focus:outline-2 focus:outline-[#FF9933]"
                >
                  {protocols.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (v{p.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#222B33] mb-1">
                    {t('reportRefStrain')}
                  </label>
                  <select
                    value={referenceStrainId}
                    onChange={(e) => setReferenceStrainId(e.target.value)}
                    className="w-full text-xs border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white focus:outline-2 focus:outline-[#FF9933]"
                  >
                    {referenceStrains.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.strainCode} / {r.atccNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#222B33] mb-1">
                    {t('chwIdLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={analystId}
                    onChange={(e) => setAnalystId(e.target.value)}
                    placeholder="LAB-TECH-A"
                    className="w-full font-mono text-xs border border-[#222B33]/40 rounded-[4px] px-3 py-2 focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222B33] mb-1">
                  {t('notesLabel')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs border border-[#222B33]/40 rounded-[4px] px-3 py-2 focus:outline-2 focus:outline-[#FF9933]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#222B33] border border-[#E6E2D8] rounded-[4px] hover:bg-[#FAF8F3] cursor-pointer"
                >
                  {t('modalCancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0B5D1E] hover:bg-[#094a17] rounded-[4px] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? '...' : t('modalCreateBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

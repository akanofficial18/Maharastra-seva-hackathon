import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Lock,
  Plus,
  Save,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useI18n } from '../lib/i18n.tsx';
import { computeObservationMetrics, parseObservationsCsv } from '../lib/papAucEngine.ts';
import { getRolePermissions } from '../lib/permissions.ts';
import type {
  ExperimentDetail,
  ProtocolProfile,
  ReferenceStrain,
  StrainRole,
  UserRole,
} from '../types/hvisa.ts';
import type { LabNavigateTarget } from './LabWorkbenchView.tsx';
import { ExperimentStatusLabel, QaSeverityLabel } from './StatusIndicator.tsx';

interface EditableRow {
  localKey: string;
  id?: string;
  strainId: string;
  strainRole: StrainRole;
  vancomycinConcentrationMgL: string;
  replicateId: string;
  dilutionFraction: string;
  platedVolumeMl: string;
  colonyCount: string;
  dataOrigin: string;
}

interface ExperimentWorkspaceViewProps {
  detail: ExperimentDetail | null;
  loading: boolean;
  role: UserRole;
  protocols: ProtocolProfile[];
  referenceStrains: ReferenceStrain[];
  highlightObservationId: string | null;
  onDetailUpdated: (next: ExperimentDetail) => void;
  onNavigate: (screen: LabNavigateTarget) => void;
  onOpenProtocolSettings: () => void;
}

export function ExperimentWorkspaceView({
  detail,
  loading,
  role,
  protocols,
  referenceStrains,
  highlightObservationId,
  onDetailUpdated,
  onNavigate,
  onOpenProtocolSettings,
}: ExperimentWorkspaceViewProps) {
  const { t } = useI18n();
  const permissions = getRolePermissions(role);

  const [rows, setRows] = useState<EditableRow[]>([]);
  const [dirtyRows, setDirtyRows] = useState(false);

  const [metaRunId, setMetaRunId] = useState('');
  const [metaDate, setMetaDate] = useState('');
  const [metaProtocolId, setMetaProtocolId] = useState('');
  const [metaRefId, setMetaRefId] = useState('');
  const [metaAnalystId, setMetaAnalystId] = useState('');
  const [metaNotes, setMetaNotes] = useState('');
  const [metaOpen, setMetaOpen] = useState(false);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'error' | 'success' | 'warning'; text: string } | null>(
    null
  );

  // CSV Import Modal State
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvImportMode, setCsvImportMode] = useState<'replace' | 'append'>('replace');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // Quick Strain Series Builder State
  const [seriesBuilderOpen, setSeriesBuilderOpen] = useState(false);
  const [seriesStrainId, setSeriesStrainId] = useState('DEMO-ISO-03');
  const [seriesRole, setSeriesRole] = useState<StrainRole>('TEST');
  const [seriesReplicates, setSeriesReplicates] = useState('1');
  const [seriesDilution, setSeriesDilution] = useState('0.001');
  const [seriesVolume, setSeriesVolume] = useState('0.1');

  useEffect(() => {
    if (!detail) return;
    setRows(
      detail.observations.map((o, idx) => ({
        localKey: o.id || `row-${idx}`,
        id: o.id,
        strainId: o.strainId,
        strainRole: o.strainRole,
        vancomycinConcentrationMgL: String(o.vancomycinConcentrationMgL),
        replicateId: o.replicateId,
        dilutionFraction: String(o.dilutionFraction),
        platedVolumeMl: String(o.platedVolumeMl),
        colonyCount: String(o.colonyCount),
        dataOrigin: o.dataOrigin,
      }))
    );
    setDirtyRows(false);
    setMetaRunId(detail.experiment.runId);
    setMetaDate(detail.experiment.experimentDate);
    setMetaProtocolId(detail.experiment.protocolProfileId);
    setMetaRefId(detail.experiment.referenceStrainId);
    setMetaAnalystId(detail.experiment.analystId);
    setMetaNotes(detail.experiment.notes);
    setSeriesReplicates(String(detail.protocol.expectedReplicates || 1));
    setSeriesDilution(String(detail.protocol.defaultDilutionFraction || 0.001));
    setSeriesVolume(String(detail.protocol.defaultPlatedVolumeMl || 0.1));
  }, [detail]);

  // Scroll to highlighted row when navigating from QA Review
  useEffect(() => {
    if (!highlightObservationId) return;
    const el = document.getElementById(`obs-row-${highlightObservationId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightObservationId, rows]);

  const testIsolateCount = useMemo(() => {
    const set = new Set(
      rows
        .filter((r) => r.strainRole === 'TEST' && r.strainId.trim() !== '')
        .map((r) => r.strainId.trim())
    );
    return set.size;
  }, [rows]);

  if (loading || !detail) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-600">
        {loading ? 'Loading experiment workspace...' : 'Select an experiment from the Dashboard or top bar.'}
      </div>
    );
  }

  const { experiment, protocol, referenceStrain, qaFlags } = detail;
  const blockingFlags = qaFlags.filter((f) => f.severity === 'BLOCKING');
  const warningFlags = qaFlags.filter((f) => f.severity === 'WARNING');

  const updateRowField = (
    localKey: string,
    field: keyof EditableRow,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.localKey === localKey ? { ...r, [field]: value } : r))
    );
    setDirtyRows(true);
    setBanner(null);
  };

  const handleAddRow = () => {
    const newKey = `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setRows((prev) => [
      ...prev,
      {
        localKey: newKey,
        strainId: 'DEMO-ISO-NEW',
        strainRole: 'TEST',
        vancomycinConcentrationMgL: String(protocol.concentrationGrid[0] ?? 0.5),
        replicateId: 'R1',
        dilutionFraction: String(protocol.defaultDilutionFraction || 0.001),
        platedVolumeMl: String(protocol.defaultPlatedVolumeMl || 0.1),
        colonyCount: '0',
        dataOrigin: 'SYNTHETIC_DEMO_MANUAL_ENTRY',
      },
    ]);
    setDirtyRows(true);
  };

  const handleGenerateStrainSeries = () => {
    const cleanStrain = seriesStrainId.trim();
    if (!cleanStrain) return;
    const repCount = Math.max(1, Math.min(6, Number(seriesReplicates) || 1));
    const grid =
      protocol.concentrationGrid.length > 0
        ? protocol.concentrationGrid
        : [0.5, 1.0, 2.0, 2.5, 4.0];

    const generated: EditableRow[] = [];
    for (let repIdx = 1; repIdx <= repCount; repIdx++) {
      for (const conc of grid) {
        generated.push({
          localKey: `series-${Date.now()}-${repIdx}-${conc}-${Math.random().toString(36).slice(2, 5)}`,
          strainId: cleanStrain,
          strainRole: seriesRole,
          vancomycinConcentrationMgL: String(conc),
          replicateId: `R${repIdx}`,
          dilutionFraction: seriesDilution,
          platedVolumeMl: seriesVolume,
          colonyCount: '0',
          dataOrigin: 'SYNTHETIC_DEMO_MANUAL_ENTRY',
        });
      }
    }

    setRows((prev) => [...prev, ...generated]);
    setDirtyRows(true);
    setSeriesBuilderOpen(false);
    setBanner({
      type: 'warning',
      text: `Added ${generated.length} template row(s) for ${cleanStrain} across [${grid.join(', ')}] mg/L. Enter colony counts and click "Save Observations".`,
    });
  };

  const handleDeleteRow = (localKey: string) => {
    setRows((prev) => prev.filter((r) => r.localKey !== localKey));
    setDirtyRows(true);
  };

  const serializeDraftRows = () =>
    rows.map((r) => ({
      id: r.id,
      strainId: r.strainId.trim(),
      strainRole: r.strainRole,
      vancomycinConcentrationMgL: Number(r.vancomycinConcentrationMgL),
      replicateId: r.replicateId.trim() || 'R1',
      dilutionFraction: Number(r.dilutionFraction),
      platedVolumeMl: Number(r.platedVolumeMl),
      colonyCount: Number(r.colonyCount),
      dataOrigin: r.dataOrigin || 'SYNTHETIC_DEMO_MANUAL_ENTRY',
    }));

  const handleSaveObservations = async (): Promise<ExperimentDetail | null> => {
    setBusyAction('save');
    setBanner(null);
    try {
      const updated = await api.saveObservations(
        role,
        experiment.id,
        serializeDraftRows()
      );
      onDetailUpdated(updated);
      setDirtyRows(false);
      setBanner({
        type: updated.experiment.status === 'CALCULATION_INVALIDATED' ? 'warning' : 'success',
        text:
          updated.experiment.status === 'CALCULATION_INVALIDATED'
            ? 'Raw observations saved. Prior PAP-AUC calculation was invalidated; run "Calculate PAP-AUC" to update.'
            : 'Raw observations saved and QA rules evaluated.',
      });
      return updated;
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save observations',
      });
      return null;
    } finally {
      setBusyAction(null);
    }
  };

  const handleValidateInputs = async () => {
    setBusyAction('validate');
    setBanner(null);
    try {
      if (dirtyRows && permissions.canEditObservations) {
        await api.saveObservations(role, experiment.id, serializeDraftRows());
        setDirtyRows(false);
      }
      const updated = await api.validateExperiment(role, experiment.id);
      onDetailUpdated(updated);
      const bCount = updated.qaFlags.filter((f) => f.severity === 'BLOCKING').length;
      const wCount = updated.qaFlags.filter((f) => f.severity === 'WARNING').length;
      setBanner({
        type: bCount > 0 ? 'error' : wCount > 0 ? 'warning' : 'success',
        text:
          bCount > 0
            ? `Validation found ${bCount} blocking error(s) and ${wCount} warning(s). Resolve blocking items before calculating.`
            : `Validation complete: 0 blocking errors, ${wCount} warning(s). Ready for PAP-AUC calculation.`,
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Validation failed',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCalculate = async () => {
    setBusyAction('calculate');
    setBanner(null);
    try {
      if (dirtyRows && permissions.canEditObservations) {
        await api.saveObservations(role, experiment.id, serializeDraftRows());
        setDirtyRows(false);
      }
      const result = await api.calculateExperiment(role, experiment.id);
      onDetailUpdated(result.detail);
      setBanner({
        type: 'success',
        text: 'Trapezoidal PAP-AUC calculation completed and versioned. Opening analysis or inspect below.',
      });
      onNavigate('analysis');
    } catch (err) {
      const e = err as Error & { data?: { detail?: ExperimentDetail } };
      if (e.data?.detail) {
        onDetailUpdated(e.data.detail);
      }
      setBanner({
        type: 'error',
        text: e.message || 'PAP-AUC calculation was blocked due to QA errors.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction('meta');
    setBanner(null);
    try {
      const updated = await api.updateExperimentMetadata(role, experiment.id, {
        runId: metaRunId,
        experimentDate: metaDate,
        protocolProfileId: metaProtocolId,
        referenceStrainId: metaRefId,
        analystId: metaAnalystId,
        notes: metaNotes,
      });
      onDetailUpdated(updated);
      setMetaOpen(false);
      setBanner({
        type: updated.experiment.status === 'CALCULATION_INVALIDATED' ? 'warning' : 'success',
        text:
          updated.experiment.status === 'CALCULATION_INVALIDATED'
            ? 'Metadata/protocol updated. Prior calculation invalidated; click "Calculate PAP-AUC" to recompute.'
            : 'Experiment metadata saved.',
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update metadata',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleFillSampleCsv = async () => {
    try {
      const res = await api.getSampleCsv(role);
      setCsvText(res.csv);
      setCsvErrors([]);
    } catch {
      setCsvErrors(['Could not retrieve sample_data.csv from server.']);
    }
  };

  const handleDownloadSampleCsv = async () => {
    try {
      const res = await api.getSampleCsv(role);
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setCsvErrors(['Could not download sample_data.csv from server.']);
    }
  };

  const handleImportCsvApply = async () => {
    const parsed = parseObservationsCsv(csvText);
    if (parsed.errors.length > 0 || parsed.rows.length === 0) {
      setCsvErrors(
        parsed.errors.length > 0 ? parsed.errors : ['No valid observation rows parsed.']
      );
      return;
    }

    const mappedRows: EditableRow[] = parsed.rows.map((r, idx) => ({
      localKey: `csv-${Date.now()}-${idx}`,
      strainId: r.strainId,
      strainRole: r.strainRole,
      vancomycinConcentrationMgL: String(r.vancomycinConcentrationMgL),
      replicateId: r.replicateId,
      dilutionFraction: String(r.dilutionFraction),
      platedVolumeMl: String(r.platedVolumeMl),
      colonyCount: String(r.colonyCount),
      dataOrigin: r.dataOrigin,
    }));

    const combinedEditable =
      csvImportMode === 'append' ? [...rows, ...mappedRows] : mappedRows;
    const combinedPayload = combinedEditable.map((r) => ({
      id: r.id,
      strainId: r.strainId.trim(),
      strainRole: r.strainRole,
      vancomycinConcentrationMgL: Number(r.vancomycinConcentrationMgL),
      replicateId: r.replicateId.trim() || 'R1',
      dilutionFraction: Number(r.dilutionFraction),
      platedVolumeMl: Number(r.platedVolumeMl),
      colonyCount: Number(r.colonyCount),
      dataOrigin: r.dataOrigin || 'IMPORTED_SYNTHETIC_DEMO',
    }));

    setRows(combinedEditable);
    setCsvModalOpen(false);
    setCsvErrors([]);

    // Persist immediately to SQLite
    setBusyAction('save');
    try {
      const updated = await api.saveObservations(
        role,
        experiment.id,
        combinedPayload
      );
      onDetailUpdated(updated);
      setDirtyRows(false);
      setBanner({
        type: 'success',
        text: `${csvImportMode === 'append' ? 'Appended' : 'Imported'} ${parsed.rows.length} CSV rows and persisted raw observations.`,
      });
    } catch (err) {
      setDirtyRows(true);
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'CSV import save failed',
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header matching wireframe Left Screen */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#222B33] tracking-tight">
            {t('expWorkspaceTitle')}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span>
              {t('colRunId')}: <strong className="font-mono text-slate-900">{experiment.runId}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {t('reportProtocol')}: <strong className="text-slate-900">{protocol.name}</strong> (v{protocol.version})
            </span>
            <span aria-hidden="true">·</span>
            <span>{t('colDate')}: <span className="font-mono">{experiment.experimentDate}</span></span>
            {experiment.isSyntheticDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-amber-800">{t('demoBadge')}</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMetaOpen((v) => !v)}
          className="px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded cursor-pointer"
        >
          {metaOpen ? t('hideMetaBtn') : t('editMetaBtn')}
        </button>
      </div>

      {/* 3 Compact Summary Cards matching wireframe */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t('cardTestIsolates')}
          </div>
          <div className="mt-2 text-xl font-mono tabular-nums font-bold text-[#222B33]">
            {testIsolateCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {rows.length} {t('cardObsRows')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t('cardRefControl')}
          </div>
          <div className="mt-2 text-base font-semibold text-[#222B33]">
            {referenceStrain.strainCode} / {referenceStrain.atccNumber}
          </div>
          <div className="mt-1 text-xs text-slate-500">{t('cardRefSub')}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t('cardRunStatus')}
          </div>
          <div className="mt-2">
            <ExperimentStatusLabel status={experiment.status} />
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            {blockingFlags.length > 0
              ? `${blockingFlags.length} ${t('blockingLabel')}`
              : warningFlags.length > 0
              ? `${warningFlags.length} ${t('warnLabel')}`
              : t('cardNoQaFlags')}
          </div>
        </div>
      </div>

      {/* Collapsible Metadata & Protocol Selector */}
      {metaOpen && (
        <form
          onSubmit={handleSaveMetadata}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#222B33]">
              Experiment Metadata & Protocol Assignment
            </h2>
            {!permissions.canEditExperimentMetadata && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Lock className="w-3.5 h-3.5" /> Read-only for {role}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Run ID</label>
              <input
                type="text"
                disabled={!permissions.canEditExperimentMetadata}
                value={metaRunId}
                onChange={(e) => setMetaRunId(e.target.value)}
                className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                disabled={!permissions.canEditExperimentMetadata}
                value={metaDate}
                onChange={(e) => setMetaDate(e.target.value)}
                className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Analyst ID (non-identifying)
              </label>
              <input
                type="text"
                disabled={!permissions.canEditExperimentMetadata}
                value={metaAnalystId}
                onChange={(e) => setMetaAnalystId(e.target.value)}
                className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Protocol Profile
              </label>
              <select
                disabled={!permissions.canEditExperimentMetadata}
                value={metaProtocolId}
                onChange={(e) => setMetaProtocolId(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white disabled:bg-slate-100"
              >
                {protocols.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (v{p.version}) · Zero rule: {p.zeroColonyPolicy}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reference Strain
              </label>
              <select
                disabled={!permissions.canEditExperimentMetadata}
                value={metaRefId}
                onChange={(e) => setMetaRefId(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white disabled:bg-slate-100"
              >
                {referenceStrains.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.strainCode} / {r.atccNumber}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Notes (no patient identifiers)
              </label>
              <input
                type="text"
                disabled={!permissions.canEditExperimentMetadata}
                value={metaNotes}
                onChange={(e) => setMetaNotes(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
          </div>

          {permissions.canEditExperimentMetadata && (
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                disabled={busyAction === 'meta'}
                className="px-4 py-1.5 text-xs font-semibold bg-[#222B33] text-white rounded hover:bg-slate-800 cursor-pointer"
              >
                {busyAction === 'meta' ? 'Saving...' : 'Save Metadata'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Feedback Banner */}
      {banner && (
        <div
          className={`px-4 py-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            banner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : banner.type === 'warning'
              ? 'bg-[#FEF9EE] border-[#E5D5B5] text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'error' ? (
              <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
            ) : banner.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          {banner.type === 'error' && (
            <button
              type="button"
              onClick={() => onNavigate('qa')}
              className="font-semibold underline whitespace-nowrap cursor-pointer"
            >
              Inspect QA Flags
            </button>
          )}
        </div>
      )}

      {/* Active Protocol Parameters Bar */}
      <div className="bg-white border border-slate-200 rounded-lg px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            <strong className="text-slate-900">{t('reportConcSeries')}:</strong>{' '}
            <span className="font-mono">[{protocol.concentrationGrid.join(', ')}] mg/L</span>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>
            <strong className="text-slate-900">{t('colRep')}:</strong>{' '}
            <span className="font-mono">{protocol.expectedReplicates}</span>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-slate-600">{protocol.incubationConditions}</span>
        </div>
        <button
          type="button"
          onClick={onOpenProtocolSettings}
          className="text-xs font-semibold text-[#0B5D1E] hover:underline cursor-pointer whitespace-nowrap"
        >
          {t('protocolSettingsBtn')}
        </button>
      </div>

      {/* Observation Data Grid */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#222B33]">
              {t('obsDataTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('obsDataSub')} ({t('reportZeroRule')}: <span className="font-mono text-slate-700">{protocol.zeroColonyPolicy}</span>)
            </p>
          </div>
          {!permissions.canEditObservations && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              {t('lockedObsNote')}
            </span>
          )}
        </div>

        {/* Quick Add Strain Series Builder */}
        {seriesBuilderOpen && permissions.canEditObservations && (
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Strain ID</label>
              <input
                type="text"
                value={seriesStrainId}
                onChange={(e) => setSeriesStrainId(e.target.value)}
                placeholder="e.g. DEMO-ISO-03"
                className="w-36 font-mono border border-slate-300 rounded px-2.5 py-1.5 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={seriesRole}
                onChange={(e) => setSeriesRole(e.target.value as StrainRole)}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white"
              >
                <option value="TEST">Test Isolate</option>
                <option value="REFERENCE_MU3">Mu3 Reference</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Replicates</label>
              <input
                type="number"
                min="1"
                max="6"
                value={seriesReplicates}
                onChange={(e) => setSeriesReplicates(e.target.value)}
                className="w-20 font-mono border border-slate-300 rounded px-2.5 py-1.5 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dilution</label>
              <input
                type="number"
                step="any"
                value={seriesDilution}
                onChange={(e) => setSeriesDilution(e.target.value)}
                className="w-24 font-mono border border-slate-300 rounded px-2.5 py-1.5 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Volume (mL)</label>
              <input
                type="number"
                step="any"
                value={seriesVolume}
                onChange={(e) => setSeriesVolume(e.target.value)}
                className="w-20 font-mono border border-slate-300 rounded px-2.5 py-1.5 bg-white"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateStrainSeries}
              className="px-3.5 py-1.5 font-semibold bg-[#222B33] text-white rounded hover:bg-slate-800 cursor-pointer"
            >
              Generate [{protocol.concentrationGrid.join(', ')}] mg/L Rows
            </button>
            <button
              type="button"
              onClick={() => setSeriesBuilderOpen(false)}
              className="px-3 py-1.5 font-medium text-slate-700 border border-slate-300 bg-white rounded hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3">{t('colStrainId')}</th>
                <th className="py-2.5 px-3">{t('colRole')}</th>
                <th className="py-2.5 px-3 text-right">{t('colConc')}</th>
                <th className="py-2.5 px-3">{t('colRep')}</th>
                <th className="py-2.5 px-3 text-right">{t('colDilution')}</th>
                <th className="py-2.5 px-3 text-right">{t('colVol')}</th>
                <th className="py-2.5 px-3 text-right">{t('colColonies')}</th>
                <th className="py-2.5 px-3 text-right">CFU/mL</th>
                <th className="py-2.5 px-3 text-right">log10(CFU/mL)</th>
                {permissions.canEditObservations && (
                  <th className="py-2.5 px-3 text-center w-10">{t('colDelete')}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={permissions.canEditObservations ? 11 : 10}
                    className="py-8 text-center text-slate-500"
                  >
                    No observations yet. Add rows manually or import CSV (`sample_data.csv`).
                  </td>
                </tr>
              ) : (
                rows.map((r, index) => {
                  const preview = computeObservationMetrics(
                    {
                      id: r.id || r.localKey,
                      strainId: r.strainId,
                      strainRole: r.strainRole,
                      vancomycinConcentrationMgL: Number(r.vancomycinConcentrationMgL),
                      replicateId: r.replicateId,
                      dilutionFraction: Number(r.dilutionFraction),
                      platedVolumeMl: Number(r.platedVolumeMl),
                      colonyCount: Number(r.colonyCount),
                    },
                    protocol.zeroColonyPolicy
                  );
                  const isHighlighted =
                    highlightObservationId !== null && r.id === highlightObservationId;
                  const rowFlag = qaFlags.find((f) => f.observationId === r.id);

                  return (
                    <tr
                      key={r.localKey}
                      id={r.id ? `obs-row-${r.id}` : undefined}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-amber-100/70'
                          : rowFlag?.severity === 'BLOCKING'
                          ? 'bg-rose-50/60'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-mono text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          disabled={!permissions.canEditObservations}
                          value={r.strainId}
                          onChange={(e) => updateRowField(r.localKey, 'strainId', e.target.value)}
                          className="w-28 font-mono text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-transparent disabled:border-transparent"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          disabled={!permissions.canEditObservations}
                          value={r.strainRole}
                          onChange={(e) =>
                            updateRowField(r.localKey, 'strainRole', e.target.value)
                          }
                          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-transparent disabled:border-transparent"
                        >
                          <option value="REFERENCE_MU3">Reference</option>
                          <option value="TEST">Test</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          disabled={!permissions.canEditObservations}
                          value={r.vancomycinConcentrationMgL}
                          onChange={(e) =>
                            updateRowField(
                              r.localKey,
                              'vancomycinConcentrationMgL',
                              e.target.value
                            )
                          }
                          className="w-20 text-right font-mono text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-transparent disabled:border-transparent"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          disabled={!permissions.canEditObservations}
                          value={r.replicateId}
                          onChange={(e) =>
                            updateRowField(r.localKey, 'replicateId', e.target.value)
                          }
                          className="w-14 font-mono text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-transparent disabled:border-transparent"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          disabled={!permissions.canEditObservations}
                          value={r.dilutionFraction}
                          onChange={(e) =>
                            updateRowField(r.localKey, 'dilutionFraction', e.target.value)
                          }
                          className="w-20 text-right font-mono text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-transparent disabled:border-transparent"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          disabled={!permissions.canEditObservations}
                          value={r.platedVolumeMl}
                          onChange={(e) =>
                            updateRowField(r.localKey, 'platedVolumeMl', e.target.value)
                          }
                          className="w-16 text-right font-mono text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-transparent disabled:border-transparent"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          disabled={!permissions.canEditObservations}
                          value={r.colonyCount}
                          onChange={(e) =>
                            updateRowField(r.localKey, 'colonyCount', e.target.value)
                          }
                          className="w-20 text-right font-mono text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-transparent disabled:border-transparent"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {preview.cfuPerMl === null
                          ? 'Invalid'
                          : preview.cfuPerMl.toLocaleString('en-US', {
                              maximumFractionDigits: 0,
                            })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {!preview.isValidInput ? (
                          <span className="text-rose-700 font-semibold">Invalid</span>
                        ) : preview.isZeroCensored ? (
                          <span
                            className="text-amber-800"
                            title={preview.handlingNote}
                          >
                            {preview.effectiveLog10ForCurve !== null
                              ? `0 (limit: ${preview.effectiveLog10ForCurve.toFixed(2)})`
                              : '0 (censored)'}
                          </span>
                        ) : (
                          <span className="text-slate-900 font-medium">
                            {preview.log10CfuPerMl?.toFixed(3)}
                          </span>
                        )}
                      </td>
                      {permissions.canEditObservations && (
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(r.localKey)}
                            aria-label={`Delete row ${index + 1}`}
                            className="text-slate-400 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Action Toolbar matching wireframe bottom actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {permissions.canEditObservations && (
              <>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('addRowBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSeriesBuilderOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('addSeriesBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCsvErrors([]);
                    setCsvModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B5D1E] bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('importCsvBtn')}</span>
                </button>
                <button
                  type="button"
                  disabled={!dirtyRows || busyAction !== null}
                  onClick={handleSaveObservations}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-45 rounded cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{busyAction === 'save' ? t('savingLabel') : t('saveObsBtn')}</span>
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {permissions.canRunValidationAndCalculation && (
              <>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={handleValidateInputs}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0B5D1E] bg-white border border-[#138808] hover:bg-[#F1F9F1] rounded cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{busyAction === 'validate' ? '...' : t('validateInputsBtn')}</span>
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={handleCalculate}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#094a17] rounded cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>
                    {busyAction === 'calculate' ? '...' : t('calcPapAucBtn')}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <p className="text-xs text-slate-600">{t('rawPreservedNote')}</p>

      {/* Inline QA Summary Preview */}
      {qaFlags.length > 0 && (
        <section className="bg-[#FEF9EE] border border-[#E5D5B5] rounded-lg p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
              {t('activeQaTitle')} ({qaFlags.length})
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('qa')}
              className="text-xs font-semibold text-[#0B5D1E] hover:underline cursor-pointer"
            >
              {t('openFullQaBtn')}
            </button>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-800">
            {qaFlags.slice(0, 5).map((flag) => (
              <li key={flag.id} className="flex flex-wrap items-center gap-2">
                <QaSeverityLabel severity={flag.severity} />
                <span>{flag.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CSV Import Modal */}
      {csvModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="csv-import-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 bg-[#222B33] text-white flex items-center justify-between">
              <h2 id="csv-import-title" className="text-base font-semibold">
                {t('csvModalTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                {t('modalClose')}
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-slate-600">
                  CSV: <code className="font-mono text-slate-800">strain_id, strain_role, vancomycin_concentration_mg_L, replicate_id, dilution_fraction, plated_volume_ml, colony_count</code>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="px-2.5 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    {t('csvDownloadSample')}
                  </button>
                  <button
                    type="button"
                    onClick={handleFillSampleCsv}
                    className="px-3 py-1.5 font-semibold text-[#0B5D1E] bg-[#F1F9F1] border border-[#138808] hover:bg-[#E6F4E6] rounded cursor-pointer"
                  >
                    {t('csvFillSample')}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="csvImportMode"
                    checked={csvImportMode === 'replace'}
                    onChange={() => setCsvImportMode('replace')}
                  />
                  <span>{t('csvImportReplace')}</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="csvImportMode"
                    checked={csvImportMode === 'append'}
                    onChange={() => setCsvImportMode('append')}
                  />
                  <span>{t('csvImportAppend')}</span>
                </label>
              </div>

              <div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    file.text().then((txt) => {
                      setCsvText(txt);
                      setCsvErrors([]);
                    });
                  }}
                  className="block w-full text-xs text-slate-600 mb-2"
                />
                <textarea
                  rows={9}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    setCsvErrors([]);
                  }}
                  placeholder="strain_id,strain_role,..."
                  className="w-full font-mono text-[11px] border border-slate-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-[#FF9933]"
                />
              </div>

              {csvText.trim().length > 0 && (() => {
                const preview = parseObservationsCsv(csvText);
                const strains = Array.from(new Set(preview.rows.map((r) => `${r.strainId} (${r.strainRole})`)));
                return preview.rows.length > 0 ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700">
                    <strong className="font-mono">{preview.rows.length}</strong> /{' '}
                    <strong className="font-mono">{strains.length}</strong>: {strains.join(', ')}
                  </div>
                ) : null;
              })()}

              {csvErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 space-y-1">
                  {csvErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCsvModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                >
                  {t('modalCancel')}
                </button>
                <button
                  type="button"
                  onClick={handleImportCsvApply}
                  className="px-4 py-2 font-semibold text-white bg-[#222B33] hover:bg-slate-800 rounded cursor-pointer"
                >
                  {t('csvApplyBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

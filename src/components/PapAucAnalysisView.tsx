import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronUp,
  Lock,
  Plus,
  Settings2,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useI18n } from '../lib/i18n.tsx';
import { getRolePermissions } from '../lib/permissions.ts';
import type {
  AggregationMethod,
  ExperimentDetail,
  UserRole,
  ZeroColonyPolicy,
} from '../types/hvisa.ts';
import type { LabNavigateTarget } from './LabWorkbenchView.tsx';
import { ComparativeAnalysisView } from './ComparativeAnalysisView.tsx';
import { PapCurveChart } from './PapCurveChart.tsx';
import {
  ExperimentStatusLabel,
  InterpretationBandIndicator,
} from './StatusIndicator.tsx';

interface PapAucAnalysisViewProps {
  detail: ExperimentDetail | null;
  loading: boolean;
  role: UserRole;
  analysisMode: 'single' | 'comparative';
  onAnalysisModeChange: (mode: 'single' | 'comparative') => void;
  onSelectRunAndOpen: (experimentId: string) => void;
  openProtocolConfigTick?: number;
  onDetailUpdated: (next: ExperimentDetail) => void;
  onProtocolUpdated: () => Promise<void>;
  onNavigate: (screen: LabNavigateTarget) => void;
}

export function PapAucAnalysisView({
  detail,
  loading,
  role,
  analysisMode,
  onAnalysisModeChange,
  onSelectRunAndOpen,
  openProtocolConfigTick = 0,
  onDetailUpdated,
  onProtocolUpdated,
  onNavigate,
}: PapAucAnalysisViewProps) {
  const { t } = useI18n();
  const permissions = getRolePermissions(role);
  const [chartMode, setChartMode] = useState<'combined' | 'individual'>('combined');
  const [focusStrainId, setFocusStrainId] = useState<string | null>(null);
  const [selectedAucStrainId, setSelectedAucStrainId] = useState<string | null>(null);
  const [showCalcDetails, setShowCalcDetails] = useState(true);
  const [calcDetailTab, setCalcDetailTab] = useState<'segments' | 'observations' | 'replicates'>(
    'segments'
  );
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (openProtocolConfigTick > 0) {
      setShowConfig(true);
    }
  }, [openProtocolConfigTick]);

  // Protocol configuration form state
  const [protoName, setProtoName] = useState('');
  const [protoVersion, setProtoVersion] = useState('');
  const [protoSource, setProtoSource] = useState('');
  const [concGridInput, setConcGridInput] = useState('0.5, 1.0, 2.0, 2.5, 4.0');
  const [expectedReplicates, setExpectedReplicates] = useState('1');
  const [defaultVolume, setDefaultVolume] = useState('0.1');
  const [defaultDilution, setDefaultDilution] = useState('0.001');
  const [incubationConditions, setIncubationConditions] = useState('');
  const [lowerThreshold, setLowerThreshold] = useState('0.90');
  const [upperThreshold, setUpperThreshold] = useState('1.30');
  const [zeroPolicy, setZeroPolicy] = useState<ZeroColonyPolicy>('DETECTION_LIMIT');
  const [aggMethod, setAggMethod] = useState<AggregationMethod>('ARITHMETIC_MEAN_LOG10');
  const [belowLabel, setBelowLabel] = useState('');
  const [hvisaLabel, setHvisaLabel] = useState('');
  const [aboveLabel, setAboveLabel] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (!detail) return;
    const p = detail.protocol;
    setProtoName(p.name);
    setProtoVersion(p.version);
    setProtoSource(p.sourceCitation);
    setConcGridInput(p.concentrationGrid.join(', '));
    setExpectedReplicates(String(p.expectedReplicates));
    setDefaultVolume(String(p.defaultPlatedVolumeMl));
    setDefaultDilution(String(p.defaultDilutionFraction));
    setIncubationConditions(p.incubationConditions);
    setLowerThreshold(p.hvisaLowerThreshold.toFixed(2));
    setUpperThreshold(p.visaUpperThreshold.toFixed(2));
    setZeroPolicy(p.zeroColonyPolicy);
    setAggMethod(p.aggregationMethod);
    setBelowLabel(p.interpretationBelowLabel);
    setHvisaLabel(p.interpretationHvisaLabel);
    setAboveLabel(p.interpretationAboveLabel);
    setSelectedAucStrainId(
      detail.latestCalculation?.results.testProfiles[0]?.strainId ?? null
    );
    setFocusStrainId(null);
  }, [detail]);

  if (analysisMode === 'comparative') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-md text-xs">
            <button
              type="button"
              onClick={() => onAnalysisModeChange('single')}
              className="px-3.5 py-1.5 font-medium rounded text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
            >
              {t('singleRunMode')}
            </button>
            <button
              type="button"
              onClick={() => onAnalysisModeChange('comparative')}
              className="px-3.5 py-1.5 font-semibold rounded bg-white text-[#222B33] shadow-sm cursor-pointer whitespace-nowrap"
            >
              {t('comparativeMode')}
            </button>
          </div>
          <span className="text-xs text-slate-500">{t('modeSwitchHint')}</span>
        </div>

        <ComparativeAnalysisView
          role={role}
          activeExperimentId={detail?.experiment.id ?? null}
          onOpenRun={(expId) => {
            onAnalysisModeChange('single');
            onSelectRunAndOpen(expId);
          }}
        />
      </div>
    );
  }

  if (loading || !detail) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-md text-xs">
            <button
              type="button"
              onClick={() => onAnalysisModeChange('single')}
              className="px-3.5 py-1.5 font-semibold rounded bg-white text-[#222B33] shadow-sm cursor-pointer whitespace-nowrap"
            >
              {t('singleRunMode')}
            </button>
            <button
              type="button"
              onClick={() => onAnalysisModeChange('comparative')}
              className="px-3.5 py-1.5 font-medium rounded text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
            >
              {t('comparativeMode')}
            </button>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-600">
          {loading ? '...' : '—'}
        </div>
      </div>
    );
  }

  const { experiment, protocol, latestCalculation, qaFlags } = detail;
  const blockingFlags = qaFlags.filter((f) => f.severity === 'BLOCKING');
  const isStale =
    experiment.status === 'CALCULATION_INVALIDATED' ||
    (latestCalculation !== null && !latestCalculation.isValid);

  const parseGridInput = (): number[] => {
    const nums = concGridInput
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= 0);
    return Array.from(new Set(nums)).sort((a, b) => a - b);
  };

  const handleRecalculate = async () => {
    setActionMessage(null);
    try {
      const res = await api.calculateExperiment(role, experiment.id);
      onDetailUpdated(res.detail);
      setActionMessage({
        type: 'success',
        text: 'PAP-AUC calculation refreshed against current observations and protocol settings.',
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Recalculation failed',
      });
    }
  };

  const handleSaveProtocolConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    const parsedGrid = parseGridInput();
    if (parsedGrid.length < 2) {
      setActionMessage({
        type: 'error',
        text: 'Concentration series must include at least 2 valid non-negative numbers separated by commas.',
      });
      return;
    }

    setSavingConfig(true);
    try {
      await api.updateProtocol(role, protocol.id, {
        name: protoName.trim(),
        version: protoVersion.trim(),
        sourceCitation: protoSource.trim(),
        concentrationGrid: parsedGrid,
        expectedReplicates: Number(expectedReplicates) || 1,
        defaultPlatedVolumeMl: Number(defaultVolume) || 0.1,
        defaultDilutionFraction: Number(defaultDilution) || 0.001,
        incubationConditions: incubationConditions.trim(),
        hvisaLowerThreshold: Number(lowerThreshold),
        visaUpperThreshold: Number(upperThreshold),
        zeroColonyPolicy: zeroPolicy,
        aggregationMethod: aggMethod,
        interpretationBelowLabel: belowLabel.trim(),
        interpretationHvisaLabel: hvisaLabel.trim(),
        interpretationAboveLabel: aboveLabel.trim(),
      });
      await onProtocolUpdated();
      setShowConfig(false);
      setActionMessage({
        type: 'success',
        text: 'Protocol concentration series, rules, and thresholds updated. Re-run "Recalculate PAP-AUC" to update this run.',
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update protocol',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveAsNewProtocol = async () => {
    setActionMessage(null);
    const parsedGrid = parseGridInput();
    if (parsedGrid.length < 2) {
      setActionMessage({
        type: 'error',
        text: 'Concentration series must include at least 2 valid non-negative numbers separated by commas.',
      });
      return;
    }

    setSavingConfig(true);
    try {
      const created = await api.createProtocol(role, {
        name: `${protoName.trim() || 'Custom PAP-AUC'} (${parsedGrid.length}-pt)`,
        version: `${protoVersion.trim() || '1.0'}-custom`,
        sourceCitation: protoSource.trim() || protocol.sourceCitation,
        concentrationGrid: parsedGrid,
        expectedReplicates: Number(expectedReplicates) || 1,
        defaultPlatedVolumeMl: Number(defaultVolume) || 0.1,
        defaultDilutionFraction: Number(defaultDilution) || 0.001,
        incubationConditions: incubationConditions.trim() || protocol.incubationConditions,
        zeroColonyPolicy: zeroPolicy,
        aggregationMethod: aggMethod,
        hvisaLowerThreshold: Number(lowerThreshold),
        visaUpperThreshold: Number(upperThreshold),
        interpretationBelowLabel: belowLabel.trim(),
        interpretationHvisaLabel: hvisaLabel.trim(),
        interpretationAboveLabel: aboveLabel.trim(),
        disclaimerText: protocol.disclaimerText,
      });

      if (permissions.canEditExperimentMetadata) {
        const updatedExp = await api.updateExperimentMetadata(role, experiment.id, {
          protocolProfileId: created.id,
        });
        onDetailUpdated(updatedExp);
      }
      await onProtocolUpdated();
      setShowConfig(false);
      setActionMessage({
        type: 'success',
        text: `Created custom protocol "${created.name}".`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create custom protocol',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Segmented Mode Switcher: Single-Run vs Comparative Analysis */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-md text-xs">
          <button
            type="button"
            onClick={() => onAnalysisModeChange('single')}
            className="px-3.5 py-1.5 font-semibold rounded bg-white text-[#222B33] shadow-sm cursor-pointer whitespace-nowrap"
          >
            {t('singleRunMode')}
          </button>
          <button
            type="button"
            onClick={() => onAnalysisModeChange('comparative')}
            className="px-3.5 py-1.5 font-medium rounded text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
          >
            {t('comparativeMode')}
          </button>
        </div>
        <span className="text-xs text-slate-500">{t('modeSwitchHint')}</span>
      </div>

      {/* Header matching wireframe Right Screen */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#222B33] tracking-tight">
            {t('analysisHeaderTitle')}
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
            <ExperimentStatusLabel status={experiment.status} />
            {experiment.isSyntheticDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-amber-800">{t('demoBadge')}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>
              {showConfig ? t('hideProtocolSettingsBtn') : t('protocolSettingsBtn')}
            </span>
          </button>

          {permissions.canRunValidationAndCalculation && (
            <button
              type="button"
              onClick={handleRecalculate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#0B5D1E] hover:bg-[#094a17] text-white rounded cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{latestCalculation ? t('recalcPapAucBtn') : t('calcPapAucBtn')}</span>
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`px-4 py-3 rounded-lg border text-xs ${
            actionMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {isStale && (
        <div className="bg-[#FEF9EE] border border-[#E5D5B5] rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Raw observations or protocol settings changed after the last calculation. Displayed results are invalidated until recalculated.
            </span>
          </div>
          {permissions.canRunValidationAndCalculation && (
            <button
              type="button"
              onClick={handleRecalculate}
              className="px-3 py-1 font-semibold bg-amber-800 text-white rounded hover:bg-amber-900 cursor-pointer"
            >
              Recalculate Now
            </button>
          )}
        </div>
      )}

      {/* Configurable Protocol Series, Settings & Thresholds Panel */}
      {showConfig && (
        <form
          onSubmit={handleSaveProtocolConfig}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#222B33]">
                Protocol-Specific Concentration Series, Assay Settings &amp; Thresholds
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Source: {protocol.sourceCitation}
              </p>
            </div>
            {!permissions.canConfigureProtocolThresholds && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <Lock className="w-3.5 h-3.5" />
                {permissions.canCreateProtocolProfile
                  ? 'Reviewer role required to overwrite existing protocol; Analyst can Save as New Profile'
                  : 'Read-only in Auditor role'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Protocol Profile Name
              </label>
              <input
                type="text"
                disabled={!permissions.canCreateProtocolProfile}
                value={protoName}
                onChange={(e) => setProtoName(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Version
              </label>
              <input
                type="text"
                disabled={!permissions.canCreateProtocolProfile}
                value={protoVersion}
                onChange={(e) => setProtoVersion(e.target.value)}
                className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Concentration Series (mg/L, comma-separated)
              </label>
              <input
                type="text"
                disabled={!permissions.canCreateProtocolProfile}
                value={concGridInput}
                onChange={(e) => setConcGridInput(e.target.value)}
                placeholder="0.5, 1.0, 2.0, 2.5, 4.0"
                className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expected Replicates
              </label>
              <input
                type="number"
                min="1"
                max="10"
                disabled={!permissions.canCreateProtocolProfile}
                value={expectedReplicates}
                onChange={(e) => setExpectedReplicates(e.target.value)}
                className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Plated Volume (mL)
              </label>
              <input
                type="number"
                step="any"
                disabled={!permissions.canCreateProtocolProfile}
                value={defaultVolume}
                onChange={(e) => setDefaultVolume(e.target.value)}
                className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Dilution Fraction
              </label>
              <input
                type="number"
                step="any"
                disabled={!permissions.canCreateProtocolProfile}
                value={defaultDilution}
                onChange={(e) => setDefaultDilution(e.target.value)}
                className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Incubation Conditions
              </label>
              <input
                type="text"
                disabled={!permissions.canCreateProtocolProfile}
                value={incubationConditions}
                onChange={(e) => setIncubationConditions(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                hVISA Lower Boundary (&ge;)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                disabled={!permissions.canConfigureProtocolThresholds}
                value={lowerThreshold}
                onChange={(e) => setLowerThreshold(e.target.value)}
                className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                VISA Upper Boundary (&gt;)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.2"
                disabled={!permissions.canConfigureProtocolThresholds}
                value={upperThreshold}
                onChange={(e) => setUpperThreshold(e.target.value)}
                className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Zero-Colony Handling Policy
              </label>
              <select
                disabled={!permissions.canConfigureProtocolThresholds}
                value={zeroPolicy}
                onChange={(e) => setZeroPolicy(e.target.value as ZeroColonyPolicy)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white disabled:bg-slate-100"
              >
                <option value="DETECTION_LIMIT">Detection Limit Floor: log10(1/(vol*dil))</option>
                <option value="EXCLUDE_POINT">Exclude Zero-Colony Point from Curve</option>
                <option value="FLOOR_ZERO">Zero Baseline (0.000 log10)</option>
                <option value="UNSPECIFIED">Unspecified (Block until chosen)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Replicate Aggregation
              </label>
              <select
                disabled={!permissions.canConfigureProtocolThresholds}
                value={aggMethod}
                onChange={(e) => setAggMethod(e.target.value as AggregationMethod)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white disabled:bg-slate-100"
              >
                <option value="ARITHMETIC_MEAN_LOG10">Arithmetic Mean of log10(CFU/mL)</option>
                <option value="MEDIAN_LOG10">Median of log10(CFU/mL)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Wording: Below Lower Boundary
              </label>
              <input
                type="text"
                disabled={!permissions.canConfigureProtocolThresholds}
                value={belowLabel}
                onChange={(e) => setBelowLabel(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Wording: Within hVISA Range
              </label>
              <input
                type="text"
                disabled={!permissions.canConfigureProtocolThresholds}
                value={hvisaLabel}
                onChange={(e) => setHvisaLabel(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Wording: Above Upper Boundary
              </label>
              <input
                type="text"
                disabled={!permissions.canConfigureProtocolThresholds}
                value={aboveLabel}
                onChange={(e) => setAboveLabel(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Threshold Source Citation
            </label>
            <input
              type="text"
              disabled={!permissions.canCreateProtocolProfile}
              value={protoSource}
              onChange={(e) => setProtoSource(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 disabled:bg-slate-100"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {permissions.canCreateProtocolProfile && (
              <button
                type="button"
                disabled={savingConfig}
                onClick={handleSaveAsNewProtocol}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-semibold border border-slate-300 bg-white text-slate-800 rounded hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save as New Custom Protocol</span>
              </button>
            )}
            {permissions.canConfigureProtocolThresholds && (
              <button
                type="submit"
                disabled={savingConfig}
                className="px-4 py-1.5 font-semibold bg-[#222B33] text-white rounded hover:bg-slate-800 cursor-pointer"
              >
                {savingConfig ? 'Saving...' : 'Update Active Protocol'}
              </button>
            )}
          </div>
        </form>
      )}

      {/* Main Analysis Grid */}
      {!latestCalculation ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
          <h2 className="text-base font-semibold text-[#222B33]">
            {t('notComputedTitle')}
          </h2>
          <p className="text-xs text-slate-600 max-w-xl mx-auto">
            {blockingFlags.length > 0
              ? `${blockingFlags.length} ${t('blockingLabel')} (${blockingFlags[0].message})`
              : t('notComputedDesc')}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('experiments')}
              className="px-4 py-2 text-xs font-semibold bg-[#222B33] text-white rounded hover:bg-slate-800 cursor-pointer"
            >
              {t('openWorkspaceBtn')}
            </button>
            {blockingFlags.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('qa')}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded hover:bg-slate-50 cursor-pointer"
              >
                {t('inspectBlockingBtn')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Chart View Mode & Isolate Focus Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setChartMode('combined')}
                className={`px-3 py-1.5 font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  chartMode === 'combined'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('combinedCurvesBtn')}
              </button>
              <button
                type="button"
                onClick={() => setChartMode('individual')}
                className={`px-3 py-1.5 font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  chartMode === 'individual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('individualCurvesBtn')} ({latestCalculation.results.testProfiles.length})
              </button>
            </div>

            {chartMode === 'combined' && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 mr-1">{t('compareFilterLabel')}</span>
                <button
                  type="button"
                  onClick={() => setFocusStrainId(null)}
                  className={`px-2.5 py-1 rounded border cursor-pointer ${
                    focusStrainId === null
                      ? 'bg-[#222B33] text-white border-[#222B33]'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {t('allIsolatesBtn')}
                </button>
                {latestCalculation.results.testProfiles.map((tp) => (
                  <button
                    key={`focus-${tp.strainId}`}
                    type="button"
                    onClick={() =>
                      setFocusStrainId((prev) => (prev === tp.strainId ? null : tp.strainId))
                    }
                    className={`px-2.5 py-1 font-mono rounded border cursor-pointer ${
                      focusStrainId === tp.strainId
                        ? 'bg-[#0B5D1E] text-white border-[#0B5D1E]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {tp.strainId} vs. Mu3
                  </button>
                ))}
              </div>
            )}
          </div>

          {chartMode === 'combined' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left: Interactive SVG Population Analysis Profile Chart */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
                <PapCurveChart
                  payload={latestCalculation.results}
                  focusTestStrainId={focusStrainId}
                  selectedAucStrainId={selectedAucStrainId}
                  onSelectAucStrain={setSelectedAucStrainId}
                />
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>
                    {t('shadedAucLabel')}{' '}
                    <select
                      value={selectedAucStrainId ?? ''}
                      onChange={(e) => setSelectedAucStrainId(e.target.value || null)}
                      className="font-mono text-[11px] border border-slate-200 rounded px-2 py-0.5 bg-white text-slate-700"
                    >
                      <option value="">{t('noneOption')}</option>
                      {latestCalculation.results.referenceProfile && (
                        <option value={latestCalculation.results.referenceProfile.strainId}>
                          {latestCalculation.results.referenceProfile.strainId} (Mu3)
                        </option>
                      )}
                      {latestCalculation.results.testProfiles.map((tp) => (
                        <option key={tp.strainId} value={tp.strainId}>
                          {tp.strainId}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span className="font-mono">
                    {latestCalculation.calculationVersion} ·{' '}
                    {new Date(latestCalculation.calculatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Right: Isolate AUC & Ratio Cards */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t('roleRefControl')} · {latestCalculation.results.mu3StrainId}
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-mono tabular-nums font-bold text-[#0B5D1E]">
                      {latestCalculation.results.mu3Auc?.toFixed(3) ?? '—'}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      log10(CFU/mL) · mg/L
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {t('mu3BaselineNote')}
                  </div>
                </div>

                {latestCalculation.results.testProfiles.map((tp) => (
                  <div
                    key={tp.strainId}
                    className={`bg-white border rounded-lg p-4 space-y-2.5 transition-colors ${
                      focusStrainId === tp.strainId
                        ? 'border-cyan-600 ring-1 ring-cyan-600'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {tp.strainId} · {t('colRatio')}
                      </span>
                      <span className="font-mono text-xs text-slate-600">
                        AUC {tp.auc?.toFixed(3) ?? '—'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono tabular-nums font-bold text-[#222B33]">
                          {tp.papAucRatio !== null ? tp.papAucRatio.toFixed(3) : 'N/A'}
                        </span>
                        <span className="text-xs text-slate-500">(Test / Mu3)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFocusStrainId((prev) =>
                            prev === tp.strainId ? null : tp.strainId
                          )
                        }
                        className="text-[11px] font-medium text-[#0B5D1E] hover:underline cursor-pointer"
                      >
                        {focusStrainId === tp.strainId ? t('showAllBtn') : t('soloCurveBtn')}
                      </button>
                    </div>

                    <InterpretationBandIndicator
                      band={tp.interpretationBand}
                      label={tp.interpretationLabel}
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {tp.interpretationDetail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Individual Test Isolate vs. Mu3 Reference Small-Multiples Grid */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {latestCalculation.results.testProfiles.map((tp) => (
                <div
                  key={`indiv-${tp.strainId}`}
                  className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
                >
                  <PapCurveChart
                    payload={latestCalculation.results}
                    focusTestStrainId={tp.strainId}
                    selectedAucStrainId={tp.strainId}
                    compact
                    height={280}
                  />
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase">{t('testAucLabel')}</div>
                      <div className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                        {tp.auc?.toFixed(3) ?? '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase">{t('mu3AucLabel')}</div>
                      <div className="font-mono tabular-nums font-bold text-[#0B5D1E] mt-0.5">
                        {latestCalculation.results.mu3Auc?.toFixed(3) ?? '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase">{t('papRatioLabel')}</div>
                      <div className="font-mono tabular-nums font-bold text-[#222B33] mt-0.5">
                        {tp.papAucRatio !== null ? tp.papAucRatio.toFixed(3) : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="pt-1">
                    <InterpretationBandIndicator
                      band={tp.interpretationBand}
                      label={tp.interpretationLabel}
                    />
                    <p className="text-[11px] text-slate-500 mt-1">{tp.interpretationDetail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Configured Interpretation Thresholds Reference */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#222B33]">
                {t('thresholdsHeading')} ({latestCalculation.results.protocolName} · v
                {latestCalculation.results.protocolVersion})
              </h2>
              <span className="text-[11px] text-slate-500">
                {latestCalculation.results.sourceCitation}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="border border-slate-200 rounded p-3 bg-slate-50/70">
                <div className="font-mono font-semibold text-slate-800">
                  {t('colRatio')} &lt; {latestCalculation.results.hvisaLowerThreshold.toFixed(2)}
                </div>
                <div className="text-slate-600 mt-1">
                  {t('bandBelow')}
                </div>
              </div>
              <div className="border border-teal-200 rounded p-3 bg-teal-50/50">
                <div className="font-mono font-semibold text-teal-900">
                  {latestCalculation.results.hvisaLowerThreshold.toFixed(2)} &le; {t('colRatio')} &le;{' '}
                  {latestCalculation.results.visaUpperThreshold.toFixed(2)}
                </div>
                <div className="text-teal-900/90 mt-1">
                  {t('bandHvisa')}
                </div>
              </div>
              <div className="border border-amber-200 rounded p-3 bg-[#FEF9EE]">
                <div className="font-mono font-semibold text-amber-900">
                  {t('colRatio')} &gt; {latestCalculation.results.visaUpperThreshold.toFixed(2)}
                </div>
                <div className="text-amber-900/90 mt-1">
                  {t('bandExpert')}
                </div>
              </div>
            </div>
          </section>

          {/* Quality Assurance Summary Box matching wireframe */}
          <section className="bg-[#FEF9EE] border border-[#E5D5B5] rounded-lg p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                {t('qaContextTitle')}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('qa')}
                  className="text-xs font-semibold text-[#0B5D1E] hover:underline cursor-pointer"
                >
                  {t('reviewRunBtn')} ({qaFlags.length})
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="text-xs font-semibold text-[#0B5D1E] hover:underline cursor-pointer"
                >
                  {t('exportReportLink')}
                </button>
              </div>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-800 list-disc pl-5">
              {qaFlags.map((flag) => (
                <li key={flag.id}>
                  <strong className="font-mono">{flag.severity}:</strong> {flag.message}
                </li>
              ))}
            </ul>

            <p className="text-[11px] text-slate-600 pt-2 border-t border-[#E5D5B5]">
              {t('reportDisclaimer2')}
            </p>
          </section>

          {/* Expandable Step-by-Step Calculation Details */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCalcDetails((v) => !v)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer"
            >
              <div>
                <h2 className="text-sm font-semibold text-[#222B33]">
                  {t('calcDetailsTitle')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('calcDetailsSub')}</p>
              </div>
              {showCalcDetails ? (
                <ChevronUp className="w-4 h-4 text-slate-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {showCalcDetails && (
              <div className="border-t border-slate-200 p-5 space-y-5">
                <div className="inline-flex items-center p-1 bg-slate-100 rounded-md text-xs">
                  <button
                    type="button"
                    onClick={() => setCalcDetailTab('segments')}
                    className={`px-3 py-1 font-medium rounded cursor-pointer ${
                      calcDetailTab === 'segments'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('tabSegments')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcDetailTab('observations')}
                    className={`px-3 py-1 font-medium rounded cursor-pointer ${
                      calcDetailTab === 'observations'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('tabObsCalc')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcDetailTab('replicates')}
                    className={`px-3 py-1 font-medium rounded cursor-pointer ${
                      calcDetailTab === 'replicates'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('tabReplicates')}
                  </button>
                </div>

                {calcDetailTab === 'segments' && (
                  <div className="space-y-6">
                    {[
                      ...(latestCalculation.results.referenceProfile
                        ? [latestCalculation.results.referenceProfile]
                        : []),
                      ...latestCalculation.results.testProfiles,
                    ].map((profile) => (
                      <div
                        key={`seg-${profile.strainRole}-${profile.strainId}`}
                        className="space-y-2"
                      >
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                            {profile.strainId} ({profile.strainRole})
                          </h3>
                          <span className="font-mono text-xs font-semibold text-[#222B33]">
                            Total AUC = {profile.auc?.toFixed(4) ?? 'N/A'}
                            {profile.papAucRatio !== null
                              ? ` · Ratio = ${profile.papAucRatio.toFixed(4)}`
                              : ''}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                                <th className="py-2 px-3">Interval (mg/L)</th>
                                <th className="py-2 px-3 text-right">y_i (log10)</th>
                                <th className="py-2 px-3 text-right">y_(i+1) (log10)</th>
                                <th className="py-2 px-3 text-right">Δx (mg/L)</th>
                                <th className="py-2 px-3 text-right">Mean y</th>
                                <th className="py-2 px-3 text-right">Segment Area</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-mono">
                              {profile.segments.map((seg, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 px-3">
                                    [{seg.x0}, {seg.x1}]
                                  </td>
                                  <td className="py-2 px-3 text-right">{seg.y0.toFixed(4)}</td>
                                  <td className="py-2 px-3 text-right">{seg.y1.toFixed(4)}</td>
                                  <td className="py-2 px-3 text-right">{seg.deltaX.toFixed(3)}</td>
                                  <td className="py-2 px-3 text-right">{seg.meanY.toFixed(4)}</td>
                                  <td className="py-2 px-3 text-right font-semibold">
                                    {seg.segmentArea.toFixed(4)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {calcDetailTab === 'observations' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                          <th className="py-2 px-3">Strain</th>
                          <th className="py-2 px-3">Role</th>
                          <th className="py-2 px-3 text-right">Conc (mg/L)</th>
                          <th className="py-2 px-3">Rep</th>
                          <th className="py-2 px-3 text-right">Colonies</th>
                          <th className="py-2 px-3 text-right">Dilution × Vol</th>
                          <th className="py-2 px-3 text-right">CFU/mL</th>
                          <th className="py-2 px-3 text-right">log10(CFU/mL)</th>
                          <th className="py-2 px-3 text-right">Curve Value</th>
                          <th className="py-2 px-3">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {latestCalculation.results.observationDerived.map((d) => (
                          <tr key={d.observationId}>
                            <td className="py-2 px-3 font-mono font-semibold">{d.strainId}</td>
                            <td className="py-2 px-3">{d.strainRole}</td>
                            <td className="py-2 px-3 text-right font-mono">
                              {d.concentrationMgL}
                            </td>
                            <td className="py-2 px-3 font-mono">{d.replicateId}</td>
                            <td className="py-2 px-3 text-right font-mono">{d.colonyCount}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {d.dilutionFraction} × {d.platedVolumeMl}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {d.cfuPerMl !== null
                                ? d.cfuPerMl.toLocaleString('en-US', { maximumFractionDigits: 0 })
                                : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {d.isZeroCensored ? (
                                <span className="text-amber-800">0 (censored)</span>
                              ) : d.log10CfuPerMl !== null ? (
                                d.log10CfuPerMl.toFixed(4)
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">
                              {d.effectiveLog10ForCurve !== null
                                ? d.effectiveLog10ForCurve.toFixed(4)
                                : 'Excluded'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{d.handlingNote}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {calcDetailTab === 'replicates' && (
                  <div className="space-y-5">
                    {[
                      ...(latestCalculation.results.referenceProfile
                        ? [latestCalculation.results.referenceProfile]
                        : []),
                      ...latestCalculation.results.testProfiles,
                    ].map((profile) => (
                      <div
                        key={`rep-${profile.strainRole}-${profile.strainId}`}
                        className="space-y-2"
                      >
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                          {profile.strainId} ({profile.strainRole})
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                                <th className="py-2 px-3">Conc (mg/L)</th>
                                <th className="py-2 px-3">Replicates (raw count → log10)</th>
                                <th className="py-2 px-3 text-right">Included / Censored</th>
                                <th className="py-2 px-3 text-right">Aggregated log10(CFU/mL)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {profile.points.map((pt) => (
                                <tr key={`${profile.strainId}-${pt.concentrationMgL}`}>
                                  <td className="py-2 px-3 font-mono font-semibold">
                                    {pt.concentrationMgL} mg/L
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-700">
                                    {pt.replicates
                                      .map(
                                        (r) =>
                                          `${r.replicateId}: ${r.colonyCount} CFU → ${
                                            r.effectiveLog10 !== null
                                              ? r.effectiveLog10.toFixed(3)
                                              : 'excluded'
                                          }`
                                      )
                                      .join(' | ')}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono">
                                    {pt.includedCount} / {pt.censoredCount}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-semibold">
                                    {pt.aggregatedLog10CfuPerMl !== null
                                      ? pt.aggregatedLog10CfuPerMl.toFixed(4)
                                      : 'Excluded'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

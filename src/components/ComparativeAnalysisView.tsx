import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Download,
  Eye,
  EyeOff,
  Filter,
  GitCompare,
  Maximize2,
  Pin,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useI18n } from '../lib/i18n.tsx';
import type {
  ComparativeDataset,
  ComparativeRunItem,
  StrainProfileResult,
  UserRole,
} from '../types/hvisa.ts';
import {
  ExperimentStatusLabel,
  InterpretationBandIndicator,
} from './StatusIndicator.tsx';

interface ComparativeAnalysisViewProps {
  role: UserRole;
  activeExperimentId: string | null;
  onOpenRun: (experimentId: string) => void;
}

interface OverlaySeries {
  key: string;
  runId: string;
  experimentId: string;
  strainId: string;
  strainRole: 'REFERENCE_MU3' | 'TEST';
  protocolName: string;
  zeroPolicy: string;
  isBaselineRun: boolean;
  isStale: boolean;
  color: string;
  dashed: boolean;
  points: Array<{ x: number; y: number }>;
  auc: number | null;
  ratio: number | null;
}

interface IsolateComparisonRow {
  rowKey: string;
  experimentId: string;
  runId: string;
  experimentDate: string;
  protocolId: string;
  protocolName: string;
  protocolVersion: string;
  zeroColonyPolicy: string;
  expectedReplicates: number;
  isSyntheticDemo: boolean;
  isStale: boolean;
  runStatus: ComparativeRunItem['experiment']['status'];
  strainId: string;
  testAuc: number | null;
  mu3StrainId: string | null;
  mu3Auc: number | null;
  papAucRatio: number | null;
  interpretationBand: StrainProfileResult['interpretationBand'];
  interpretationLabel: string;
}

const SERIES_PALETTE = [
  '#0B5D1E', // Deep Green
  '#FF9933', // Saffron
  '#138808', // India Green
  '#B26A00', // Amber
  '#B3261E', // Red
  '#1F3A8A', // Chakra Blue accent
  '#475569', // Slate
  '#9A3412', // Burnt Sienna
];

const MU3_COLORS = ['#222B33', '#FF9933', '#4B5563', '#B26A00'];

function triggerCsvDownload(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ComparativeAnalysisView({
  role,
  activeExperimentId,
  onOpenRun,
}: ComparativeAnalysisViewProps) {
  const { t } = useI18n();
  const [dataset, setDataset] = useState<ComparativeDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [protocolFilter, setProtocolFilter] = useState<string>('ALL');
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [isolateSearch, setIsolateSearch] = useState('');
  const [selectedIsolates, setSelectedIsolates] = useState<string[]>([]);
  const [includeMu3Curves, setIncludeMu3Curves] = useState(true);
  const [includeStaleCalcs, setIncludeStaleCalcs] = useState(true);
  const [baselineRunId, setBaselineRunId] = useState<string>('');
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [pinnedX, setPinnedX] = useState<number | null>(null);
  const [hiddenSeriesKeys, setHiddenSeriesKeys] = useState<string[]>([]);
  const [focusedSeriesKey, setFocusedSeriesKey] = useState<string | null>(null);
  const [yAxisMode, setYAxisMode] = useState<'auto' | 'full'>('auto');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getComparativeData(role);
      setDataset(data);
      const calculatedIds = data.runs
        .filter((r) => r.latestCalculation !== null)
        .map((r) => r.experiment.id);
      setSelectedRunIds((prev) => {
        if (prev.length > 0) {
          const valid = prev.filter((id) => data.runs.some((r) => r.experiment.id === id));
          if (valid.length > 0) return valid;
        }
        return calculatedIds.length > 0
          ? calculatedIds
          : data.runs.map((r) => r.experiment.id);
      });
      setBaselineRunId((prev) => {
        if (prev && calculatedIds.includes(prev)) return prev;
        if (activeExperimentId && calculatedIds.includes(activeExperimentId)) {
          return activeExperimentId;
        }
        return calculatedIds[0] ?? data.runs[0]?.experiment.id ?? '';
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparative dataset');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Runs eligible under protocol + stale filters
  const runsMatchingProtocol = useMemo(() => {
    if (!dataset) return [];
    return dataset.runs.filter((r) => {
      if (protocolFilter !== 'ALL' && r.protocol.id !== protocolFilter) return false;
      return true;
    });
  }, [dataset, protocolFilter]);

  const activeRuns = useMemo(() => {
    return runsMatchingProtocol.filter((r) => {
      if (!selectedRunIds.includes(r.experiment.id)) return false;
      if (!includeStaleCalcs && (!r.latestCalculation || !r.latestCalculation.isValid)) {
        return false;
      }
      return true;
    });
  }, [runsMatchingProtocol, selectedRunIds, includeStaleCalcs]);

  // All distinct test isolate IDs across runsMatchingProtocol
  const availableIsolates = useMemo(() => {
    const set = new Set<string>();
    for (const run of runsMatchingProtocol) {
      if (run.latestCalculation) {
        for (const tp of run.latestCalculation.results.testProfiles) {
          set.add(tp.strainId);
        }
      } else {
        for (const iso of run.isolates) {
          if (iso.strainRole === 'TEST') set.add(iso.strainId);
        }
      }
    }
    return [...set].sort();
  }, [runsMatchingProtocol]);

  const effectiveBaselineRun = useMemo(() => {
    return (
      activeRuns.find((r) => r.experiment.id === baselineRunId) ??
      activeRuns.find((r) => r.latestCalculation !== null) ??
      activeRuns[0] ??
      null
    );
  }, [activeRuns, baselineRunId]);

  const matchesIsolateFilter = (strainId: string): boolean => {
    const q = isolateSearch.trim().toLowerCase();
    if (q && !strainId.toLowerCase().includes(q)) return false;
    if (selectedIsolates.length > 0 && !selectedIsolates.includes(strainId)) return false;
    return true;
  };

  // Build comparison table rows
  const isolateRows: IsolateComparisonRow[] = useMemo(() => {
    const rows: IsolateComparisonRow[] = [];
    for (const run of activeRuns) {
      if (!run.latestCalculation) continue;
      const calc = run.latestCalculation;
      const isStale =
        !calc.isValid || run.experiment.status === 'CALCULATION_INVALIDATED';
      for (const tp of calc.results.testProfiles) {
        if (!matchesIsolateFilter(tp.strainId)) continue;
        rows.push({
          rowKey: `${run.experiment.id}::${tp.strainId}`,
          experimentId: run.experiment.id,
          runId: run.experiment.runId,
          experimentDate: run.experiment.experimentDate,
          protocolId: run.protocol.id,
          protocolName: calc.results.protocolName,
          protocolVersion: calc.results.protocolVersion,
          zeroColonyPolicy: calc.results.zeroColonyPolicy,
          expectedReplicates: run.protocol.expectedReplicates,
          isSyntheticDemo: run.experiment.isSyntheticDemo,
          isStale,
          runStatus: run.experiment.status,
          strainId: tp.strainId,
          testAuc: tp.auc,
          mu3StrainId: calc.results.mu3StrainId,
          mu3Auc: calc.results.mu3Auc,
          papAucRatio: tp.papAucRatio,
          interpretationBand: tp.interpretationBand,
          interpretationLabel: tp.interpretationLabel,
        });
      }
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRuns, isolateSearch, selectedIsolates]);

  const meanSelectedRatio = useMemo(() => {
    const valid = isolateRows
      .map((r) => r.papAucRatio)
      .filter((v): v is number => v !== null && Number.isFinite(v));
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }, [isolateRows]);

  // Build overlay curve series
  const overlaySeries: OverlaySeries[] = useMemo(() => {
    const series: OverlaySeries[] = [];
    let testIdx = 0;
    let refIdx = 0;
    const baseId = effectiveBaselineRun?.experiment.id ?? '';

    for (const run of activeRuns) {
      if (!run.latestCalculation) continue;
      const calc = run.latestCalculation;
      const isStale =
        !calc.isValid || run.experiment.status === 'CALCULATION_INVALIDATED';
      const isBaseline = run.experiment.id === baseId;

      if (includeMu3Curves && calc.results.referenceProfile) {
        const ref = calc.results.referenceProfile;
        series.push({
          key: `${run.experiment.id}::REF::${ref.strainId}`,
          runId: run.experiment.runId,
          experimentId: run.experiment.id,
          strainId: ref.strainId,
          strainRole: 'REFERENCE_MU3',
          protocolName: calc.results.protocolName,
          zeroPolicy: calc.results.zeroColonyPolicy,
          isBaselineRun: isBaseline,
          isStale,
          color: MU3_COLORS[refIdx % MU3_COLORS.length],
          dashed: true,
          points: ref.validCurvePoints,
          auc: ref.auc,
          ratio: 1.0,
        });
        refIdx++;
      }

      for (const tp of calc.results.testProfiles) {
        if (!matchesIsolateFilter(tp.strainId)) continue;
        series.push({
          key: `${run.experiment.id}::TEST::${tp.strainId}`,
          runId: run.experiment.runId,
          experimentId: run.experiment.id,
          strainId: tp.strainId,
          strainRole: 'TEST',
          protocolName: calc.results.protocolName,
          zeroPolicy: calc.results.zeroColonyPolicy,
          isBaselineRun: isBaseline,
          isStale,
          color: SERIES_PALETTE[testIdx % SERIES_PALETTE.length],
          dashed: !isBaseline && activeRuns.length > 1,
          points: tp.validCurvePoints,
          auc: tp.auc,
          ratio: tp.papAucRatio,
        });
        testIdx++;
      }
    }
    return series;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRuns, effectiveBaselineRun, includeMu3Curves, isolateSearch, selectedIsolates]);

  // Protocol compatibility check across selected runs
  const compatibilityFindings = useMemo(() => {
    const calculatedRuns = activeRuns.filter((r) => r.latestCalculation !== null);
    if (calculatedRuns.length < 2) return [];
    const findings: string[] = [];
    const protocolsUsed = new Set(calculatedRuns.map((r) => `${r.protocol.name} v${r.protocol.version}`));
    const zeroPoliciesUsed = new Set(
      calculatedRuns.map((r) => r.latestCalculation!.results.zeroColonyPolicy)
    );
    const gridsUsed = new Set(
      calculatedRuns.map((r) => r.protocol.concentrationGrid.join(', '))
    );
    const repsUsed = new Set(calculatedRuns.map((r) => r.protocol.expectedReplicates));

    if (protocolsUsed.size > 1) {
      findings.push(`Multiple protocols selected (${[...protocolsUsed].join(' vs. ')}).`);
    }
    if (zeroPoliciesUsed.size > 1) {
      findings.push(`Different zero-colony rules (${[...zeroPoliciesUsed].join(' vs. ')}) alter curve points at 0 CFU.`);
    }
    if (gridsUsed.size > 1) {
      findings.push(`Concentration grids differ (${[...gridsUsed].join(' vs. ')}), changing trapezoidal integration bounds.`);
    }
    if (repsUsed.size > 1) {
      findings.push(`Expected replicate counts differ (${[...repsUsed].join(' vs. ')} replicates per concentration).`);
    }
    return findings;
  }, [activeRuns]);

  // Cross-run repeated isolates delta table
  const crossRunIsolateDeltas = useMemo(() => {
    const byStrain = new Map<string, IsolateComparisonRow[]>();
    for (const row of isolateRows) {
      const list = byStrain.get(row.strainId) ?? [];
      list.push(row);
      byStrain.set(row.strainId, list);
    }
    const repeated: Array<{
      strainId: string;
      entries: IsolateComparisonRow[];
      minAuc: number | null;
      maxAuc: number | null;
      deltaAuc: number | null;
      minRatio: number | null;
      maxRatio: number | null;
      deltaRatio: number | null;
      protocolSpread: string;
    }> = [];

    for (const [strainId, entries] of byStrain.entries()) {
      if (entries.length < 2) continue;
      const aucs = entries.map((e) => e.testAuc).filter((v): v is number => v !== null);
      const ratios = entries.map((e) => e.papAucRatio).filter((v): v is number => v !== null);
      const minAuc = aucs.length ? Math.min(...aucs) : null;
      const maxAuc = aucs.length ? Math.max(...aucs) : null;
      const minRatio = ratios.length ? Math.min(...ratios) : null;
      const maxRatio = ratios.length ? Math.max(...ratios) : null;
      const protocols = Array.from(
        new Set(entries.map((e) => `${e.protocolName} (${e.zeroColonyPolicy}, ${e.expectedReplicates} rep)`))
      );
      repeated.push({
        strainId,
        entries,
        minAuc,
        maxAuc,
        deltaAuc: minAuc !== null && maxAuc !== null ? maxAuc - minAuc : null,
        minRatio,
        maxRatio,
        deltaRatio: minRatio !== null && maxRatio !== null ? maxRatio - minRatio : null,
        protocolSpread: protocols.join(' vs. '),
      });
    }
    return repeated;
  }, [isolateRows]);

  const visibleOverlaySeries = useMemo(
    () => overlaySeries.filter((s) => !hiddenSeriesKeys.includes(s.key)),
    [overlaySeries, hiddenSeriesKeys]
  );

  // SVG Chart Geometry
  const chartGeom = useMemo(() => {
    const activeSet = visibleOverlaySeries.length > 0 ? visibleOverlaySeries : overlaySeries;
    const allPoints = activeSet.flatMap((s) => s.points);
    if (allPoints.length === 0) return null;
    const width = 820;
    const height = 370;
    const pad = { top: 24, right: 28, bottom: 48, left: 64 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const xVals = Array.from(new Set(allPoints.map((p) => p.x))).sort((a, b) => a - b);
    const minX = Math.min(0, ...xVals);
    const maxX = Math.max(4.0, ...xVals);
    const yMaxRaw = Math.max(7, ...allPoints.map((p) => p.y));
    const yMinRaw = Math.min(0, ...allPoints.map((p) => p.y));
    const minY = yAxisMode === 'full' ? 0 : Math.floor(yMinRaw);
    const maxY = yAxisMode === 'full' ? 10 : Math.ceil(yMaxRaw + 0.3);

    const xScale = (x: number) =>
      pad.left + ((x - minX) / Math.max(0.0001, maxX - minX)) * plotW;
    const yScale = (y: number) =>
      pad.top + ((maxY - y) / Math.max(0.0001, maxY - minY)) * plotH;

    const yTicks: number[] = [];
    const yStep = maxY - minY > 8 ? 2 : 1;
    for (let y = minY; y <= maxY; y += yStep) yTicks.push(y);

    return { width, height, pad, plotW, plotH, minX, maxX, minY, maxY, xVals, yTicks, xScale, yScale };
  }, [visibleOverlaySeries, overlaySeries, yAxisMode]);

  const activeX = pinnedX ?? hoverX;

  const findNearestConcentration = (e: React.MouseEvent<SVGSVGElement>): number | null => {
    if (!chartGeom) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const svgX = ((e.clientX - rect.left) / rect.width) * chartGeom.width;
    let nearest: number | null = null;
    let bestDist = Infinity;
    for (const xv of chartGeom.xVals) {
      const px = chartGeom.xScale(xv);
      const d = Math.abs(svgX - px);
      if (d < bestDist) {
        bestDist = d;
        nearest = xv;
      }
    }
    return bestDist < 55 ? nearest : null;
  };

  const toggleSeriesVisibility = (key: string) => {
    setHiddenSeriesKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    if (focusedSeriesKey === key) {
      setFocusedSeriesKey(null);
    }
  };

  const toggleRun = (expId: string) => {
    setSelectedRunIds((prev) =>
      prev.includes(expId) ? prev.filter((id) => id !== expId) : [...prev, expId]
    );
  };

  const toggleIsolateChip = (strainId: string) => {
    setSelectedIsolates((prev) =>
      prev.includes(strainId) ? prev.filter((s) => s !== strainId) : [...prev, strainId]
    );
  };

  const handleDownloadIsolateComparisonCsv = () => {
    const headers = [
      'run_id',
      'experiment_date',
      'protocol_name',
      'protocol_version',
      'zero_colony_policy',
      'expected_replicates',
      'run_status',
      'synthetic_demo',
      'isolate_id',
      'test_auc',
      'same_run_mu3_strain',
      'same_run_mu3_auc',
      'pap_auc_ratio',
      'delta_ratio_vs_selected_mean',
      'interpretation_band',
      'interpretation_label',
    ];
    const lines = isolateRows.map((row) =>
      [
        row.runId,
        row.experimentDate,
        row.protocolName,
        row.protocolVersion,
        row.zeroColonyPolicy,
        row.expectedReplicates,
        row.runStatus,
        row.isSyntheticDemo ? 'SYNTHETIC_DEMO' : 'STANDARD',
        row.strainId,
        row.testAuc !== null ? row.testAuc.toFixed(4) : '',
        row.mu3StrainId ?? '',
        row.mu3Auc !== null ? row.mu3Auc.toFixed(4) : '',
        row.papAucRatio !== null ? row.papAucRatio.toFixed(4) : '',
        row.papAucRatio !== null && meanSelectedRatio !== null
          ? (row.papAucRatio - meanSelectedRatio).toFixed(4)
          : '',
        row.interpretationBand,
        row.interpretationLabel,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
    triggerCsvDownload(
      `hvisa-isolate-comparison-${new Date().toISOString().slice(0, 10)}.csv`,
      [headers.join(','), ...lines].join('\n')
    );
  };

  const handleDownloadRunDifferencesCsv = () => {
    const baseMu3 = effectiveBaselineRun?.latestCalculation?.results.mu3Auc ?? null;
    const headers = [
      'run_id',
      'experiment_date',
      'is_baseline_run',
      'protocol_name',
      'protocol_version',
      'concentration_grid_mg_L',
      'expected_replicates',
      'zero_colony_policy',
      'run_status',
      'mu3_auc',
      'delta_mu3_auc_vs_baseline',
      'test_isolate_count',
      'min_pap_auc_ratio',
      'max_pap_auc_ratio',
      'qa_blocking_count',
      'qa_warning_count',
    ];
    const lines = activeRuns.map((run) => {
      const calc = run.latestCalculation;
      const mu3Auc = calc?.results.mu3Auc ?? null;
      const ratios = (calc?.results.testProfiles ?? [])
        .map((t) => t.papAucRatio)
        .filter((v): v is number => v !== null);
      const minRatio = ratios.length ? Math.min(...ratios) : null;
      const maxRatio = ratios.length ? Math.max(...ratios) : null;
      return [
        run.experiment.runId,
        run.experiment.experimentDate,
        run.experiment.id === effectiveBaselineRun?.experiment.id ? 'YES' : 'NO',
        run.protocol.name,
        run.protocol.version,
        run.protocol.concentrationGrid.join('; '),
        run.protocol.expectedReplicates,
        calc?.results.zeroColonyPolicy ?? run.protocol.zeroColonyPolicy,
        run.experiment.status,
        mu3Auc !== null ? mu3Auc.toFixed(4) : '',
        mu3Auc !== null && baseMu3 !== null ? (mu3Auc - baseMu3).toFixed(4) : '',
        calc?.results.testProfiles.length ??
          run.isolates.filter((i) => i.strainRole === 'TEST').length,
        minRatio !== null ? minRatio.toFixed(4) : '',
        maxRatio !== null ? maxRatio.toFixed(4) : '',
        run.qaFlags.filter((f) => f.severity === 'BLOCKING').length,
        run.qaFlags.filter((f) => f.severity === 'WARNING').length,
      ]
        .map(escapeCsvCell)
        .join(',');
    });
    triggerCsvDownload(
      `hvisa-run-differences-${new Date().toISOString().slice(0, 10)}.csv`,
      [headers.join(','), ...lines].join('\n')
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-600">
        Loading comparative dataset across experimental runs...
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-xs text-rose-900">
        {error ?? 'Unable to load comparative data.'}
      </div>
    );
  }

  const baseMu3Auc = effectiveBaselineRun?.latestCalculation?.results.mu3Auc ?? null;

  return (
    <div className="space-y-6">
      {/* Header & Exports */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#222B33] tracking-tight">
            {t('compTitle')}
          </h2>
          <p className="text-xs text-slate-600 mt-1">{t('compSubtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('refreshBtn')}</span>
          </button>

          <button
            type="button"
            disabled={isolateRows.length === 0}
            onClick={handleDownloadIsolateComparisonCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-45 text-slate-800 rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('downloadIsolateCsvBtn')}</span>
          </button>

          <button
            type="button"
            disabled={activeRuns.length === 0}
            onClick={handleDownloadRunDifferencesCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#222B33] hover:bg-slate-800 disabled:opacity-45 text-white rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('downloadRunDiffCsvBtn')}</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <Filter className="w-3.5 h-3.5 text-[#0B5D1E]" />
            <span>{t('filterHeading')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMu3Curves}
                onChange={(e) => setIncludeMu3Curves(e.target.checked)}
                className="accent-[#0B5D1E]"
              />
              <span>{t('overlayMu3Check')}</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStaleCalcs}
                onChange={(e) => setIncludeStaleCalcs(e.target.checked)}
                className="accent-[#0B5D1E]"
              />
              <span>{t('includeStaleCheck')}</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Protocol Profile
            </label>
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
            >
              <option value="ALL">All Protocols ({dataset.protocols.length})</option>
              {dataset.protocols.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (v{p.version})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Baseline Run for Cross-Run Deltas
            </label>
            <select
              value={effectiveBaselineRun?.experiment.id ?? ''}
              onChange={(e) => setBaselineRunId(e.target.value)}
              className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 bg-white"
            >
              {activeRuns.map((r) => (
                <option key={r.experiment.id} value={r.experiment.id}>
                  {r.experiment.runId} ({r.experiment.experimentDate})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Search Isolate ID
            </label>
            <input
              type="text"
              value={isolateSearch}
              onChange={(e) => setIsolateSearch(e.target.value)}
              placeholder="Filter by strain ID (e.g. DEMO-ISO-01)..."
              className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5"
            />
          </div>
        </div>

        {/* Experiment Run Multi-Select */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">
              Experiments ({activeRuns.length} of {runsMatchingProtocol.length} active)
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setSelectedRunIds(runsMatchingProtocol.map((r) => r.experiment.id))
                }
                className="text-[#0B5D1E] hover:underline font-medium cursor-pointer"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedRunIds(
                    runsMatchingProtocol
                      .filter((r) => r.latestCalculation !== null)
                      .map((r) => r.experiment.id)
                  )
                }
                className="text-[#0B5D1E] hover:underline font-medium cursor-pointer"
              >
                Calculated only
              </button>
              <button
                type="button"
                onClick={() => setSelectedRunIds([])}
                className="text-slate-600 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {runsMatchingProtocol.map((run) => {
              const checked = selectedRunIds.includes(run.experiment.id);
              const hasCalc = run.latestCalculation !== null;
              return (
                <button
                  key={run.experiment.id}
                  type="button"
                  onClick={() => toggleRun(run.experiment.id)}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                    checked
                      ? 'bg-[#222B33] text-white border-[#222B33]'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {run.experiment.runId}
                  {!hasCalc ? ' (no calc)' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Isolate Multi-Select */}
        {availableIsolates.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Isolates ({selectedIsolates.length === 0 ? 'All' : `${selectedIsolates.length} selected`})
              </span>
              {selectedIsolates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIsolates([])}
                  className="text-[#0B5D1E] hover:underline cursor-pointer"
                >
                  Show all isolates
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableIsolates.map((iso) => {
                const active = selectedIsolates.includes(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => toggleIsolateChip(iso)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#0B5D1E] text-white border-[#0B5D1E]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {iso}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Protocol Compatibility Warning Banner when comparing heterogeneous runs */}
      {compatibilityFindings.length > 0 && (
        <section className="bg-[#FEF9EE] border border-[#E5D5B5] rounded-lg px-5 py-3.5 text-xs text-amber-950 space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Cross-Protocol Comparison Notice</span>
          </div>
          <p className="text-slate-700">
            Selected runs differ in protocol parameters ({compatibilityFindings.join(' ')}). PAP-AUC ratios remain anchored strictly to each isolate&apos;s own same-run Mu3 control.
          </p>
        </section>
      )}

      {/* Multi-Isolate / Multi-Run Overlay Curve Chart */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#222B33]">
              {t('compCurvesTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('compCurvesSub')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500 mr-1">
              {visibleOverlaySeries.length}/{overlaySeries.length} curves
            </span>
            <button
              type="button"
              onClick={() => setYAxisMode((m) => (m === 'auto' ? 'full' : 'auto'))}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                yAxisMode === 'full'
                  ? 'bg-[#0B5D1E] border-[#0B5D1E] text-white'
                  : 'bg-[#FAF8F3] border-slate-300 text-slate-800'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>Y: {yAxisMode === 'full' ? '0–10' : 'Auto'}</span>
            </button>
            {pinnedX !== null && (
              <button
                type="button"
                onClick={() => setPinnedX(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-[#FF9933] bg-[#FFF9ED] text-[#222B33] cursor-pointer"
              >
                <Pin className="w-3 h-3 text-[#B26A00]" />
                <span>Unpin {pinnedX} mg/L</span>
              </button>
            )}
            {(hiddenSeriesKeys.length > 0 || focusedSeriesKey !== null || yAxisMode !== 'auto') && (
              <button
                type="button"
                onClick={() => {
                  setHiddenSeriesKeys([]);
                  setFocusedSeriesKey(null);
                  setYAxisMode('auto');
                  setPinnedX(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset view</span>
              </button>
            )}
          </div>
        </div>

        {!chartGeom || overlaySeries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded">
            No calculated profiles match the current filters. Select at least one calculated run or clear isolate filters.
          </div>
        ) : (
          <div className="space-y-3">
            <svg
              viewBox={`0 0 ${chartGeom.width} ${chartGeom.height}`}
              className="w-full h-auto select-none cursor-crosshair"
              role="img"
              aria-label="Comparative Population Analysis Overlay Chart"
              onMouseLeave={() => setHoverX(null)}
              onMouseMove={(e) => setHoverX(findNearestConcentration(e))}
              onClick={(e) => {
                const nearest = findNearestConcentration(e);
                if (nearest !== null) {
                  setPinnedX((prev) =>
                    prev !== null && Math.abs(prev - nearest) < 1e-6 ? null : nearest
                  );
                }
              }}
            >
              {/* Grid lines */}
              {chartGeom.yTicks.map((yt) => {
                const py = chartGeom.yScale(yt);
                return (
                  <g key={`y-${yt}`}>
                    <line
                      x1={chartGeom.pad.left}
                      y1={py}
                      x2={chartGeom.width - chartGeom.pad.right}
                      y2={py}
                      stroke="#E2E8F0"
                      strokeWidth="1"
                    />
                    <text
                      x={chartGeom.pad.left - 10}
                      y={py + 4}
                      textAnchor="end"
                      className="fill-slate-600 text-[11px] font-mono"
                    >
                      {yt.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {chartGeom.xVals.map((xv) => {
                const px = chartGeom.xScale(xv);
                const isActiveTick = activeX !== null && Math.abs(activeX - xv) < 1e-6;
                return (
                  <g key={`x-${xv}`}>
                    <line
                      x1={px}
                      y1={chartGeom.pad.top}
                      x2={px}
                      y2={chartGeom.height - chartGeom.pad.bottom}
                      stroke={isActiveTick ? '#94A3B8' : '#F1F5F9'}
                      strokeWidth={isActiveTick ? '1.25' : '1'}
                    />
                    <text
                      x={px}
                      y={chartGeom.height - chartGeom.pad.bottom + 18}
                      textAnchor="middle"
                      className={`text-[11px] font-mono ${
                        isActiveTick ? 'fill-[#0B5D1E] font-bold' : 'fill-slate-600'
                      }`}
                    >
                      {xv}
                    </text>
                  </g>
                );
              })}

              {/* Axes */}
              <line
                x1={chartGeom.pad.left}
                y1={chartGeom.pad.top}
                x2={chartGeom.pad.left}
                y2={chartGeom.height - chartGeom.pad.bottom}
                stroke="#475569"
                strokeWidth="1.5"
              />
              <line
                x1={chartGeom.pad.left}
                y1={chartGeom.height - chartGeom.pad.bottom}
                x2={chartGeom.width - chartGeom.pad.right}
                y2={chartGeom.height - chartGeom.pad.bottom}
                stroke="#475569"
                strokeWidth="1.5"
              />

              {/* Axis Labels */}
              <text
                x={chartGeom.pad.left + chartGeom.plotW / 2}
                y={chartGeom.height - 8}
                textAnchor="middle"
                className="fill-slate-700 text-[12px] font-medium"
              >
                Vancomycin concentration (mg/L)
              </text>
              <text
                x={18}
                y={chartGeom.pad.top + chartGeom.plotH / 2}
                textAnchor="middle"
                transform={`rotate(-90 18 ${chartGeom.pad.top + chartGeom.plotH / 2})`}
                className="fill-slate-700 text-[12px] font-medium"
              >
                log10(CFU/mL)
              </text>

              {/* Focused Curve AUC Area Shading */}
              {focusedSeriesKey &&
                (() => {
                  const fs = visibleOverlaySeries.find((s) => s.key === focusedSeriesKey);
                  if (!fs || fs.points.length < 2) return null;
                  const sorted = [...fs.points].sort((a, b) => a.x - b.x);
                  const baseY = chartGeom.yScale(chartGeom.minY);
                  const polyPts = [
                    ...sorted.map((pt) => `${chartGeom.xScale(pt.x)},${chartGeom.yScale(pt.y)}`),
                    `${chartGeom.xScale(sorted[sorted.length - 1].x)},${baseY}`,
                    `${chartGeom.xScale(sorted[0].x)},${baseY}`,
                  ].join(' ');
                  return <polygon points={polyPts} fill={fs.color} fillOpacity={0.12} />;
                })()}

              {/* Crosshair */}
              {activeX !== null && (
                <line
                  x1={chartGeom.xScale(activeX)}
                  y1={chartGeom.pad.top}
                  x2={chartGeom.xScale(activeX)}
                  y2={chartGeom.height - chartGeom.pad.bottom}
                  stroke={pinnedX !== null ? '#0B5D1E' : '#94A3B8'}
                  strokeWidth={pinnedX !== null ? '1.5' : '1.1'}
                  strokeDasharray={pinnedX !== null ? undefined : '3 3'}
                />
              )}

              {/* Plotted Curves */}
              {visibleOverlaySeries.map((s) => {
                if (s.points.length === 0) return null;
                const sorted = [...s.points].sort((a, b) => a.x - b.x);
                const pathD = sorted
                  .map(
                    (pt, i) =>
                      `${i === 0 ? 'M' : 'L'} ${chartGeom.xScale(pt.x).toFixed(2)} ${chartGeom.yScale(pt.y).toFixed(2)}`
                  )
                  .join(' ');
                const isFocused = focusedSeriesKey === s.key;
                const dimmed = focusedSeriesKey !== null && !isFocused;
                return (
                  <g
                    key={s.key}
                    opacity={dimmed ? 0.22 : s.isStale ? 0.65 : 0.96}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedSeriesKey((prev) => (prev === s.key ? null : s.key));
                    }}
                  >
                    <path
                      d={pathD}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={isFocused ? 3.4 : s.strainRole === 'REFERENCE_MU3' ? 2.2 : 2.5}
                      strokeDasharray={s.dashed ? '6 4' : undefined}
                    />
                    {sorted.map((pt) => {
                      const cx = chartGeom.xScale(pt.x);
                      const cy = chartGeom.yScale(pt.y);
                      const isActive = activeX !== null && Math.abs(activeX - pt.x) < 1e-6;
                      return (
                        <circle
                          key={`${s.key}-${pt.x}`}
                          cx={cx}
                          cy={cy}
                          r={isActive ? 5.8 : isFocused ? 4.5 : 3.5}
                          fill={s.strainRole === 'REFERENCE_MU3' ? '#FFFFFF' : s.color}
                          stroke={s.color}
                          strokeWidth="2"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Floating SVG Tooltip Card at Active Concentration */}
              {activeX !== null &&
                visibleOverlaySeries.length > 0 &&
                (() => {
                  const entries = visibleOverlaySeries
                    .map((s) => {
                      const pt = s.points.find((p) => Math.abs(p.x - activeX) < 1e-6);
                      return pt ? { series: s, y: pt.y } : null;
                    })
                    .filter((item): item is NonNullable<typeof item> => item !== null)
                    .slice(0, 6);
                  if (entries.length === 0) return null;
                  const cx = chartGeom.xScale(activeX);
                  const boxW = 244;
                  const lineH = 16;
                  const boxH = 26 + entries.length * lineH;
                  const placeLeft = cx + 14 + boxW > chartGeom.width - chartGeom.pad.right;
                  const boxX = placeLeft
                    ? Math.max(chartGeom.pad.left + 4, cx - boxW - 12)
                    : cx + 12;
                  const boxY = chartGeom.pad.top + 6;
                  return (
                    <g className="pointer-events-none">
                      <rect
                        x={boxX}
                        y={boxY}
                        width={boxW}
                        height={boxH}
                        rx={4}
                        fill="#FFFFFF"
                        fillOpacity={0.96}
                        stroke={pinnedX !== null ? '#0B5D1E' : '#CBD5E1'}
                        strokeWidth={pinnedX !== null ? 1.5 : 1}
                      />
                      <text
                        x={boxX + 9}
                        y={boxY + 15}
                        className="fill-[#222B33] text-[10px] font-mono font-bold"
                      >
                        {pinnedX !== null ? 'Pinned' : 'Probe'} @ {activeX} mg/L
                      </text>
                      {entries.map((entry, idx) => {
                        const ty = boxY + 30 + idx * lineH;
                        return (
                          <g key={`comp-tt-${entry.series.key}`}>
                            <circle
                              cx={boxX + 12}
                              cy={ty - 3.5}
                              r={3.2}
                              fill={entry.series.color}
                            />
                            <text
                              x={boxX + 20}
                              y={ty}
                              className="fill-slate-800 text-[10px] font-mono"
                            >
                              {entry.series.runId}·{entry.series.strainId}: {entry.y.toFixed(3)}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
            </svg>

            {/* Hover / Pinned Probe Readout Bar */}
            {activeX !== null && (
              <div className="bg-slate-50 border border-slate-200 rounded px-3.5 py-2 text-xs flex flex-wrap items-center gap-x-5 gap-y-1">
                <span className="font-mono font-semibold text-[#222B33]">
                  {pinnedX !== null ? 'Pinned' : 'Probe'} @ {activeX} mg/L:
                </span>
                {visibleOverlaySeries.map((s) => {
                  const pt = s.points.find((p) => Math.abs(p.x - activeX) < 1e-6);
                  return (
                    <span key={`probe-${s.key}`} className="inline-flex items-center gap-1.5 font-mono">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-slate-700">
                        {s.runId}·{s.strainId}:
                      </span>
                      <strong className="text-slate-900">
                        {pt ? pt.y.toFixed(3) : 'excluded/missing'}
                      </strong>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Interactive Legend (Click to Focus/Shade AUC, Eye to Hide/Show) */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
              {overlaySeries.map((s) => {
                const isHidden = hiddenSeriesKeys.includes(s.key);
                const isFocused = focusedSeriesKey === s.key;
                return (
                  <div
                    key={`leg-${s.key}`}
                    className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 transition-colors ${
                      isHidden
                        ? 'border-slate-200 bg-slate-50 text-slate-400'
                        : isFocused
                        ? 'border-[#0B5D1E] bg-emerald-50/70 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        !isHidden &&
                        setFocusedSeriesKey((prev) => (prev === s.key ? null : s.key))
                      }
                      title="Click to focus curve & shade AUC"
                      className="inline-flex items-center gap-2 cursor-pointer"
                    >
                      <svg width="20" height="10" aria-hidden="true">
                        <line
                          x1="0"
                          y1="5"
                          x2="20"
                          y2="5"
                          stroke={isHidden ? '#CBD5E1' : s.color}
                          strokeWidth="2.5"
                          strokeDasharray={s.dashed ? '4 2' : undefined}
                        />
                      </svg>
                      <span className={`font-mono font-medium ${isHidden ? 'line-through' : ''}`}>
                        {s.runId} · {s.strainId}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        ({s.strainRole === 'REFERENCE_MU3' ? 'Mu3 Ref' : `Ratio ${s.ratio?.toFixed(3) ?? '—'}`})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSeriesVisibility(s.key)}
                      title={isHidden ? 'Show curve' : 'Hide curve'}
                      className="ml-1 text-slate-400 hover:text-slate-800 cursor-pointer"
                    >
                      {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Individual Isolate AUC Values & Same-Run Mu3 Ratios Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#222B33]">
              {t('compTableTitle')} ({isolateRows.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('mu3BaselineNote')}
              {meanSelectedRatio !== null && (
                <span className="font-mono text-slate-700 ml-1">
                  · Mean = {meanSelectedRatio.toFixed(3)}
                </span>
              )}
            </p>
          </div>
        </div>

        {isolateRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">—</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                  <th className="py-2.5 px-3">{t('colRunId')}</th>
                  <th className="py-2.5 px-3">{t('colDate')}</th>
                  <th className="py-2.5 px-3">{t('colMethod')}</th>
                  <th className="py-2.5 px-3">{t('colStrainId')}</th>
                  <th className="py-2.5 px-3 text-right">{t('testAucLabel')}</th>
                  <th className="py-2.5 px-3 text-right">{t('mu3AucLabel')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colRatio')}</th>
                  <th className="py-2.5 px-3 text-right">Δ</th>
                  <th className="py-2.5 px-3">{t('colBand')}</th>
                  <th className="py-2.5 px-3">{t('colStatus')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isolateRows.map((row) => {
                  const deltaMean =
                    row.papAucRatio !== null && meanSelectedRatio !== null
                      ? row.papAucRatio - meanSelectedRatio
                      : null;
                  return (
                    <tr key={row.rowKey} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#222B33] whitespace-nowrap">
                        <div>{row.runId}</div>
                        {row.isSyntheticDemo && (
                          <div className="text-[10px] font-sans font-semibold text-amber-800">
                            SYNTHETIC DEMO
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.experimentDate}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-medium">{row.protocolName}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          v{row.protocolVersion} · {row.zeroColonyPolicy} · {row.expectedReplicates} rep
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {row.strainId}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {row.testAuc !== null ? row.testAuc.toFixed(3) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#0B5D1E]">
                        {row.mu3Auc !== null ? row.mu3Auc.toFixed(3) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#222B33]">
                        {row.papAucRatio !== null ? row.papAucRatio.toFixed(3) : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {deltaMean !== null
                          ? `${deltaMean >= 0 ? '+' : ''}${deltaMean.toFixed(3)}`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <InterpretationBandIndicator
                          band={row.interpretationBand}
                          label={row.interpretationLabel}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <ExperimentStatusLabel status={row.runStatus} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenRun(row.experimentId)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0B5D1E] border border-slate-300 bg-white hover:bg-slate-50 rounded cursor-pointer whitespace-nowrap"
                        >
                          <span>Run</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Run-to-Run Differences & Repeated Isolate Variance */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-[#0B5D1E]" />
          <div>
            <h2 className="text-base font-semibold text-[#222B33]">
              Differences Between Experimental Runs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compares protocol parameters, same-run Mu3 control AUC baselines (vs. {effectiveBaselineRun?.experiment.runId ?? 'baseline'}), and replicate/cross-run isolate variance.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                <th className="py-2.5 px-3">Run ID</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Protocol &amp; Concentration Grid</th>
                <th className="py-2.5 px-3">Zero-Colony &amp; Replicates</th>
                <th className="py-2.5 px-3 text-right">Mu3 AUC</th>
                <th className="py-2.5 px-3 text-right">Δ Mu3 vs. Baseline</th>
                <th className="py-2.5 px-3 text-right">Test Ratio Range</th>
                <th className="py-2.5 px-3">QA &amp; Run Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeRuns.map((run) => {
                const calc = run.latestCalculation;
                const mu3Auc = calc?.results.mu3Auc ?? null;
                const deltaMu3 =
                  mu3Auc !== null && baseMu3Auc !== null ? mu3Auc - baseMu3Auc : null;
                const ratios = (calc?.results.testProfiles ?? [])
                  .map((t) => t.papAucRatio)
                  .filter((v): v is number => v !== null);
                const isBase = run.experiment.id === effectiveBaselineRun?.experiment.id;
                const blocking = run.qaFlags.filter((f) => f.severity === 'BLOCKING').length;
                const warning = run.qaFlags.filter((f) => f.severity === 'WARNING').length;

                return (
                  <tr key={`diff-${run.experiment.id}`} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#222B33] whitespace-nowrap">
                      <div>{run.experiment.runId}</div>
                      {isBase && (
                        <div className="text-[10px] font-sans font-semibold text-[#0B5D1E]">
                          BASELINE RUN
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {run.experiment.experimentDate}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">
                        {run.protocol.name} (v{run.protocol.version})
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        [{run.protocol.concentrationGrid.join(', ')}] mg/L
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      <div>{calc?.results.zeroColonyPolicy ?? run.protocol.zeroColonyPolicy}</div>
                      <div className="text-[11px] text-slate-500">
                        {run.protocol.expectedReplicates} replicate(s) · {run.observationCount} rows
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#0B5D1E]">
                      {mu3Auc !== null ? mu3Auc.toFixed(3) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {isBase
                        ? '0.000 (base)'
                        : deltaMu3 !== null
                        ? `${deltaMu3 >= 0 ? '+' : ''}${deltaMu3.toFixed(3)}`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {ratios.length > 0
                        ? `${Math.min(...ratios).toFixed(3)} – ${Math.max(...ratios).toFixed(3)}`
                        : 'Not calculated'}
                    </td>
                    <td className="py-2.5 px-3">
                      <ExperimentStatusLabel status={run.experiment.status} />
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {blocking} RED · {warning} AMBER
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cross-Run Repeated Isolate Deltas */}
        {crossRunIsolateDeltas.length > 0 && (
          <div className="border-t border-slate-200 p-5 space-y-3 bg-slate-50/50">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Repeated Isolate Variance Across Selected Runs ({crossRunIsolateDeltas.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Isolates measured in more than one run, highlighting inter-run AUC and PAP-AUC ratio shifts.
              </p>
            </div>

            <div className="overflow-x-auto bg-white border border-slate-200 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                    <th className="py-2 px-3">Isolate ID</th>
                    <th className="py-2 px-3">Runs Compared</th>
                    <th className="py-2 px-3 text-right">Test AUC Range</th>
                    <th className="py-2 px-3 text-right">Δ Test AUC</th>
                    <th className="py-2 px-3 text-right">PAP-AUC Ratio Range</th>
                    <th className="py-2 px-3 text-right">Δ Ratio</th>
                    <th className="py-2 px-3">Protocol / Method Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {crossRunIsolateDeltas.map((item) => (
                    <tr key={`rep-delta-${item.strainId}`}>
                      <td className="py-2 px-3 font-mono font-semibold text-[#222B33]">
                        {item.strainId}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {item.entries.map((e) => `${e.runId} (${e.papAucRatio?.toFixed(3) ?? '—'})`).join(' · ')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {item.minAuc !== null && item.maxAuc !== null
                          ? `${item.minAuc.toFixed(3)} – ${item.maxAuc.toFixed(3)}`
                          : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                        {item.deltaAuc !== null ? item.deltaAuc.toFixed(3) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {item.minRatio !== null && item.maxRatio !== null
                          ? `${item.minRatio.toFixed(3)} – ${item.maxRatio.toFixed(3)}`
                          : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-[#0B5D1E]">
                        {item.deltaRatio !== null ? item.deltaRatio.toFixed(3) : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.protocolSpread}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

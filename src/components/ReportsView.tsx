import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, FileText, Printer, Volume2, VolumeX } from 'lucide-react';
import { api } from '../lib/api.ts';
import { COMMUNITY_HEALTH_CARDS } from '../lib/communityHealthContent.ts';
import { useI18n } from '../lib/i18n.tsx';
import {
  computeObservationMetrics,
  serializeDerivedObservationsCsv,
  serializeObservationsCsv,
} from '../lib/papAucEngine.ts';
import { generatePapAucPdfReport } from '../lib/pdfReport.ts';
import type { ExperimentDetail, StrainProfileResult, UserRole } from '../types/hvisa.ts';
import { PapCurveChart } from './PapCurveChart.tsx';
import {
  ExperimentStatusLabel,
  InterpretationBandIndicator,
  QaSeverityLabel,
} from './StatusIndicator.tsx';

interface ReportsViewProps {
  detail: ExperimentDetail | null;
  loading: boolean;
  role: UserRole;
}

function PapRatioBarGraph({
  testProfiles,
  mu3Auc,
  lowerThreshold,
  upperThreshold,
  selectedStrainId = null,
  onSelectStrain,
}: {
  testProfiles: StrainProfileResult[];
  mu3Auc: number | null;
  lowerThreshold: number;
  upperThreshold: number;
  selectedStrainId?: string | null;
  onSelectStrain?: (strainId: string | null) => void;
}) {
  const { t } = useI18n();
  const [hoveredStrainId, setHoveredStrainId] = useState<string | null>(null);
  const [sortByRatio, setSortByRatio] = useState(false);

  const baseRows = testProfiles.filter((tp) => tp.papAucRatio !== null);
  if (baseRows.length === 0) return null;

  const rows = sortByRatio
    ? [...baseRows].sort((a, b) => (b.papAucRatio ?? 0) - (a.papAucRatio ?? 0))
    : baseRows;

  const activeStrainId = hoveredStrainId ?? selectedStrainId;
  const activeProfile = activeStrainId
    ? rows.find((r) => r.strainId === activeStrainId) ?? null
    : null;

  const maxVal = Math.max(
    1.5,
    upperThreshold + 0.25,
    ...rows.map((r) => (r.papAucRatio ?? 0) + 0.15)
  );
  const svgW = 680;
  const padL = 130;
  const padR = 54;
  const padT = 26;
  const padB = 34;
  const rowH = 36;
  const chartW = svgW - padL - padR;
  const svgH = padT + rows.length * rowH + padB;
  const xScale = (val: number) => padL + (Math.min(Math.max(val, 0), maxVal) / maxVal) * chartW;

  const xLower = xScale(lowerThreshold);
  const xUpper = xScale(upperThreshold);
  const xMu3 = xScale(1.0);

  const hoveredRowIndex = hoveredStrainId
    ? rows.findIndex((r) => r.strainId === hoveredStrainId)
    : -1;
  const hoveredProfile = hoveredRowIndex >= 0 ? rows[hoveredRowIndex] : null;

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-[#222B33]">{t('ratioChartTitle')}</h4>
          <p className="text-[11px] text-slate-600 mt-0.5">{t('ratioChartSub')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 inline-block rounded-sm bg-amber-100 border border-amber-400" />
            <span>{t('hvisaRangeLabel')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 inline-block bg-slate-800" />
            <span>{t('mu3RefLineLabel')}</span>
          </span>
          <button
            type="button"
            onClick={() => setSortByRatio((s) => !s)}
            className="no-print px-2 py-0.5 text-[11px] font-medium rounded border border-slate-300 bg-[#FAF8F3] hover:bg-slate-100 text-slate-800 cursor-pointer"
          >
            {sortByRatio ? 'Order: Ratio ↓' : 'Order: Run Default'}
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label={t('ratioChartTitle')}
        onMouseLeave={() => setHoveredStrainId(null)}
      >
        {/* Shaded hVISA range band */}
        <rect
          x={xLower}
          y={padT}
          width={Math.max(2, xUpper - xLower)}
          height={rows.length * rowH}
          fill="#FFF3DC"
          opacity={0.75}
        />

        {/* Grid ticks */}
        {[0, 0.5, lowerThreshold, 1.0, upperThreshold, 1.5].map((tick, idx) => {
          if (tick > maxVal) return null;
          const x = xScale(tick);
          const isRef = tick === 1.0;
          return (
            <g key={`${tick}-${idx}`}>
              <line
                x1={x}
                y1={padT}
                x2={x}
                y2={padT + rows.length * rowH}
                stroke={isRef ? '#222B33' : '#E6E2D8'}
                strokeWidth={isRef ? 1.5 : 1}
                strokeDasharray={isRef ? '4 3' : undefined}
              />
              <text
                x={x}
                y={padT + rows.length * rowH + 16}
                textAnchor="middle"
                className="fill-[#222B33] font-mono text-[10px]"
              >
                {tick.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Isolate Bars */}
        {rows.map((tp, idx) => {
          const ratio = tp.papAucRatio ?? 0;
          const y = padT + idx * rowH;
          const barW = Math.max(4, xScale(ratio) - padL);
          const isSelected = selectedStrainId === tp.strainId;
          const isHovered = hoveredStrainId === tp.strainId;
          const fill =
            tp.interpretationBand === 'EXPERT_REVIEW_VISA_RANGE'
              ? '#B3261E'
              : tp.interpretationBand === 'COMPATIBLE_HVISA'
              ? '#FF9933'
              : '#0B5D1E';
          return (
            <g
              key={tp.strainId}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredStrainId(tp.strainId)}
              onClick={() => {
                if (onSelectStrain) {
                  onSelectStrain(isSelected ? null : tp.strainId);
                }
              }}
            >
              {/* Hover / Selected subtle row highlight */}
              <rect
                x={0}
                y={y + 1}
                width={svgW}
                height={rowH - 2}
                rx={3}
                fill={isSelected ? '#ECFDF5' : isHovered ? '#F8FAFC' : 'transparent'}
              />
              <text
                x={padL - 10}
                y={y + rowH / 2 + 4}
                textAnchor="end"
                className={`font-mono text-[11px] font-semibold ${
                  isSelected ? 'fill-[#0B5D1E]' : 'fill-[#222B33]'
                }`}
              >
                {tp.strainId}
              </text>
              <rect
                x={padL}
                y={y + 6}
                width={barW}
                height={rowH - 12}
                rx={3}
                fill={fill}
                stroke={isSelected || isHovered ? '#222B33' : 'none'}
                strokeWidth={isSelected ? 2 : 1.25}
              />
              {isHovered && (
                <line
                  x1={padL + barW}
                  y1={padT}
                  x2={padL + barW}
                  y2={padT + rows.length * rowH}
                  stroke="#222B33"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              )}
              <text
                x={padL + barW + 6}
                y={y + rowH / 2 + 4}
                className="fill-[#222B33] font-mono text-[11px] font-bold"
              >
                {ratio.toFixed(3)}
              </text>
            </g>
          );
        })}

        {/* Mu3 benchmark top label */}
        <text
          x={xMu3}
          y={padT - 8}
          textAnchor="middle"
          className="fill-[#222B33] font-mono text-[10px] font-semibold"
        >
          Mu3 = 1.000{mu3Auc !== null ? ` (${mu3Auc.toFixed(2)})` : ''}
        </text>

        {/* Floating SVG Tooltip for hovered isolate */}
        {hoveredProfile && hoveredProfile.papAucRatio !== null && (
          <g className="pointer-events-none">
            {(() => {
              const tipW = 205;
              const tipH = 54;
              const ratioX = xScale(hoveredProfile.papAucRatio);
              const tipX = Math.min(svgW - tipW - 6, Math.max(padL + 4, ratioX - tipW / 2));
              const rowY = padT + hoveredRowIndex * rowH;
              const tipY = rowY - tipH - 4 >= 4 ? rowY - tipH - 4 : rowY + rowH + 4;
              const delta = hoveredProfile.papAucRatio - 1.0;
              return (
                <>
                  <rect
                    x={tipX}
                    y={tipY}
                    width={tipW}
                    height={tipH}
                    rx={4}
                    fill="#222B33"
                    fillOpacity={0.95}
                  />
                  <text
                    x={tipX + 9}
                    y={tipY + 15}
                    className="fill-white font-mono text-[10px] font-bold"
                  >
                    {hoveredProfile.strainId} · Ratio {hoveredProfile.papAucRatio.toFixed(3)} ({delta >= 0 ? '+' : ''}
                    {delta.toFixed(3)})
                  </text>
                  <text x={tipX + 9} y={tipY + 30} className="fill-slate-200 font-mono text-[10px]">
                    Test AUC: {hoveredProfile.auc?.toFixed(2) ?? '—'} · Mu3:{' '}
                    {mu3Auc?.toFixed(2) ?? '—'}
                  </text>
                  <text x={tipX + 9} y={tipY + 45} className="fill-[#FF9933] text-[10px] font-medium">
                    {hoveredProfile.interpretationLabel}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {activeProfile && activeProfile.papAucRatio !== null && (
        <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded bg-[#FAF8F3] border border-slate-200 px-3 py-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[#222B33]">
            <span className="font-bold text-[#0B5D1E]">{activeProfile.strainId}</span>
            <span>
              Ratio: <strong>{activeProfile.papAucRatio.toFixed(4)}</strong>
            </span>
            <span>Test AUC: {activeProfile.auc?.toFixed(3) ?? '—'}</span>
            <span>Mu3 AUC: {mu3Auc?.toFixed(3) ?? '—'}</span>
            <span>
              Δ vs Mu3:{' '}
              {activeProfile.papAucRatio - 1.0 >= 0 ? '+' : ''}
              {(activeProfile.papAucRatio - 1.0).toFixed(3)}
            </span>
          </div>
          {selectedStrainId && onSelectStrain && (
            <button
              type="button"
              onClick={() => onSelectStrain(null)}
              className="text-[11px] font-semibold text-[#0B5D1E] hover:underline cursor-pointer"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ReportsView({ detail, loading, role }: ReportsViewProps) {
  const { lang, t } = useI18n();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );
  const [reportFormat, setReportFormat] = useState<'simple' | 'full'>('simple');
  const [communitySummary, setCommunitySummary] = useState<string>('');
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [selectedReportStrain, setSelectedReportStrain] = useState<string | null>(null);

  const expId = detail?.experiment.id ?? null;

  useEffect(() => {
    setSelectedReportStrain(null);
  }, [expId]);

  useEffect(() => {
    if (!expId) return;
    let active = true;
    setLoadingCommunity(true);
    api
      .getCommunitySummary(role, expId, lang)
      .then((res) => {
        if (active) setCommunitySummary(res.summary);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingCommunity(false);
      });
    return () => {
      active = false;
    };
  }, [expId, lang, role]);

  const handleToggleAudio = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
    utt.rate = 0.92;
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };

  if (loading || !detail) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-600">
        {loading ? '...' : '—'}
      </div>
    );
  }

  const {
    experiment,
    protocol,
    referenceStrain,
    observations,
    latestCalculation,
    qaFlags,
    reviews,
  } = detail;

  const isStale =
    experiment.status === 'CALCULATION_INVALIDATED' ||
    (latestCalculation !== null && !latestCalculation.isValid);

  const handleExportRawCsv = () => {
    const csv = serializeObservationsCsv(observations, experiment.runId);
    downloadTextFile(`${experiment.runId}_raw_observations.csv`, csv, 'text/csv;charset=utf-8;');
  };

  const handleExportDerivedCsv = () => {
    const csv = serializeDerivedObservationsCsv(
      observations,
      latestCalculation?.results.observationDerived ?? [],
      {
        runId: experiment.runId,
        protocolName: latestCalculation?.results.protocolName ?? protocol.name,
        protocolVersion: latestCalculation?.results.protocolVersion ?? protocol.version,
        zeroColonyPolicy: latestCalculation?.results.zeroColonyPolicy ?? protocol.zeroColonyPolicy,
        calculationVersion: latestCalculation?.calculationVersion ?? 'PREVIEW_UNSAVED',
        calculatedAt: latestCalculation?.calculatedAt ?? '',
        isSyntheticDemo: experiment.isSyntheticDemo,
      }
    );
    downloadTextFile(
      `${experiment.runId}_derived_observations.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportSummaryCsv = () => {
    if (!latestCalculation) return;
    const header = [
      'run_id',
      'data_origin',
      'protocol_name',
      'protocol_version',
      'calculation_version',
      'calculated_at',
      'strain_id',
      'strain_role',
      'auc',
      'mu3_auc',
      'pap_auc_ratio',
      'interpretation_band',
      'interpretation_label',
    ].join(',');

    const allProfiles = [
      ...(latestCalculation.results.referenceProfile
        ? [latestCalculation.results.referenceProfile]
        : []),
      ...latestCalculation.results.testProfiles,
    ];

    const lines = allProfiles.map((p) =>
      [
        experiment.runId,
        experiment.isSyntheticDemo ? 'SYNTHETIC_DEMO_NOT_REAL_LAB_DATA' : 'LAB_RUN',
        `"${protocol.name.replace(/"/g, '""')}"`,
        protocol.version,
        latestCalculation.calculationVersion,
        latestCalculation.calculatedAt,
        p.strainId,
        p.strainRole,
        p.auc?.toFixed(4) ?? '',
        latestCalculation.results.mu3Auc?.toFixed(4) ?? '',
        p.papAucRatio !== null ? p.papAucRatio.toFixed(4) : '',
        p.interpretationBand,
        `"${p.interpretationLabel.replace(/"/g, '""')}"`,
      ].join(',')
    );

    downloadTextFile(
      `${experiment.runId}_pap_auc_summary.csv`,
      [header, ...lines].join('\n'),
      'text/csv;charset=utf-8;'
    );
  };

  const handleDownloadPdf = async () => {
    setPdfNotice(null);
    if (lang !== 'en') {
      // Native browser print preserves Devanagari, Odia, and Santali Unicode scripts cleanly in PDF
      window.print();
      return;
    }
    setGeneratingPdf(true);
    try {
      const svgEl = chartContainerRef.current?.querySelector('svg') ?? null;
      await generatePapAucPdfReport(detail, svgEl);
      setPdfNotice({
        type: 'success',
        text: `Downloaded ${experiment.runId}_PAP_AUC_Report.pdf.`,
      });
    } catch (err) {
      setPdfNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'PDF export failed.',
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 print-container">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222B33] tracking-tight">
            {t('reportTitle')}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">{t('reportSubtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-md"
            role="group"
            aria-label="Report format switcher"
          >
            <button
              type="button"
              onClick={() => setReportFormat('simple')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
                reportFormat === 'simple'
                  ? 'bg-white text-[#222B33] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('reportTabSimple')}
            </button>
            <button
              type="button"
              onClick={() => setReportFormat('full')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
                reportFormat === 'full'
                  ? 'bg-white text-[#222B33] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('reportTabFull')}
            </button>
          </div>

          <button
            type="button"
            disabled={observations.length === 0}
            onClick={handleExportRawCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-45 text-slate-800 rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportRawCsv')}</span>
          </button>
          <button
            type="button"
            disabled={observations.length === 0}
            onClick={handleExportDerivedCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-45 text-slate-800 rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportDerivedCsv')}</span>
          </button>
          <button
            type="button"
            disabled={!latestCalculation}
            onClick={handleExportSummaryCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-45 text-slate-800 rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportSummaryCsv')}</span>
          </button>
          <button
            type="button"
            disabled={generatingPdf}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0B5D1E] hover:bg-[#094a17] disabled:opacity-45 text-white rounded cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{generatingPdf ? '...' : t('downloadPdfBtn')}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#222B33] hover:bg-slate-800 text-white rounded cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('printReportBtn')}</span>
          </button>
        </div>
      </div>

      {pdfNotice && (
        <div
          className={`no-print px-4 py-3 rounded-lg border text-xs ${
            pdfNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {pdfNotice.text}
        </div>
      )}

      {reportFormat === 'simple' ? (
        <article className="bg-white border border-slate-200 rounded-lg p-8 space-y-6">
          <header className="border-b border-slate-200 pb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('reportSimpleHeader')}
              </div>
              <h2 className="text-xl font-bold text-[#222B33] mt-1 font-mono">
                {experiment.runId} · {experiment.experimentDate}
              </h2>
              <div className="mt-2">
                <ExperimentStatusLabel status={experiment.status} />
              </div>
            </div>
            <div className="no-print">
              <button
                type="button"
                disabled={!communitySummary}
                onClick={() => handleToggleAudio(communitySummary)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 rounded cursor-pointer"
              >
                {speaking ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-700" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#0B5D1E]" />
                )}
                <span>{speaking ? t('stopAudioBtn') : t('listenAudioBtn')}</span>
              </button>
            </div>
          </header>

          {experiment.isSyntheticDemo && (
            <div className="bg-[#FEF9EE] border border-[#E5D5B5] rounded px-4 py-2.5 text-xs font-semibold text-amber-900">
              {t('reportSyntheticBanner')}
            </div>
          )}

          <section className="bg-[#FAF8F3] border border-slate-200 rounded-lg p-5 space-y-2">
            <h3 className="text-sm font-semibold text-[#222B33]">{t('runSummaryTitle')}</h3>
            <p className="text-sm text-slate-900 leading-relaxed">
              {loadingCommunity ? '...' : communitySummary}
            </p>
          </section>

          {latestCalculation ? (
            <section className="space-y-5 print-only-break">
              <div>
                <h3 className="text-sm font-semibold text-[#222B33]">
                  {t('reportGraphsTitle')}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">{t('reportGraphsSub')}</p>
              </div>

              <div ref={chartContainerRef} className="border border-slate-200 rounded-lg p-4 bg-white">
                <PapCurveChart
                  payload={latestCalculation.results}
                  height={290}
                  selectedAucStrainId={selectedReportStrain}
                  onSelectAucStrain={setSelectedReportStrain}
                />
              </div>

              <PapRatioBarGraph
                testProfiles={latestCalculation.results.testProfiles}
                mu3Auc={latestCalculation.results.mu3Auc}
                lowerThreshold={latestCalculation.results.hvisaLowerThreshold}
                upperThreshold={latestCalculation.results.visaUpperThreshold}
                selectedStrainId={selectedReportStrain}
                onSelectStrain={setSelectedReportStrain}
              />

              <h3 className="text-sm font-semibold text-[#222B33] pt-1">
                {t('reportAucTableTitle')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                      <th className="py-2.5 px-3">{t('colStrainId')}</th>
                      <th className="py-2.5 px-3 text-right">{t('colRatio')}</th>
                      <th className="py-2.5 px-3">{t('colBand')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {latestCalculation.results.testProfiles.map((tp) => (
                      <tr key={tp.strainId}>
                        <td className="py-2.5 px-3 font-mono font-semibold">{tp.strainId}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                          {tp.papAucRatio !== null ? tp.papAucRatio.toFixed(3) : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <InterpretationBandIndicator
                            band={tp.interpretationBand}
                            label={tp.interpretationLabel}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="border border-slate-200 rounded p-5 text-xs text-slate-600">
              {t('bandNotCalc')}
            </section>
          )}

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 print-only-break">
            {COMMUNITY_HEALTH_CARDS.map((card) => {
              const cardContent = card.translations[lang] ?? card.translations.en;
              return (
                <div key={card.id} className="border border-slate-200 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-bold text-[#222B33]">{cardContent.title}</h4>
                  <p className="text-xs text-slate-700">{cardContent.summary}</p>
                  <ul className="text-xs text-slate-800 space-y-1 list-disc list-inside pt-1">
                    {cardContent.actionSteps.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

          <footer className="border-t border-slate-200 pt-4 text-xs text-slate-600">
            {t('reportSimpleDisclaimer')}
          </footer>
        </article>
      ) : (
        <article className="bg-white border border-slate-200 rounded-lg p-8 space-y-7">
          <header className="border-b border-slate-200 pb-5 space-y-3">
            {experiment.isSyntheticDemo && (
              <div className="bg-[#FEF9EE] border border-[#E5D5B5] rounded px-4 py-2.5 text-xs font-semibold text-amber-900">
                {t('reportSyntheticBanner')}
              </div>
            )}

            {isStale && (
              <div className="bg-rose-50 border border-rose-200 rounded px-4 py-2.5 text-xs font-semibold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{t('reportInvalidBanner')}</span>
              </div>
            )}

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t('reportHeaderLabel')}
                </div>
                <h2 className="text-xl font-bold text-[#222B33] mt-1 font-mono">
                  {experiment.runId}
                </h2>
              </div>
              <div className="text-right text-xs text-slate-600 space-y-1">
                <div>
                  <ExperimentStatusLabel status={experiment.status} />
                </div>
                <div className="font-mono">
                  {t('colDate')}: {experiment.experimentDate}
                </div>
              </div>
            </div>
          </header>

          {/* Metadata & Protocol Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs print-only-break">
            <div className="border border-slate-200 rounded p-4 space-y-2">
              <h3 className="font-semibold uppercase tracking-wider text-slate-500 text-[11px]">
                {t('reportMetaTitle')}
              </h3>
              <dl className="grid grid-cols-2 gap-y-1.5">
                <dt className="text-slate-500">{t('colRunId')}:</dt>
                <dd className="font-mono font-semibold text-slate-900">{experiment.runId}</dd>
                <dt className="text-slate-500">{t('chwIdLabel')}:</dt>
                <dd className="font-mono text-slate-900">{experiment.analystId}</dd>
                <dt className="text-slate-500">{t('reportRefStrain')}:</dt>
                <dd className="text-slate-900">
                  {referenceStrain.strainCode} ({referenceStrain.atccNumber})
                </dd>
                <dt className="text-slate-500">{t('reportObsRows')}:</dt>
                <dd className="font-mono tabular-nums text-slate-900">{observations.length}</dd>
                <dt className="text-slate-500">{t('reportIncubation')}:</dt>
                <dd className="text-slate-800">{protocol.incubationConditions}</dd>
              </dl>
            </div>

            <div className="border border-slate-200 rounded p-4 space-y-2">
              <h3 className="font-semibold uppercase tracking-wider text-slate-500 text-[11px]">
                {t('reportProtoTitle')}
              </h3>
              <dl className="grid grid-cols-2 gap-y-1.5">
                <dt className="text-slate-500">{t('reportProtocol')}:</dt>
                <dd className="text-slate-900 font-medium">
                  {protocol.name} (v{protocol.version})
                </dd>
                <dt className="text-slate-500">{t('reportConcSeries')}:</dt>
                <dd className="font-mono text-slate-900">
                  [{protocol.concentrationGrid.join(', ')}] mg/L
                </dd>
                <dt className="text-slate-500">{t('reportZeroRule')}:</dt>
                <dd className="font-mono text-slate-900">{protocol.zeroColonyPolicy}</dd>
                <dt className="text-slate-500">{t('reportEngineVer')}:</dt>
                <dd className="font-mono text-slate-900">
                  {latestCalculation?.calculationVersion ?? '—'}
                </dd>
                <dt className="text-slate-500">{t('reportCalcTime')}:</dt>
                <dd className="font-mono text-slate-900">
                  {latestCalculation
                    ? new Date(latestCalculation.calculatedAt).toLocaleString()
                    : '—'}
                </dd>
              </dl>
            </div>
          </section>

          {/* Charts */}
          {latestCalculation ? (
            <section className="space-y-4 print-only-break">
              <div
                ref={chartContainerRef}
                className="border border-slate-200 rounded p-5"
              >
                <PapCurveChart
                  payload={latestCalculation.results}
                  height={300}
                  selectedAucStrainId={selectedReportStrain}
                  onSelectAucStrain={setSelectedReportStrain}
                />
              </div>
              <PapRatioBarGraph
                testProfiles={latestCalculation.results.testProfiles}
                mu3Auc={latestCalculation.results.mu3Auc}
                lowerThreshold={latestCalculation.results.hvisaLowerThreshold}
                upperThreshold={latestCalculation.results.visaUpperThreshold}
                selectedStrainId={selectedReportStrain}
                onSelectStrain={setSelectedReportStrain}
              />
            </section>
          ) : (
            <section className="border border-slate-200 rounded p-6 text-xs text-slate-600">
              {t('bandNotCalc')}
            </section>
          )}

          {/* AUC & Ratio Summary Table */}
          {latestCalculation && (
            <section className="space-y-3 print-only-break">
              <h3 className="text-sm font-semibold text-[#222B33]">
                {t('reportAucTableTitle')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                      <th className="py-2.5 px-3">{t('colStrainId')}</th>
                      <th className="py-2.5 px-3">{t('colRole')}</th>
                      <th className="py-2.5 px-3 text-right">{t('colAuc')}</th>
                      <th className="py-2.5 px-3 text-right">{t('colMu3Auc')}</th>
                      <th className="py-2.5 px-3 text-right">{t('colRatio')}</th>
                      <th className="py-2.5 px-3">{t('colBand')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {latestCalculation.results.referenceProfile && (
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-semibold">
                          {latestCalculation.results.referenceProfile.strainId}
                        </td>
                        <td className="py-2.5 px-3">{t('roleRefControl')}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {latestCalculation.results.referenceProfile.auc?.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">—</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">1.000</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {t('mu3BaselineNote')}
                        </td>
                      </tr>
                    )}
                    {latestCalculation.results.testProfiles.map((tp) => (
                      <tr key={tp.strainId}>
                        <td className="py-2.5 px-3 font-mono font-semibold">{tp.strainId}</td>
                        <td className="py-2.5 px-3">{t('roleTestIsolate')}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {tp.auc?.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {latestCalculation.results.mu3Auc?.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#222B33]">
                          {tp.papAucRatio !== null ? tp.papAucRatio.toFixed(3) : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3">
                          <InterpretationBandIndicator
                            band={tp.interpretationBand}
                            label={tp.interpretationLabel}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* QA Flags & Review Sign-off */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs print-only-break">
            <div className="border border-slate-200 rounded p-4 space-y-2">
              <h3 className="font-semibold uppercase tracking-wider text-slate-500 text-[11px]">
                {t('reportQaTitle')} ({qaFlags.length})
              </h3>
              {qaFlags.length === 0 ? (
                <p className="text-slate-500">{t('noQaFlags')}</p>
              ) : (
                <ul className="space-y-1.5">
                  {qaFlags.map((f) => (
                    <li key={f.id} className="space-y-0.5">
                      <QaSeverityLabel severity={f.severity} />
                      <div className="text-slate-700">{f.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-slate-200 rounded p-4 space-y-2">
              <h3 className="font-semibold uppercase tracking-wider text-slate-500 text-[11px]">
                {t('reportReviewTitle')} ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <p className="text-slate-500">{t('pendingReviewNote')}</p>
              ) : (
                <ul className="space-y-2">
                  {reviews.map((r) => (
                    <li key={r.id} className="border-b border-slate-100 pb-1.5 last:border-b-0">
                      <div className="font-semibold text-slate-800">
                        {r.decision} · <span className="font-mono">{r.reviewerId}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                      {r.comment && <p className="text-slate-700 mt-0.5">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Raw & Derived Observations Table */}
          <section className="space-y-3 print-only-break">
            <h3 className="text-sm font-semibold text-[#222B33]">
              {t('reportObsTableTitle')} ({observations.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                    <th className="py-2 px-3">{t('colStrainId')}</th>
                    <th className="py-2 px-3">{t('colRole')}</th>
                    <th className="py-2 px-3 text-right">{t('colConc')}</th>
                    <th className="py-2 px-3">{t('colRep')}</th>
                    <th className="py-2 px-3 text-right">{t('colDilution')}</th>
                    <th className="py-2 px-3 text-right">{t('colVol')}</th>
                    <th className="py-2 px-3 text-right">{t('colColonies')}</th>
                    <th className="py-2 px-3 text-right">CFU/mL</th>
                    <th className="py-2 px-3 text-right">log10(CFU/mL)</th>
                    <th className="py-2 px-3 text-right">{t('colCurveVal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {observations.map((obs) => {
                    const derived =
                      latestCalculation?.results.observationDerived.find(
                        (d) => d.observationId === obs.id
                      ) ?? computeObservationMetrics(obs, protocol.zeroColonyPolicy);
                    return (
                      <tr key={obs.id}>
                        <td className="py-2 px-3 font-mono font-semibold">{obs.strainId}</td>
                        <td className="py-2 px-3">
                          {obs.strainRole === 'REFERENCE_MU3'
                            ? t('roleRefControl')
                            : t('roleTestIsolate')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {obs.vancomycinConcentrationMgL}
                        </td>
                        <td className="py-2 px-3 font-mono">{obs.replicateId}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {obs.dilutionFraction}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {obs.platedVolumeMl}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {obs.colonyCount}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {derived.cfuPerMl !== null
                            ? derived.cfuPerMl.toLocaleString('en-US', { maximumFractionDigits: 0 })
                            : 'Invalid'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {derived.isZeroCensored
                            ? '0'
                            : derived.log10CfuPerMl !== null
                            ? derived.log10CfuPerMl.toFixed(3)
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                          {derived.effectiveLog10ForCurve !== null
                            ? derived.effectiveLog10ForCurve.toFixed(3)
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Limitations & Non-Clinical Disclaimer */}
          <footer className="border-t border-slate-200 pt-4 text-[11px] text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">{t('reportDisclaimerTitle')}</p>
            <p>{t('reportDisclaimer1')}</p>
            <p>{t('reportDisclaimer2')}</p>
          </footer>
        </article>
      )}
    </div>
  );
}

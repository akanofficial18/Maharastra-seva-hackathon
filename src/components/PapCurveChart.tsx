import { useMemo, useState } from 'react';
import { Eye, EyeOff, Layers, Maximize2, Pin, RotateCcw, X } from 'lucide-react';
import { useI18n } from '../lib/i18n.tsx';
import type {
  CalculationResultPayload,
  CurveConcentrationPoint,
  StrainProfileResult,
} from '../types/hvisa.ts';

interface PapCurveChartProps {
  payload: CalculationResultPayload;
  selectedAucStrainId?: string | null;
  onSelectAucStrain?: (strainId: string | null) => void;
  focusTestStrainId?: string | null;
  compact?: boolean;
  height?: number;
}

const SERIES_COLORS = [
  '#0B5D1E', // Deep Green (Test isolate 01)
  '#138808', // India Green (Test isolate 02)
  '#1F3A8A', // Chakra Blue accent (Test isolate 03)
  '#B26A00', // Amber (Test isolate 04)
  '#B3261E', // Red (Test isolate 05)
];

const MU3_COLOR = '#FF9933'; // Saffron (Mu3 Reference Control)

export function PapCurveChart({
  payload,
  selectedAucStrainId,
  onSelectAucStrain,
  focusTestStrainId = null,
  compact = false,
  height = 340,
}: PapCurveChartProps) {
  const { t } = useI18n();

  const [hiddenStrains, setHiddenStrains] = useState<string[]>([]);
  const [localShadedStrainId, setLocalShadedStrainId] = useState<string | null>(null);
  const [showReplicates, setShowReplicates] = useState(true);
  const [yScaleMode, setYScaleMode] = useState<'auto' | 'full'>('auto');
  const [hoverConc, setHoverConc] = useState<number | null>(null);

  const [hoveredPoint, setHoveredPoint] = useState<{
    strainId: string;
    strainRole: string;
    color: string;
    x: number;
    y: number;
    svgX: number;
    svgY: number;
    replicatesCount: number;
    censoredCount: number;
  } | null>(null);

  const [pinnedPoint, setPinnedPoint] = useState<{
    strainId: string;
    strainRole: string;
    color: string;
    point: CurveConcentrationPoint;
  } | null>(null);

  const effectiveShadedStrainId =
    onSelectAucStrain !== undefined
      ? (selectedAucStrainId ?? null)
      : (localShadedStrainId ?? selectedAucStrainId ?? null);

  const handleToggleShade = (strainId: string) => {
    const next = effectiveShadedStrainId === strainId ? null : strainId;
    if (onSelectAucStrain) {
      onSelectAucStrain(next);
    } else {
      setLocalShadedStrainId(next);
    }
  };

  const toggleStrainVisibility = (strainKey: string) => {
    setHiddenStrains((prev) =>
      prev.includes(strainKey) ? prev.filter((k) => k !== strainKey) : [...prev, strainKey]
    );
  };

  const allProfiles = useMemo(() => {
    const list: Array<{
      key: string;
      profile: StrainProfileResult;
      color: string;
      isRef: boolean;
    }> = [];
    if (payload.referenceProfile) {
      list.push({
        key: `${payload.referenceProfile.strainRole}::${payload.referenceProfile.strainId}`,
        profile: payload.referenceProfile,
        color: MU3_COLOR,
        isRef: true,
      });
    }
    payload.testProfiles.forEach((tp, idx) => {
      if (focusTestStrainId && tp.strainId !== focusTestStrainId) {
        return;
      }
      list.push({
        key: `${tp.strainRole}::${tp.strainId}`,
        profile: tp,
        color: SERIES_COLORS[idx % SERIES_COLORS.length],
        isRef: false,
      });
    });
    return list;
  }, [payload, focusTestStrainId]);

  const visibleProfiles = useMemo(
    () => allProfiles.filter((item) => !hiddenStrains.includes(item.key)),
    [allProfiles, hiddenStrains]
  );

  const { minX, maxX, minY, maxY, xTicks, yTicks } = useMemo(() => {
    const activeSet = visibleProfiles.length > 0 ? visibleProfiles : allProfiles;
    const allPoints = activeSet.flatMap((p) => p.profile.validCurvePoints);
    if (allPoints.length === 0) {
      return {
        minX: 0,
        maxX: 4,
        minY: 0,
        maxY: 10,
        xTicks: [0, 1, 2, 3, 4],
        yTicks: [0, 2, 4, 6, 8, 10],
      };
    }

    const xs = allPoints.map((p) => p.x);
    const ys = allPoints.map((p) => p.y);
    const rawMinX = Math.min(...xs);
    const rawMaxX = Math.max(...xs);
    const rawMinY = Math.min(...ys);
    const rawMaxY = Math.max(...ys);

    const minXVal = Math.min(0, Math.floor(rawMinX * 2) / 2);
    const maxXVal = Math.max(4, Math.ceil(rawMaxX * 2) / 2);
    const minYVal = yScaleMode === 'full' ? 0 : Math.max(0, Math.floor(rawMinY) - 1);
    const maxYVal = yScaleMode === 'full' ? 10 : Math.ceil(rawMaxY) + 1;

    const uniqueXs = Array.from(new Set(xs)).sort((a, b) => a - b);
    const yTickList: number[] = [];
    const step = maxYVal - minYVal > 8 ? 2 : 1;
    for (let y = minYVal; y <= maxYVal; y += step) {
      yTickList.push(y);
    }

    return {
      minX: minXVal,
      maxX: maxXVal === minXVal ? minXVal + 1 : maxXVal,
      minY: minYVal,
      maxY: maxYVal === minYVal ? minYVal + 2 : maxYVal,
      xTicks: uniqueXs,
      yTicks: yTickList,
    };
  }, [visibleProfiles, allProfiles, yScaleMode]);

  const width = 760;
  const padLeft = 64;
  const padRight = 28;
  const padTop = 24;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const toSvgX = (x: number) =>
    padLeft + ((x - minX) / (maxX - minX)) * plotW;
  const toSvgY = (y: number) =>
    padTop + ((maxY - y) / (maxY - minY)) * plotH;

  const activeShadedProfile = useMemo(() => {
    if (!effectiveShadedStrainId) return null;
    return (
      visibleProfiles.find((p) => p.profile.strainId === effectiveShadedStrainId) ?? null
    );
  }, [visibleProfiles, effectiveShadedStrainId]);

  const buildPolygonPoints = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length < 2) return '';
    const sorted = [...pts].sort((a, b) => a.x - b.x);
    const baseY = toSvgY(minY);
    const topCoords = sorted.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`);
    const bottomRight = `${toSvgX(sorted[sorted.length - 1].x)},${baseY}`;
    const bottomLeft = `${toSvgX(sorted[0].x)},${baseY}`;
    return [...topCoords, bottomRight, bottomLeft].join(' ');
  };

  const activeConc = hoveredPoint?.x ?? hoverConc;

  const activeConcEntries = useMemo(() => {
    if (activeConc === null) return [];
    return visibleProfiles
      .map(({ profile, color, isRef }) => {
        const pt = profile.points.find(
          (p) => Math.abs(p.concentrationMgL - activeConc) < 1e-6
        );
        return pt && pt.aggregatedLog10CfuPerMl !== null
          ? {
              strainId: profile.strainId,
              isRef,
              color,
              y: pt.aggregatedLog10CfuPerMl,
              replicatesCount: pt.replicates.length,
              censoredCount: pt.censoredCount,
              point: pt,
              strainRole: profile.strainRole,
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [activeConc, visibleProfiles]);

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    if (svgX < padLeft - 14 || svgX > width - padRight + 14) {
      setHoverConc(null);
      return;
    }
    let nearest: number | null = null;
    let bestDist = Infinity;
    for (const xv of xTicks) {
      const px = toSvgX(xv);
      const d = Math.abs(svgX - px);
      if (d < bestDist) {
        bestDist = d;
        nearest = xv;
      }
    }
    setHoverConc(bestDist < 55 ? nearest : null);
  };

  // Floating tooltip geometry
  const tooltipBox = useMemo(() => {
    if (activeConc === null || activeConcEntries.length === 0) return null;
    const cx = toSvgX(activeConc);
    const boxW = compact ? 186 : 216;
    const lineH = 17;
    const boxH = 26 + activeConcEntries.length * lineH;
    const placeLeft = cx + 14 + boxW > width - padRight;
    const boxX = placeLeft ? Math.max(padLeft + 4, cx - boxW - 12) : cx + 12;
    const boxY = padTop + 6;
    return { cx, boxX, boxY, boxW, boxH, lineH };
  }, [activeConc, activeConcEntries, compact, width, padLeft, padRight, padTop]);

  const hasCustomView =
    hiddenStrains.length > 0 ||
    !showReplicates ||
    yScaleMode !== 'auto' ||
    pinnedPoint !== null;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide uppercase text-[#0F1D2E]">
            {focusTestStrainId
              ? `${focusTestStrainId} vs. ${payload.mu3StrainId ?? 'Mu3'}`
              : t('chartTitle')}
          </h3>
          {!compact && (
            <p className="text-xs text-slate-600 mt-0.5">
              {t('chartSubtitle')} · {payload.protocolName} (v{payload.protocolVersion})
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hoveredPoint ? (
            <div className="font-mono text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-slate-800">
              {hoveredPoint.strainId}: {hoveredPoint.x} mg/L · {hoveredPoint.y.toFixed(3)} log10(CFU/mL)
              {hoveredPoint.censoredCount > 0 ? ' (0)' : ''}
            </div>
          ) : activeConc !== null ? (
            <div className="font-mono text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-slate-800">
              {activeConc} mg/L · {activeConcEntries.length} curve(s)
            </div>
          ) : (
            <div className="text-xs text-slate-500">{t('chartHoverHint')}</div>
          )}

          {/* Compact interactive graph controls (excluded from print) */}
          <div className="no-print inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowReplicates((v) => !v)}
              title="Toggle individual replicate dots"
              className={`px-2 py-1 text-[11px] font-medium rounded border cursor-pointer transition-colors ${
                showReplicates
                  ? 'bg-[#FAF8F3] border-slate-300 text-slate-800'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              Replicates: {showReplicates ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => setYScaleMode((m) => (m === 'auto' ? 'full' : 'auto'))}
              title="Toggle Y-axis scale between Auto-fit and 0–10 log10"
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border cursor-pointer transition-colors ${
                yScaleMode === 'full'
                  ? 'bg-[#0B5D1E] border-[#0B5D1E] text-white'
                  : 'bg-[#FAF8F3] border-slate-300 text-slate-800'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>Y: {yScaleMode === 'full' ? '0–10' : 'Auto'}</span>
            </button>
            {hasCustomView && (
              <button
                type="button"
                onClick={() => {
                  setHiddenStrains([]);
                  setShowReplicates(true);
                  setYScaleMode('auto');
                  setPinnedPoint(null);
                }}
                title="Reset chart view"
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full h-auto select-none ${compact ? 'min-w-[340px]' : 'min-w-[520px]'}`}
          role="img"
          aria-label="Population Analysis Profile curve showing log10 CFU/mL against vancomycin concentration in mg/L"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => {
            setHoverConc(null);
            setHoveredPoint(null);
          }}
        >
          {/* Horizontal gridlines & Y ticks */}
          {yTicks.map((yVal) => {
            const sy = toSvgY(yVal);
            return (
              <g key={`y-${yVal}`}>
                <line
                  x1={padLeft}
                  y1={sy}
                  x2={width - padRight}
                  y2={sy}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={sy + 4}
                  textAnchor="end"
                  className="fill-slate-600 text-[11px] font-mono"
                >
                  {yVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Vertical gridlines at observed concentrations */}
          {xTicks.map((xVal) => {
            const sx = toSvgX(xVal);
            const isHoveredX = activeConc !== null && Math.abs(activeConc - xVal) < 1e-6;
            return (
              <g key={`x-${xVal}`}>
                <line
                  x1={sx}
                  y1={padTop}
                  x2={sx}
                  y2={padTop + plotH}
                  stroke={isHoveredX ? '#94A3B8' : '#EEF2F6'}
                  strokeWidth={isHoveredX ? '1.25' : '1'}
                  strokeDasharray="3 3"
                />
                <text
                  x={sx}
                  y={padTop + plotH + 18}
                  textAnchor="middle"
                  className={`text-[11px] font-mono ${
                    isHoveredX ? 'fill-[#0B5D1E] font-bold' : 'fill-slate-700'
                  }`}
                >
                  {xVal}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={padTop + plotH}
            stroke="#64748B"
            strokeWidth="1.25"
          />
          <line
            x1={padLeft}
            y1={padTop + plotH}
            x2={width - padRight}
            y2={padTop + plotH}
            stroke="#64748B"
            strokeWidth="1.25"
          />

          {/* Axis Labels */}
          <text
            x={padLeft + plotW / 2}
            y={height - 10}
            textAnchor="middle"
            className="fill-slate-700 text-[12px] font-medium"
          >
            {t('chartXAxis')}
          </text>
          <text
            x={16}
            y={padTop + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${padTop + plotH / 2})`}
            className="fill-slate-700 text-[12px] font-medium"
          >
            {t('chartYAxis')}
          </text>

          {/* Optional Trapezoidal AUC Shading for selected isolate */}
          {activeShadedProfile &&
            activeShadedProfile.profile.validCurvePoints.length >= 2 && (
              <polygon
                points={buildPolygonPoints(activeShadedProfile.profile.validCurvePoints)}
                fill={activeShadedProfile.color}
                fillOpacity="0.13"
              />
            )}

          {/* Crosshair guide on hover */}
          {activeConc !== null && (
            <line
              x1={toSvgX(activeConc)}
              y1={padTop}
              x2={toSvgX(activeConc)}
              y2={padTop + plotH}
              stroke={hoveredPoint ? hoveredPoint.color : '#64748B'}
              strokeWidth="1.2"
              strokeDasharray="4 3"
              opacity="0.7"
            />
          )}
          {hoveredPoint && (
            <line
              x1={padLeft}
              y1={hoveredPoint.svgY}
              x2={width - padRight}
              y2={hoveredPoint.svgY}
              stroke={hoveredPoint.color}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.6"
            />
          )}

          {/* Individual replicate scatter dots */}
          {showReplicates &&
            visibleProfiles.map(({ profile, color }) =>
              profile.points.flatMap((pt) =>
                pt.replicates
                  .filter((r) => r.effectiveLog10 !== null)
                  .map((rep) => (
                    <circle
                      key={`rep-${rep.observationId}`}
                      cx={toSvgX(pt.concentrationMgL)}
                      cy={toSvgY(rep.effectiveLog10!)}
                      r={2.5}
                      fill={color}
                      fillOpacity={0.35}
                      className="pointer-events-none"
                    />
                  ))
              )
            )}

          {/* Profile Curves & Markers */}
          {visibleProfiles.map(({ profile, color, isRef }) => {
            const pts = [...profile.validCurvePoints].sort((a, b) => a.x - b.x);
            if (pts.length === 0) return null;
            const pathData = pts
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x)} ${toSvgY(p.y)}`)
              .join(' ');
            const isShaded = effectiveShadedStrainId === profile.strainId;

            return (
              <g key={`curve-${profile.strainRole}-${profile.strainId}`}>
                {pts.length >= 2 && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth={isShaded ? 3.2 : isRef ? 2.6 : 2.25}
                  />
                )}
                {profile.points.map((pt) => {
                  if (pt.aggregatedLog10CfuPerMl === null) return null;
                  const sx = toSvgX(pt.concentrationMgL);
                  const sy = toSvgY(pt.aggregatedLog10CfuPerMl);
                  const isCensoredPoint =
                    pt.censoredCount > 0 && pt.censoredCount === pt.replicates.length;
                  const isConcActive =
                    activeConc !== null && Math.abs(activeConc - pt.concentrationMgL) < 1e-6;
                  const isPinned =
                    pinnedPoint?.strainId === profile.strainId &&
                    pinnedPoint?.strainRole === profile.strainRole &&
                    Math.abs(pinnedPoint.point.concentrationMgL - pt.concentrationMgL) < 1e-6;

                  return (
                    <g key={`pt-${profile.strainId}-${pt.concentrationMgL}`}>
                      {(isConcActive || isPinned) && (
                        <circle
                          cx={sx}
                          cy={sy}
                          r={isPinned ? 9 : 7.5}
                          fill="none"
                          stroke={color}
                          strokeWidth={isPinned ? 2 : 1.5}
                          opacity={isPinned ? 0.9 : 0.45}
                          className="pointer-events-none"
                        />
                      )}
                      <circle
                        cx={sx}
                        cy={sy}
                        r={isPinned || isConcActive ? 5.5 : isCensoredPoint ? 5.2 : 4.3}
                        fill={isCensoredPoint ? '#FFFFFF' : color}
                        stroke={color}
                        strokeWidth={2}
                        className="cursor-pointer"
                        onMouseEnter={() =>
                          setHoveredPoint({
                            strainId: profile.strainId,
                            strainRole: profile.strainRole,
                            color,
                            x: pt.concentrationMgL,
                            y: pt.aggregatedLog10CfuPerMl!,
                            svgX: sx,
                            svgY: sy,
                            replicatesCount: pt.replicates.length,
                            censoredCount: pt.censoredCount,
                          })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                        onClick={() =>
                          setPinnedPoint((prev) =>
                            prev &&
                            prev.strainId === profile.strainId &&
                            prev.strainRole === profile.strainRole &&
                            Math.abs(prev.point.concentrationMgL - pt.concentrationMgL) < 1e-6
                              ? null
                              : {
                                  strainId: profile.strainId,
                                  strainRole: profile.strainRole,
                                  color,
                                  point: pt,
                                }
                          )
                        }
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Interactive SVG Floating Tooltip */}
          {tooltipBox && activeConc !== null && (
            <g className="pointer-events-none">
              <rect
                x={tooltipBox.boxX}
                y={tooltipBox.boxY}
                width={tooltipBox.boxW}
                height={tooltipBox.boxH}
                rx={4}
                fill="#FFFFFF"
                fillOpacity={0.96}
                stroke="#CBD5E1"
                strokeWidth={1}
              />
              <text
                x={tooltipBox.boxX + 9}
                y={tooltipBox.boxY + 15}
                className="fill-[#222B33] text-[10px] font-mono font-bold"
              >
                Vancomycin: {activeConc} mg/L
              </text>
              {activeConcEntries.map((entry, idx) => {
                const ty = tooltipBox.boxY + 31 + idx * tooltipBox.lineH;
                return (
                  <g key={`tt-${entry.strainRole}-${entry.strainId}`}>
                    <circle cx={tooltipBox.boxX + 12} cy={ty - 3.5} r={3.5} fill={entry.color} />
                    <text
                      x={tooltipBox.boxX + 20}
                      y={ty}
                      className="fill-slate-800 text-[10px] font-mono"
                    >
                      {entry.strainId}: {entry.y.toFixed(3)} (n={entry.replicatesCount})
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Pinned Point Replicate Inspection Strip */}
      {pinnedPoint && (
        <div className="no-print mt-3 rounded border border-slate-300 bg-[#FAF8F3] px-3.5 py-2.5 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono font-semibold text-[#222B33]">
              <Pin className="w-3.5 h-3.5 text-[#0B5D1E]" />
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: pinnedPoint.color }}
              />
              <span>
                {pinnedPoint.strainId} @ {pinnedPoint.point.concentrationMgL} mg/L
              </span>
              <span className="text-slate-600 font-normal">
                · Mean/Agg: {pinnedPoint.point.aggregatedLog10CfuPerMl?.toFixed(4) ?? '—'} log10(CFU/mL)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPinnedPoint(null)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-700">
            {pinnedPoint.point.replicates.map((rep) => (
              <span
                key={rep.observationId}
                className="bg-white border border-slate-200 rounded px-2 py-0.5"
              >
                {rep.replicateId}: {rep.colonyCount} col →{' '}
                {rep.effectiveLog10 !== null ? `${rep.effectiveLog10.toFixed(3)} log10` : 'excluded'}
                {rep.isZeroCensored ? ' (0-censored)' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Legend & Protocol Context */}
      <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-2.5">
          {allProfiles.map(({ key, profile, color, isRef }) => {
            const isHidden = hiddenStrains.includes(key);
            const isShaded = effectiveShadedStrainId === profile.strainId;
            return (
              <div
                key={`leg-${key}`}
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 transition-colors ${
                  isHidden
                    ? 'border-slate-200 bg-slate-50 text-slate-400'
                    : isShaded
                    ? 'border-[#0B5D1E] bg-emerald-50/60 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleStrainVisibility(key)}
                  title={isHidden ? `Show ${profile.strainId}` : `Hide ${profile.strainId}`}
                  className="inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span
                    className="inline-block w-3 h-0.5"
                    style={{
                      backgroundColor: isHidden ? '#CBD5E1' : color,
                      height: '2.5px',
                      width: '14px',
                    }}
                    aria-hidden="true"
                  />
                  <span className={`font-medium ${isHidden ? 'line-through' : ''}`}>
                    {profile.strainId} ({isRef ? t('roleRefControl') : t('roleTestIsolate')})
                  </span>
                  {profile.auc !== null && (
                    <span className="font-mono text-[11px] text-slate-500">
                      AUC {profile.auc.toFixed(2)}
                    </span>
                  )}
                  <span className="no-print text-slate-400 hover:text-slate-700">
                    {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </span>
                </button>
                {!isHidden && profile.validCurvePoints.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => handleToggleShade(profile.strainId)}
                    title={`Shade AUC under ${profile.strainId}`}
                    className={`no-print ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded cursor-pointer inline-flex items-center gap-0.5 ${
                      isShaded
                        ? 'bg-[#0B5D1E] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Layers className="w-2.5 h-2.5" />
                    <span>AUC</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-slate-500">
          {t('reportZeroRule')}: <span className="font-mono text-slate-700">{payload.zeroColonyPolicy}</span>
          {' · '}
          {t('chartHollowNote')}
        </div>
      </div>
    </div>
  );
}

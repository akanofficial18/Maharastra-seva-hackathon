import { Fragment, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  HelpCircle,
  History,
  Lock,
  MessageSquarePlus,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useI18n } from '../lib/i18n.tsx';
import { getValidationStatusSummary, type ValidationSignalLevel } from '../lib/papAucEngine.ts';
import { getRolePermissions } from '../lib/permissions.ts';
import type {
  AuditEvent,
  ExperimentDetail,
  QaFlag,
  QaSeverity,
  ReviewDecision,
  UserRole,
} from '../types/hvisa.ts';
import { ExperimentStatusLabel, QaSeverityLabel } from './StatusIndicator.tsx';

interface QualityAssuranceViewProps {
  detail: ExperimentDetail | null;
  loading: boolean;
  role: UserRole;
  onDetailUpdated: (next: ExperimentDetail) => void;
  onJumpToRow: (observationId: string) => void;
}

function ChecklistLevelBadge({ level }: { level: ValidationSignalLevel }) {
  if (level === 'RED') {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-rose-800">
        <XCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
        <span>RED</span>
      </span>
    );
  }
  if (level === 'AMBER') {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-800">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>AMBER</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-800">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
      <span>GREEN</span>
    </span>
  );
}

export function QualityAssuranceView({
  detail,
  loading,
  role,
  onDetailUpdated,
  onJumpToRow,
}: QualityAssuranceViewProps) {
  const { t } = useI18n();
  const permissions = getRolePermissions(role);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | QaSeverity>('ALL');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplainId, setLoadingExplainId] = useState<string | null>(null);
  const [auditScope, setAuditScope] = useState<'run' | 'global'>('run');
  const [globalAudit, setGlobalAudit] = useState<AuditEvent[]>([]);
  const [loadingGlobalAudit, setLoadingGlobalAudit] = useState(false);
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);

  useEffect(() => {
    if (auditScope !== 'global') return;
    setLoadingGlobalAudit(true);
    api
      .getAuditHistory(role)
      .then((res) => setGlobalAudit(res.events))
      .catch(() => {})
      .finally(() => setLoadingGlobalAudit(false));
  }, [auditScope, role, detail?.auditHistory.length]);

  if (loading || !detail) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-600">
        {loading ? 'Loading QA review...' : 'Select an experiment to review QA flags and audit history.'}
      </div>
    );
  }

  const { experiment, observations, qaFlags, reviews, auditHistory, latestCalculation } = detail;
  const observationById = new Map(observations.map((o) => [o.id, o]));
  const validationSummary = getValidationStatusSummary(
    qaFlags,
    observations.length,
    experiment.status
  );
  const { blockingCount, warningCount, infoCount } = validationSummary;

  const filteredFlags =
    severityFilter === 'ALL'
      ? qaFlags
      : qaFlags.filter((f) => f.severity === severityFilter);

  const canMarkReviewed =
    permissions.canSubmitReview &&
    blockingCount === 0 &&
    latestCalculation !== null &&
    latestCalculation.isValid;

  const handleAcknowledge = async (flagId: string) => {
    setMessage(null);
    try {
      const updated = await api.acknowledgeQaFlag(role, experiment.id, flagId);
      onDetailUpdated(updated);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to acknowledge flag',
      });
    }
  };

  const handleExplainFlag = async (flag: QaFlag) => {
    setLoadingExplainId(flag.id);
    try {
      const res = await api.explainQaFlag(role, {
        code: flag.code,
        message: flag.message,
        resolutionHint: flag.resolutionHint,
      });
      setExplanations((prev) => ({ ...prev, [flag.id]: res.explanation }));
    } finally {
      setLoadingExplainId(null);
    }
  };

  const handleReviewSubmit = async (decision: ReviewDecision) => {
    setMessage(null);
    if (decision === 'COMMENT' && !comment.trim()) {
      setMessage({ type: 'error', text: 'Enter a reviewer comment before submitting.' });
      return;
    }
    setBusy(true);
    try {
      const updated = await api.submitReview(role, experiment.id, decision, comment);
      onDetailUpdated(updated);
      setComment('');
      setMessage({
        type: 'success',
        text:
          decision === 'MARKED_REVIEWED'
            ? 'Run marked as QA Reviewed. Note: laboratory review sign-off is not clinical confirmation.'
            : decision === 'RETURNED_FOR_CORRECTION'
            ? 'Run returned for correction; calculation status invalidated.'
            : 'Reviewer comment logged.',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Review action failed',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#222B33] tracking-tight">
            {t('qaTitle')}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span>
              {t('colRunId')}: <strong className="font-mono text-slate-900">{experiment.runId}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <ExperimentStatusLabel status={experiment.status} />
            <span aria-hidden="true">·</span>
            <span>{t('qaSubDisclaimer')}</span>
          </div>
        </div>
      </div>

      {/* 3-Level Validation Status Banner (RED / AMBER / GREEN) */}
      <section
        aria-label="Overall QA validation signal"
        className={`rounded-lg border px-5 py-4 flex flex-wrap items-center justify-between gap-4 ${
          validationSummary.level === 'RED'
            ? 'bg-rose-50 border-rose-200 text-rose-950'
            : validationSummary.level === 'AMBER'
            ? 'bg-[#FEF9EE] border-[#E5D5B5] text-amber-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-start gap-3">
          {validationSummary.level === 'RED' ? (
            <XCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          ) : validationSummary.level === 'AMBER' ? (
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="text-sm font-bold">{validationSummary.label}</div>
            <p className="text-xs mt-0.5 opacity-90">
              {validationSummary.level === 'RED'
                ? `${blockingCount} blocking error(s) detected. PAP-AUC calculation and review sign-off are blocked until affected observations are corrected.`
                : validationSummary.level === 'AMBER'
                ? `${warningCount} warning(s) require microbiologist or analyst inspection before final QA sign-off.`
                : 'All 8 deterministic laboratory QA checks passed with zero blocking errors or warnings.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-rose-800 font-semibold">{blockingCount} RED</span>
          <span className="text-amber-800 font-semibold">{warningCount} AMBER</span>
          <span className="text-slate-600">{infoCount} INFO</span>
        </div>
      </section>

      {/* 8-Rule Deterministic QA Coverage Checklist */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#222B33]">
              {t('qaRulesTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('qaRulesSub')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:grid-flow-row gap-px bg-slate-200">
          {validationSummary.checklist.map((item) => (
            <div key={item.id} className="bg-white p-3.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#222B33]">{item.label}</span>
                <ChecklistLevelBadge level={item.level} />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg border text-xs ${
            message.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* QA Summary & Filter Controls */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#222B33]">
              {t('qaFlagsTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('qaFlagsSub')}</p>
          </div>

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-md text-xs">
            {(
              [
                { key: 'ALL', label: `${t('filterAll')} (${qaFlags.length})` },
                { key: 'BLOCKING', label: `${t('filterRed')} (${blockingCount})` },
                { key: 'WARNING', label: `${t('filterAmber')} (${warningCount})` },
                { key: 'INFO', label: `${t('filterInfo')} (${infoCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSeverityFilter(tab.key)}
                className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  severityFilter === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredFlags.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {t('noFlagsInFilter')}
            </div>
          ) : (
            filteredFlags.map((flag) => {
              const affectedObs = flag.observationId
                ? observationById.get(flag.observationId) ?? null
                : null;
              return (
                <div key={flag.id} className="p-5 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <QaSeverityLabel severity={flag.severity} />
                        <span className="font-mono text-[11px] text-slate-500">
                          {flag.code}
                        </span>
                        {flag.rowReference && (
                          <span className="font-mono text-[11px] text-slate-800 font-medium">
                            · Affected: {flag.rowReference}
                            {flag.fieldName ? ` [${flag.fieldName}]` : ''}
                          </span>
                        )}
                        {flag.acknowledged && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Acknowledged by {flag.acknowledgedBy}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-[#222B33]">
                        {flag.message}
                      </p>

                      {affectedObs && (
                        <div className="text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 inline-block">
                          Observation Record: Strain={affectedObs.strainId} ({affectedObs.strainRole}) · Conc={affectedObs.vancomycinConcentrationMgL} mg/L · Rep={affectedObs.replicateId} · Count={affectedObs.colonyCount} · Dil={affectedObs.dilutionFraction} · Vol={affectedObs.platedVolumeMl} mL
                        </div>
                      )}

                      <p className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">{t('resolutionLabel')}</span>{' '}
                        {flag.resolutionHint}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {flag.observationId && (
                        <button
                          type="button"
                          onClick={() => onJumpToRow(flag.observationId!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0B5D1E] bg-white border border-slate-300 hover:bg-slate-50 rounded cursor-pointer whitespace-nowrap"
                        >
                          <span>{t('goToRowBtn')}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={loadingExplainId === flag.id}
                        onClick={() => handleExplainFlag(flag)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded cursor-pointer whitespace-nowrap"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>
                          {loadingExplainId === flag.id ? '...' : t('plainGuideBtn')}
                        </span>
                      </button>

                      {permissions.canAcknowledgeQaFlags && !flag.acknowledged && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(flag.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded cursor-pointer whitespace-nowrap"
                        >
                          {t('acknowledgeBtn')}
                        </button>
                      )}
                    </div>
                  </div>

                  {explanations[flag.id] && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">QA Guide: </span>
                      {explanations[flag.id]}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Two-Column: Reviewer Sign-off & Review Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#222B33]">
              {t('reviewDecisionTitle')}
            </h2>
            {!permissions.canSubmitReview && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Lock className="w-3.5 h-3.5" /> {t('reviewerRoleReq')}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {t('reviewDecisionDesc')}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('reviewerCommentLabel')}
            </label>
            <textarea
              rows={3}
              disabled={!permissions.canSubmitReview}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('reviewerCommentPlaceholder')}
              className="w-full text-xs border border-slate-300 rounded p-2.5 disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF9933]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={!permissions.canSubmitReview || busy}
              onClick={() => handleReviewSubmit('COMMENT')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-45 rounded cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>{t('addCommentBtn')}</span>
            </button>

            <button
              type="button"
              disabled={!permissions.canSubmitReview || busy}
              onClick={() => handleReviewSubmit('RETURNED_FOR_CORRECTION')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-amber-300 bg-[#FEF9EE] text-amber-900 hover:bg-amber-100 disabled:opacity-45 rounded cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('returnCorrectionBtn')}</span>
            </button>

            <button
              type="button"
              disabled={!canMarkReviewed || busy}
              onClick={() => handleReviewSubmit('MARKED_REVIEWED')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-45 rounded cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('markReviewedBtn')}</span>
            </button>
          </div>
        </section>

        {/* Review History */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h2 className="text-base font-semibold text-[#222B33]">
              {t('reviewLogTitle')} ({reviews.length})
            </h2>
          </div>
          {reviews.length === 0 ? (
            <div className="p-6 text-xs text-slate-500">{t('noReviewsYet')}</div>
          ) : (
            <div className="divide-y divide-slate-200 text-xs">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#222B33]">
                      {rev.decision} · <span className="font-mono">{rev.reviewerId}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {new Date(rev.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {rev.comment && <p className="text-slate-700">{rev.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Audit History & Original Observations Preservation */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#0B5D1E]" />
              <h2 className="text-base font-semibold text-[#222B33]">
                {t('auditTitle')} ({auditScope === 'run' ? auditHistory.length : globalAudit.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{t('auditSub')}</p>
          </div>

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-md text-xs">
            <button
              type="button"
              onClick={() => setAuditScope('run')}
              className={`px-3 py-1 font-medium rounded cursor-pointer whitespace-nowrap ${
                auditScope === 'run'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('thisRunAudit')} ({auditHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setAuditScope('global')}
              className={`px-3 py-1 font-medium rounded cursor-pointer whitespace-nowrap ${
                auditScope === 'global'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('workspaceAudit')}
            </button>
          </div>
        </div>

        {loadingGlobalAudit && auditScope === 'global' ? (
          <div className="p-6 text-xs text-slate-500">Loading workspace audit log...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F3] border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                  <th className="py-2.5 px-4">Timestamp</th>
                  {auditScope === 'global' && <th className="py-2.5 px-4">Run</th>}
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Summary</th>
                  <th className="py-2.5 px-4 text-right">Snapshot / Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(auditScope === 'run' ? auditHistory : globalAudit).map((ev) => {
                  const isExpanded = expandedDiffId === ev.id;
                  return (
                    <Fragment key={ev.id}>
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {new Date(ev.createdAt).toLocaleString()}
                        </td>
                        {auditScope === 'global' && (
                          <td className="py-2.5 px-4 font-mono text-[11px] text-slate-800 whitespace-nowrap">
                            {ev.runId ?? 'Global / Protocol'}
                          </td>
                        )}
                        <td className="py-2.5 px-4 font-mono text-slate-800 whitespace-nowrap">
                          {ev.actorId}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                          {ev.actorRole}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                          {ev.actionType}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{ev.summary}</td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          {ev.diffJson ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDiffId((prev) => (prev === ev.id ? null : ev.id))
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#0B5D1E] border border-slate-300 bg-white hover:bg-slate-50 rounded cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && ev.diffJson && (
                        <tr key={`${ev.id}-diff`} className="bg-slate-50">
                          <td
                            colSpan={auditScope === 'global' ? 7 : 6}
                            className="px-4 py-3 border-t border-slate-200"
                          >
                            <div className="text-[11px] font-semibold text-slate-700 mb-1">
                              Immutable Audit Snapshot / Payload
                            </div>
                            <pre className="font-mono text-[11px] text-slate-800 bg-white border border-slate-200 rounded p-3 overflow-x-auto max-h-64">
                              {(() => {
                                try {
                                  return JSON.stringify(JSON.parse(ev.diffJson), null, 2);
                                } catch {
                                  return ev.diffJson;
                                }
                              })()}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

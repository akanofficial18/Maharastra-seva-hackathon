import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileEdit,
  Info,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useI18n } from '../lib/i18n.tsx';
import type { ExperimentStatus, InterpretationBand, QaSeverity } from '../types/hvisa.ts';

export function ExperimentStatusLabel({ status }: { status: ExperimentStatus }) {
  const { translateStatus } = useI18n();
  const label = translateStatus(status);

  switch (status) {
    case 'REVIEWED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B5D1E] whitespace-nowrap">
          <ShieldCheck className="w-3.5 h-3.5 text-[#138808] shrink-0" />
          <span>{label}</span>
        </span>
      );
    case 'CALCULATED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B26A00] whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 text-[#FF9933] shrink-0" />
          <span>{label}</span>
        </span>
      );
    case 'VALIDATED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B5D1E] whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#138808] shrink-0" />
          <span>{label}</span>
        </span>
      );
    case 'CALCULATION_INVALIDATED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B3261E] whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 text-[#B3261E] shrink-0" />
          <span>{label}</span>
        </span>
      );
    case 'DRAFT':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#222B33]/80 whitespace-nowrap">
          <FileEdit className="w-3.5 h-3.5 text-[#222B33]/60 shrink-0" />
          <span>{label}</span>
        </span>
      );
  }
}

export function QaSeverityLabel({ severity }: { severity: QaSeverity }) {
  const { translateSeverity } = useI18n();
  const label = translateSeverity(severity);

  switch (severity) {
    case 'BLOCKING':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B3261E] whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 text-[#B3261E] shrink-0" />
          <span>{label}</span>
        </span>
      );
    case 'WARNING':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B26A00] whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 text-[#B26A00] shrink-0" />
          <span>{label}</span>
        </span>
      );
    case 'INFO':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#222B33] whitespace-nowrap">
          <Info className="w-3.5 h-3.5 text-[#0B5D1E] shrink-0" />
          <span>{label}</span>
        </span>
      );
  }
}

export function InterpretationBandIndicator({
  band,
  label,
}: {
  band: InterpretationBand;
  label: string;
}) {
  const { translateBand } = useI18n();
  const displayLabel = translateBand(band, label);

  switch (band) {
    case 'COMPATIBLE_HVISA':
      return (
        <div className="inline-flex items-start gap-1.5 text-xs font-semibold text-[#B26A00]">
          <AlertTriangle className="w-4 h-4 text-[#FF9933] shrink-0 mt-0.5" />
          <span>{displayLabel}</span>
        </div>
      );
    case 'EXPERT_REVIEW_VISA_RANGE':
      return (
        <div className="inline-flex items-start gap-1.5 text-xs font-semibold text-[#B3261E]">
          <XCircle className="w-4 h-4 text-[#B3261E] shrink-0 mt-0.5" />
          <span>{displayLabel}</span>
        </div>
      );
    case 'BELOW_THRESHOLD':
      return (
        <div className="inline-flex items-start gap-1.5 text-xs font-semibold text-[#0B5D1E]">
          <CheckCircle2 className="w-4 h-4 text-[#138808] shrink-0 mt-0.5" />
          <span>{displayLabel}</span>
        </div>
      );
    default:
      return (
        <div className="inline-flex items-start gap-1.5 text-xs font-medium text-[#222B33]/70">
          <Clock className="w-4 h-4 text-[#222B33]/50 shrink-0 mt-0.5" />
          <span>{displayLabel}</span>
        </div>
      );
  }
}

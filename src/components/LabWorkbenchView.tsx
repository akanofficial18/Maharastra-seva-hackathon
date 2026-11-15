import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useI18n } from '../lib/i18n.tsx';
import type {
  ExperimentDetail,
  ProtocolProfile,
  ReferenceStrain,
  UserRole,
} from '../types/hvisa.ts';
import { ExperimentWorkspaceView } from './ExperimentWorkspaceView.tsx';
import { PapAucAnalysisView } from './PapAucAnalysisView.tsx';
import { QualityAssuranceView } from './QualityAssuranceView.tsx';
import type { AppScreen } from './TopHeader.tsx';

export type LabStep = 'entry' | 'analysis' | 'qa';
export type LabNavigateTarget = AppScreen | 'lab';

interface LabWorkbenchViewProps {
  activeStep: LabStep;
  onStepChange: (step: LabStep) => void;
  detail: ExperimentDetail | null;
  loading: boolean;
  role: UserRole;
  protocols: ProtocolProfile[];
  referenceStrains: ReferenceStrain[];
  highlightObservationId: string | null;
  analysisMode: 'single' | 'comparative';
  onAnalysisModeChange: (mode: 'single' | 'comparative') => void;
  openProtocolConfigTick: number;
  onDetailUpdated: (next: ExperimentDetail) => void;
  onProtocolUpdated: () => Promise<void>;
  onSelectRunAndOpen: (expId: string) => void;
  onJumpToRow: (observationId: string) => void;
  onNavigate: (screen: AppScreen) => void;
  onOpenProtocolSettings: () => void;
}

export function LabWorkbenchView({
  activeStep,
  onStepChange,
  detail,
  loading,
  role,
  protocols,
  referenceStrains,
  highlightObservationId,
  analysisMode,
  onAnalysisModeChange,
  openProtocolConfigTick,
  onDetailUpdated,
  onProtocolUpdated,
  onSelectRunAndOpen,
  onJumpToRow,
  onNavigate,
  onOpenProtocolSettings,
}: LabWorkbenchViewProps) {
  const { t } = useI18n();
  const [showGlossary, setShowGlossary] = useState(false);

  const handleLegacyNavigate = (screen: LabNavigateTarget) => {
    if (screen === 'experiments' || screen === 'lab') onStepChange('entry');
    else if (screen === 'analysis') onStepChange('analysis');
    else if (screen === 'qa') onStepChange('qa');
    else if (screen === 'reports') onNavigate('reports');
    else if (screen === 'outreach') onNavigate('outreach');
    else if (screen === 'dashboard') onNavigate('dashboard');
    else onNavigate('home');
  };

  return (
    <div className="space-y-5">
      {/* Guided 3-Step Lab Header */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F1D2E] tracking-tight">
              {t('labTitle')}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t('labSubtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGlossary((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded cursor-pointer whitespace-nowrap"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-800" />
              <span>{t('glossaryToggle')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="px-3.5 py-2 text-xs font-semibold bg-[#0F1D2E] hover:bg-slate-800 text-white rounded cursor-pointer whitespace-nowrap"
            >
              {t('viewReportBtn')}
            </button>
          </div>
        </div>

        {showGlossary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#F4F7FA] border border-slate-200 rounded-lg p-3.5 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-[#0F1D2E]">{t('glossaryMu3Title')}</div>
              <p className="text-slate-600 leading-relaxed">{t('glossaryMu3Desc')}</p>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-[#0F1D2E]">{t('glossaryCfuTitle')}</div>
              <p className="text-slate-600 leading-relaxed">{t('glossaryCfuDesc')}</p>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-[#0F1D2E]">{t('glossaryAucTitle')}</div>
              <p className="text-slate-600 leading-relaxed">{t('glossaryAucDesc')}</p>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-[#0F1D2E]">{t('glossaryQaTitle')}</div>
              <p className="text-slate-600 leading-relaxed">{t('glossaryQaDesc')}</p>
            </div>
          </div>
        )}

        {/* Sequential Step Switcher */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-2.5"
          role="tablist"
          aria-label="Laboratory workflow steps"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeStep === 'entry'}
            onClick={() => onStepChange('entry')}
            className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
              activeStep === 'entry'
                ? 'bg-[#0F1D2E] text-white border-[#0F1D2E]'
                : 'bg-[#F4F7FA] text-slate-800 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-xs font-bold">{t('labStep1')}</div>
            <div
              className={`text-[11px] mt-1 leading-relaxed ${
                activeStep === 'entry' ? 'text-slate-200' : 'text-slate-600'
              }`}
            >
              {t('labStep1Help')}
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStep === 'analysis'}
            onClick={() => onStepChange('analysis')}
            className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
              activeStep === 'analysis'
                ? 'bg-[#0F1D2E] text-white border-[#0F1D2E]'
                : 'bg-[#F4F7FA] text-slate-800 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-xs font-bold">{t('labStep2')}</div>
            <div
              className={`text-[11px] mt-1 leading-relaxed ${
                activeStep === 'analysis' ? 'text-slate-200' : 'text-slate-600'
              }`}
            >
              {t('labStep2Help')}
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStep === 'qa'}
            onClick={() => onStepChange('qa')}
            className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
              activeStep === 'qa'
                ? 'bg-[#0F1D2E] text-white border-[#0F1D2E]'
                : 'bg-[#F4F7FA] text-slate-800 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-xs font-bold">{t('labStep3')}</div>
            <div
              className={`text-[11px] mt-1 leading-relaxed ${
                activeStep === 'qa' ? 'text-slate-200' : 'text-slate-600'
              }`}
            >
              {t('labStep3Help')}
            </div>
          </button>
        </div>
      </section>

      {activeStep === 'entry' && (
        <ExperimentWorkspaceView
          detail={detail}
          loading={loading}
          role={role}
          protocols={protocols}
          referenceStrains={referenceStrains}
          highlightObservationId={highlightObservationId}
          onDetailUpdated={onDetailUpdated}
          onNavigate={handleLegacyNavigate}
          onOpenProtocolSettings={onOpenProtocolSettings}
        />
      )}

      {activeStep === 'analysis' && (
        <PapAucAnalysisView
          detail={detail}
          loading={loading}
          role={role}
          analysisMode={analysisMode}
          onAnalysisModeChange={onAnalysisModeChange}
          onSelectRunAndOpen={onSelectRunAndOpen}
          openProtocolConfigTick={openProtocolConfigTick}
          onDetailUpdated={onDetailUpdated}
          onProtocolUpdated={onProtocolUpdated}
          onNavigate={handleLegacyNavigate}
        />
      )}

      {activeStep === 'qa' && (
        <QualityAssuranceView
          detail={detail}
          loading={loading}
          role={role}
          onDetailUpdated={onDetailUpdated}
          onJumpToRow={onJumpToRow}
        />
      )}
    </div>
  );
}

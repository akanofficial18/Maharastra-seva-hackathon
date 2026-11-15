import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  ExperimentStatus,
  InterpretationBand,
  QaSeverity,
  TribalLanguageCode,
  UserRole,
} from '../types/hvisa.ts';

const LANG_STORAGE_KEY = 'hvisa_ui_lang_v1';
const FONT_STORAGE_KEY = 'hvisa_font_scale_v1';
const CONTRAST_STORAGE_KEY = 'hvisa_high_contrast_v1';

export type TranslationKey =
  | 'appTitle'
  | 'navHome'
  | 'navDashboard'
  | 'navExperiments'
  | 'navAnalysis'
  | 'navQa'
  | 'navOutreach'
  | 'navLab'
  | 'navReports'
  | 'loginRegisterBtn'
  | 'portalBannerSubtitle'
  | 'portalStripLabel'
  | 'portalMissionBadge'
  | 'portalMissionTitle'
  | 'portalMissionDesc'
  | 'portalDivisionsHeading'
  | 'portalUpdatesHeading'
  | 'portalTabsOverview'
  | 'portalTabsModules'
  | 'portalTabsMethod'
  | 'portalTabsRural'
  | 'portalSignInPrompt'
  | 'portalExploreBtn'
  | 'portalOpenModuleBtn'
  | 'fontDecreaseTitle'
  | 'fontResetTitle'
  | 'fontIncreaseTitle'
  | 'newRunBtn'
  | 'viewReportBtn'
  | 'languageLabel'
  | 'activeRunLabel'
  | 'whoAmILabel'
  | 'roleAnalyst'
  | 'roleReviewer'
  | 'roleAuditor'
  | 'demoBadge'
  | 'homeTitle'
  | 'homeSubtitle'
  | 'howItWorksTitle'
  | 'step1Title'
  | 'step1Desc'
  | 'step1Action'
  | 'step2Title'
  | 'step2Desc'
  | 'step2Action'
  | 'step3Title'
  | 'step3Desc'
  | 'step3Action'
  | 'loadDemoBtn'
  | 'compareRunsBtn'
  | 'kpiTotalRuns'
  | 'kpiTotalRunsSub'
  | 'kpiCalculated'
  | 'kpiCalculatedSub'
  | 'kpiPending'
  | 'kpiPendingSub'
  | 'kpiBlocked'
  | 'kpiBlockedSub'
  | 'recentRunsTitle'
  | 'recentRunsSub'
  | 'colRunId'
  | 'colDate'
  | 'colMethod'
  | 'colSamples'
  | 'colRows'
  | 'colStatus'
  | 'colQuality'
  | 'colActions'
  | 'btnOpenLab'
  | 'btnOpenReport'
  | 'btnOpenQa'
  | 'noIssues'
  | 'blockingLabel'
  | 'warnLabel'
  | 'statusReviewed'
  | 'statusCalculated'
  | 'statusValidated'
  | 'statusInvalidated'
  | 'statusDraft'
  | 'qaBlocking'
  | 'qaWarning'
  | 'qaInfo'
  | 'bandBelow'
  | 'bandHvisa'
  | 'bandExpert'
  | 'bandNotCalc'
  | 'labTitle'
  | 'labSubtitle'
  | 'labStep1'
  | 'labStep2'
  | 'labStep3'
  | 'labStep1Help'
  | 'labStep2Help'
  | 'labStep3Help'
  | 'glossaryToggle'
  | 'glossaryMu3Title'
  | 'glossaryMu3Desc'
  | 'glossaryCfuTitle'
  | 'glossaryCfuDesc'
  | 'glossaryAucTitle'
  | 'glossaryAucDesc'
  | 'glossaryQaTitle'
  | 'glossaryQaDesc'
  | 'outreachTitle'
  | 'outreachSubtitle'
  | 'onlineSimulateOffline'
  | 'offlineModeActive'
  | 'syncQueuedBtn'
  | 'exportBundleBtn'
  | 'kpiClusters'
  | 'kpiActiveSamples'
  | 'kpiColdAlerts'
  | 'kpiCamps'
  | 'tabFieldSamples'
  | 'tabClustersCamps'
  | 'tabCardsAudio'
  | 'logSampleTitle'
  | 'logSampleSub'
  | 'sampleCodeLabel'
  | 'chwIdLabel'
  | 'clusterSelectLabel'
  | 'villageLabel'
  | 'carrierLabel'
  | 'transitHoursLabel'
  | 'linkRunLabel'
  | 'coldSealCheck'
  | 'notesLabel'
  | 'saveQueueBtn'
  | 'saveDispatchBtn'
  | 'dispatchesTitle'
  | 'dispatchesSub'
  | 'coldChainOk'
  | 'delayWarning'
  | 'coldChainBreach'
  | 'statusInTransit'
  | 'statusAtLab'
  | 'statusReturned'
  | 'markReceivedBtn'
  | 'returnPhcBtn'
  | 'copySmsBtn'
  | 'copiedSmsBtn'
  | 'offlineQueueTitle'
  | 'offlineQueueSub'
  | 'clearQueueBtn'
  | 'syncNowBtn'
  | 'syncingLabel'
  | 'iceBoxOption'
  | 'incubatorOption'
  | 'ambientOption'
  | 'switchRoleNote'
  | 'clusterTableTitle'
  | 'clusterTableSub'
  | 'registerClusterBtn'
  | 'clusterCodeLabel'
  | 'districtLabel'
  | 'stateLabel'
  | 'primaryLangLabel'
  | 'connectivityLabel'
  | 'referralLabLabel'
  | 'ashaCountLabel'
  | 'saveClusterBtn'
  | 'savingLabel'
  | 'colClusterDistrict'
  | 'colLangSync'
  | 'colFieldSamples'
  | 'colLinkedRuns'
  | 'colHvisaRange'
  | 'colExpertReview'
  | 'colColdAlerts'
  | 'scheduleCampTitle'
  | 'campsTableTitle'
  | 'campsTableSub'
  | 'campCodeLabel'
  | 'campDateLabel'
  | 'campClusterLabel'
  | 'campVillageLabel'
  | 'campChwLabel'
  | 'campHouseholdsLabel'
  | 'campServicesLabel'
  | 'scheduleCampBtn'
  | 'colCampDate'
  | 'colClusterHamlets'
  | 'colServices'
  | 'colHouseholds'
  | 'campScheduled'
  | 'campActive'
  | 'campCompleted'
  | 'selectLangTitle'
  | 'selectLangSub'
  | 'printCardsBtn'
  | 'runSummaryTitle'
  | 'runSummarySub'
  | 'refreshSummaryBtn'
  | 'listenAudioBtn'
  | 'stopAudioBtn'
  | 'copyTextBtn'
  | 'communityAidLabel'
  | 'copyCardBtn'
  | 'expWorkspaceTitle'
  | 'editMetaBtn'
  | 'hideMetaBtn'
  | 'cardTestIsolates'
  | 'cardObsRows'
  | 'cardRefControl'
  | 'cardRefSub'
  | 'cardRunStatus'
  | 'cardNoQaFlags'
  | 'obsDataTitle'
  | 'obsDataSub'
  | 'lockedObsNote'
  | 'addRowBtn'
  | 'addSeriesBtn'
  | 'importCsvBtn'
  | 'saveObsBtn'
  | 'validateInputsBtn'
  | 'calcPapAucBtn'
  | 'rawPreservedNote'
  | 'activeQaTitle'
  | 'openFullQaBtn'
  | 'colDelete'
  | 'csvModalTitle'
  | 'csvFillSample'
  | 'csvDownloadSample'
  | 'csvImportReplace'
  | 'csvImportAppend'
  | 'csvApplyBtn'
  | 'singleRunMode'
  | 'comparativeMode'
  | 'modeSwitchHint'
  | 'analysisHeaderTitle'
  | 'protocolSettingsBtn'
  | 'hideProtocolSettingsBtn'
  | 'recalcPapAucBtn'
  | 'notComputedTitle'
  | 'notComputedDesc'
  | 'openWorkspaceBtn'
  | 'inspectBlockingBtn'
  | 'combinedCurvesBtn'
  | 'individualCurvesBtn'
  | 'compareFilterLabel'
  | 'allIsolatesBtn'
  | 'shadedAucLabel'
  | 'noneOption'
  | 'soloCurveBtn'
  | 'showAllBtn'
  | 'testAucLabel'
  | 'mu3AucLabel'
  | 'papRatioLabel'
  | 'thresholdsHeading'
  | 'qaContextTitle'
  | 'reviewRunBtn'
  | 'exportReportLink'
  | 'calcDetailsTitle'
  | 'calcDetailsSub'
  | 'tabSegments'
  | 'tabObsCalc'
  | 'tabReplicates'
  | 'chartTitle'
  | 'chartSubtitle'
  | 'chartHoverHint'
  | 'chartXAxis'
  | 'chartYAxis'
  | 'chartHollowNote'
  | 'compTitle'
  | 'compSubtitle'
  | 'refreshBtn'
  | 'downloadIsolateCsvBtn'
  | 'downloadRunDiffCsvBtn'
  | 'filterHeading'
  | 'overlayMu3Check'
  | 'includeStaleCheck'
  | 'compCurvesTitle'
  | 'compCurvesSub'
  | 'compTableTitle'
  | 'qaTitle'
  | 'qaSubDisclaimer'
  | 'qaRulesTitle'
  | 'qaRulesSub'
  | 'qaFlagsTitle'
  | 'qaFlagsSub'
  | 'filterAll'
  | 'filterRed'
  | 'filterAmber'
  | 'filterInfo'
  | 'noFlagsInFilter'
  | 'goToRowBtn'
  | 'plainGuideBtn'
  | 'acknowledgeBtn'
  | 'acknowledgedBy'
  | 'resolutionLabel'
  | 'reviewDecisionTitle'
  | 'reviewerRoleReq'
  | 'reviewDecisionDesc'
  | 'reviewerCommentLabel'
  | 'reviewerCommentPlaceholder'
  | 'addCommentBtn'
  | 'returnCorrectionBtn'
  | 'markReviewedBtn'
  | 'reviewLogTitle'
  | 'noReviewsYet'
  | 'auditTitle'
  | 'auditSub'
  | 'thisRunAudit'
  | 'workspaceAudit'
  | 'reportTitle'
  | 'reportSubtitle'
  | 'reportTabSimple'
  | 'reportTabFull'
  | 'exportRawCsv'
  | 'exportDerivedCsv'
  | 'exportSummaryCsv'
  | 'downloadPdfBtn'
  | 'printReportBtn'
  | 'reportSyntheticBanner'
  | 'reportInvalidBanner'
  | 'reportHeaderLabel'
  | 'reportSimpleHeader'
  | 'reportMetaTitle'
  | 'reportProtoTitle'
  | 'reportRefStrain'
  | 'reportObsRows'
  | 'reportIncubation'
  | 'reportProtocol'
  | 'reportConcSeries'
  | 'reportZeroRule'
  | 'reportEngineVer'
  | 'reportCalcTime'
  | 'reportAucTableTitle'
  | 'colStrainId'
  | 'colRole'
  | 'colAuc'
  | 'colMu3Auc'
  | 'colRatio'
  | 'colBand'
  | 'roleRefControl'
  | 'roleTestIsolate'
  | 'mu3BaselineNote'
  | 'reportQaTitle'
  | 'reportReviewTitle'
  | 'reportObsTableTitle'
  | 'colConc'
  | 'colRep'
  | 'colDilution'
  | 'colVol'
  | 'colColonies'
  | 'colCurveVal'
  | 'reportDisclaimerTitle'
  | 'reportDisclaimer1'
  | 'reportDisclaimer2'
  | 'reportSimpleDisclaimer'
  | 'noQaFlags'
  | 'pendingReviewNote'
  | 'modalNewRunTitle'
  | 'modalClose'
  | 'modalCancel'
  | 'modalCreateBtn'
  | 'footerNotice'
  | 'reportGraphsTitle'
  | 'reportGraphsSub'
  | 'ratioChartTitle'
  | 'ratioChartSub'
  | 'mu3RefLineLabel'
  | 'hvisaRangeLabel'
  | 'loginHeroTitle'
  | 'loginHeroSub'
  | 'tabPasswordLogin'
  | 'tabFaceLogin'
  | 'tabRegisterAccount'
  | 'usernameLabel'
  | 'displayNameLabel'
  | 'passwordLabel'
  | 'signInBtn'
  | 'signingInLabel'
  | 'createAccountBtn'
  | 'creatingAccountLabel'
  | 'demoAccountsTitle'
  | 'demoAccountsHint'
  | 'faceLockTitle'
  | 'faceLockSub'
  | 'startCameraBtn'
  | 'stopCameraBtn'
  | 'captureUnlockBtn'
  | 'captureEnrollBtn'
  | 'uploadSelfieBtn'
  | 'faceCapturedLabel'
  | 'faceOptionalUsername'
  | 'faceSavedBadge'
  | 'faceNotSavedBadge'
  | 'accountBtn'
  | 'signOutBtn'
  | 'accountModalTitle'
  | 'accountModalSub'
  | 'enrollFaceTitle'
  | 'enrollFaceSub'
  | 'removeFaceBtn'
  | 'dbSavedNote';

const EN: Record<TranslationKey, string> = {
  appTitle: 'सूक्ष्मवेध (SukshmaVedh)',
  navHome: 'Home',
  navOutreach: 'Village Outreach',
  navLab: 'Lab & Results',
  navReports: 'Reports',
  newRunBtn: 'New Lab Run',
  viewReportBtn: 'View Report',
  languageLabel: 'Language',
  activeRunLabel: 'Selected Run',
  whoAmILabel: 'Your Role',
  roleAnalyst: 'Field / Lab Tech',
  roleReviewer: 'Senior Microbiologist',
  roleAuditor: 'Inspector (Read-Only)',
  demoBadge: 'PRACTICE MODE · SAMPLE DATA',
  homeTitle: 'Simple Village-to-Lab Resistance Tracker',
  homeSubtitle:
    'Follow the 3 simple steps below to send samples from tribal villages, check lab plate counts, and read easy reports in your local language.',
  howItWorksTitle: 'How to Use This App (3 Easy Steps)',
  step1Title: '1. Send Village Sample',
  step1Desc:
    'Record a sample in an ice-box (works offline too), check travel hours, and track delivery from village to lab.',
  step1Action: 'Open Village Outreach',
  step2Title: '2. Enter Counts & Check Quality',
  step2Desc:
    'Type colony counts from lab plates, run the automatic curve calculation, and fix any red quality alerts.',
  step2Action: 'Open Lab & Results',
  step3Title: '3. Read & Share Report',
  step3Desc:
    'Switch between an easy ASHA/village summary with audio or the full lab report, and print or download.',
  step3Action: 'Open Reports',
  loadDemoBtn: 'Try Sample Practice Run',
  compareRunsBtn: 'Compare Multiple Runs',
  kpiTotalRuns: 'Total Lab Runs',
  kpiTotalRunsSub: 'Saved safely in database',
  kpiCalculated: 'Results Ready',
  kpiCalculatedSub: 'Curve & ratio calculated',
  kpiPending: 'Waiting Review',
  kpiPendingSub: 'Needs microbiologist check',
  kpiBlocked: 'Needs Fix',
  kpiBlockedSub: 'Blocked by quality check',
  recentRunsTitle: 'Recent Lab Runs',
  recentRunsSub: 'Click a button on the right to enter counts, view results, or print a report.',
  colRunId: 'Run Code',
  colDate: 'Date',
  colMethod: 'Test Method',
  colSamples: 'Test Samples',
  colRows: 'Plate Rows',
  colStatus: 'Status',
  colQuality: 'Quality Check',
  colActions: 'Open',
  btnOpenLab: 'Enter Counts',
  btnOpenReport: 'Results & Graph',
  btnOpenQa: 'Quality Check',
  noIssues: 'All OK',
  blockingLabel: 'must fix',
  warnLabel: 'warning',
  statusReviewed: 'Approved & Reviewed',
  statusCalculated: 'Calculated · Waiting Review',
  statusValidated: 'Inputs Checked',
  statusInvalidated: 'Needs Recalculation',
  statusDraft: 'Draft (In Progress)',
  qaBlocking: 'STOP · MUST FIX',
  qaWarning: 'WARNING',
  qaInfo: 'NOTE',
  bandBelow: 'Normal Range (< lower limit)',
  bandHvisa: 'Watch Closely (hVISA range)',
  bandExpert: 'Needs Specialist Review (> upper limit)',
  bandNotCalc: 'Not calculated yet',
  labTitle: 'Laboratory & Results Workspace',
  labSubtitle:
    'Follow steps 1 to 3 in order: enter plate colony counts, view the growth curve result, and complete the quality sign-off.',
  labStep1: 'Step 1: Enter Plate Counts',
  labStep2: 'Step 2: Growth Curve & Results',
  labStep3: 'Step 3: Quality Check & Approval',
  labStep1Help:
    'Enter or import colony numbers from your lab plates, click Save, and click Calculate to generate results.',
  labStep2Help:
    'Compare your test sample curve against the Mu3 control line. You can also compare multiple runs side by side.',
  labStep3Help:
    'Check any red or amber warnings before approving the run. Plain-language help is available for every alert.',
  glossaryToggle: 'What do these lab words mean?',
  glossaryMu3Title: 'Mu3 Control Strain',
  glossaryMu3Desc: 'A known reference bacteria tested in the exact same run as your village sample so results stay fair.',
  glossaryCfuTitle: 'Colonies & CFU/mL',
  glossaryCfuDesc: 'The number of live bacteria spots counted on each agar plate at different medicine levels.',
  glossaryAucTitle: 'AUC & Ratio',
  glossaryAucDesc: 'Total survival area under the growth curve. If Test AUC / Mu3 AUC is 0.90–1.30, the sample needs closer attention.',
  glossaryQaTitle: 'Red / Amber Quality Checks',
  glossaryQaDesc: 'Automatic checks that stop printing if data is missing, wrong, or unequal before a specialist approves it.',
  outreachTitle: 'Village Outreach & Sample Cold-Chain',
  outreachSubtitle:
    'Log village samples even without internet, track ice-box transport hours, plan mobile camps, and share audio health guides.',
  onlineSimulateOffline: 'Online · Test Offline Mode',
  offlineModeActive: 'Offline Mode Active (Saving Locally)',
  syncQueuedBtn: 'Sync Queued Samples',
  exportBundleBtn: 'Download Offline File',
  kpiClusters: 'Tribal PHC Blocks',
  kpiActiveSamples: 'Samples on the Way',
  kpiColdAlerts: 'Cold-Box Alerts',
  kpiCamps: 'Planned Health Camps',
  tabFieldSamples: 'Send & Track Samples',
  tabClustersCamps: 'Villages & Health Camps',
  tabCardsAudio: 'Picture & Audio Guides',
  logSampleTitle: 'Send New Village Sample',
  logSampleSub: 'Works with or without internet. Never enter patient names; use codes only.',
  sampleCodeLabel: 'Sample Code',
  chwIdLabel: 'Health Worker ID',
  clusterSelectLabel: 'PHC / Block Name',
  villageLabel: 'Village / Hamlet',
  carrierLabel: 'Cooling Box Type',
  transitHoursLabel: 'Travel Hours',
  linkRunLabel: 'Link to Lab Run (optional)',
  coldSealCheck: 'Ice pack is cold and seal is intact',
  notesLabel: 'Transport Notes (no patient names)',
  saveQueueBtn: 'Save Offline (Sync Later)',
  saveDispatchBtn: 'Send Sample Record',
  dispatchesTitle: 'Village-to-Lab Sample Tracker',
  dispatchesSub: 'Flags samples delayed over 24 hours; copy an easy SMS update for the village health worker.',
  coldChainOk: 'Ice-Box OK',
  delayWarning: 'Delayed > 24h',
  coldChainBreach: 'Cold-Chain Broken',
  statusInTransit: 'On the Way',
  statusAtLab: 'Reached Lab',
  statusReturned: 'Report Sent to Village PHC',
  markReceivedBtn: 'Mark Reached Lab',
  returnPhcBtn: 'Send Report Back',
  copySmsBtn: 'Copy SMS',
  copiedSmsBtn: 'Copied!',
  offlineQueueTitle: 'Offline Field Queue',
  offlineQueueSub: 'Saved safely on this device while offline. Click Sync Now when connected.',
  clearQueueBtn: 'Clear Queue',
  syncNowBtn: 'Sync Now',
  syncingLabel: 'Syncing...',
  iceBoxOption: 'Ice Box (2–8 °C)',
  incubatorOption: 'Portable Incubator',
  ambientOption: 'Ambient Carrier',
  switchRoleNote: 'Switch role to Lab Tech or Senior Microbiologist to edit or schedule.',
  clusterTableTitle: 'Tribal Block & PHC Summary',
  clusterTableSub: 'Shows sample counts, lab findings, and cold-box alerts for each tribal area.',
  registerClusterBtn: 'Add New PHC Block',
  clusterCodeLabel: 'Block Code',
  districtLabel: 'District',
  stateLabel: 'State',
  primaryLangLabel: 'Main Language',
  connectivityLabel: 'Internet Signal',
  referralLabLabel: 'District Lab',
  ashaCountLabel: 'ASHA Workers',
  saveClusterBtn: 'Save Block',
  savingLabel: 'Saving...',
  colClusterDistrict: 'Block & District',
  colLangSync: 'Language & Signal',
  colFieldSamples: 'Field Samples',
  colLinkedRuns: 'Lab Runs',
  colHvisaRange: 'hVISA Watch',
  colExpertReview: 'Expert Review',
  colColdAlerts: 'Cold Alerts',
  scheduleCampTitle: 'Plan Mobile Health Camp',
  campsTableTitle: 'Upcoming & Past Village Camps',
  campsTableSub: 'Track dates, villages, and services for mobile medical teams.',
  campCodeLabel: 'Camp Code',
  campDateLabel: 'Camp Date',
  campClusterLabel: 'PHC Block',
  campVillageLabel: 'Villages / Hamlets',
  campChwLabel: 'Lead Worker ID',
  campHouseholdsLabel: 'Est. Homes',
  campServicesLabel: 'Camp Services & Kits',
  scheduleCampBtn: 'Schedule Camp',
  colCampDate: 'Camp & Date',
  colClusterHamlets: 'Block & Villages',
  colServices: 'Services',
  colHouseholds: 'Homes',
  campScheduled: 'Scheduled',
  campActive: 'Active',
  campCompleted: 'Completed',
  selectLangTitle: 'Choose Language for Guides & Audio',
  selectLangSub: 'Easy words and spoken audio designed for village meetings and low-literacy sharing.',
  printCardsBtn: 'Print Picture Cards',
  runSummaryTitle: 'Simple Lab Update for Village Health Workers',
  runSummarySub: 'Explains the selected lab run in everyday words without technical jargon.',
  refreshSummaryBtn: 'Update Text',
  listenAudioBtn: 'Listen (Audio)',
  stopAudioBtn: 'Stop Audio',
  copyTextBtn: 'Copy Message',
  communityAidLabel: 'Village Health Guide',
  copyCardBtn: 'Copy Card',
  expWorkspaceTitle: 'Enter Plate Colony Counts',
  editMetaBtn: 'Edit Run Info & Method',
  hideMetaBtn: 'Hide Run Info',
  cardTestIsolates: 'Test Samples',
  cardObsRows: 'plate rows entered',
  cardRefControl: 'Control Reference',
  cardRefSub: 'Same-run comparison baseline',
  cardRunStatus: 'Current Status',
  cardNoQaFlags: 'No quality warnings',
  obsDataTitle: 'Plate Counts Table',
  obsDataSub: 'Enter colonies counted on each plate. CFU/mL and log values calculate automatically.',
  lockedObsNote: 'Read-only in current role',
  addRowBtn: 'Add Row',
  addSeriesBtn: 'Add Sample Series',
  importCsvBtn: 'Import CSV',
  saveObsBtn: 'Save Counts',
  validateInputsBtn: 'Check Inputs',
  calcPapAucBtn: 'Calculate Results',
  rawPreservedNote: 'Original numbers are kept safe. Any edit requires recalculating before printing final reports.',
  activeQaTitle: 'Active Quality Warnings',
  openFullQaBtn: 'Go to Quality Check',
  colDelete: 'Del',
  csvModalTitle: 'Import Plate Counts (CSV)',
  csvFillSample: 'Load Sample CSV',
  csvDownloadSample: 'Download Sample CSV',
  csvImportReplace: 'Replace current rows',
  csvImportAppend: 'Add to current rows',
  csvApplyBtn: 'Import Rows',
  singleRunMode: 'Single Lab Run',
  comparativeMode: 'Compare Multiple Runs',
  modeSwitchHint: 'View this run curve or compare multiple lab runs side by side.',
  analysisHeaderTitle: 'Growth Curve & PAP-AUC Results',
  protocolSettingsBtn: 'Method & Limit Settings',
  hideProtocolSettingsBtn: 'Hide Settings',
  recalcPapAucBtn: 'Recalculate Results',
  notComputedTitle: 'Results Not Calculated Yet',
  notComputedDesc: 'Enter plate counts in Step 1 and click Calculate Results to draw the growth curve.',
  openWorkspaceBtn: 'Go to Step 1 (Enter Counts)',
  inspectBlockingBtn: 'Check Blocking Errors',
  combinedCurvesBtn: 'All Samples Together',
  individualCurvesBtn: 'One Sample vs. Mu3',
  compareFilterLabel: 'Show:',
  allIsolatesBtn: 'All Samples',
  shadedAucLabel: 'Shaded Area:',
  noneOption: 'None',
  soloCurveBtn: 'Focus Curve',
  showAllBtn: 'Show All',
  testAucLabel: 'Sample AUC',
  mu3AucLabel: 'Control (Mu3) AUC',
  papRatioLabel: 'PAP-AUC Ratio',
  thresholdsHeading: 'Decision Limits Used',
  qaContextTitle: 'Quality & Safety Checks',
  reviewRunBtn: 'Open Quality Review',
  exportReportLink: 'Go to Reports',
  calcDetailsTitle: 'Step-by-Step Math Details',
  calcDetailsSub: 'Shows each trapezoid slice, plate CFU/mL math, and replicate averages.',
  tabSegments: 'Curve Slices (AUC)',
  tabObsCalc: 'Plate Math',
  tabReplicates: 'Replicate Averages',
  chartTitle: 'Survival Curve (Bacteria vs. Medicine)',
  chartSubtitle: 'Higher line means more bacteria survived at that medicine level.',
  chartHoverHint: 'Move pointer over dots to see values',
  chartXAxis: 'Medicine level · Vancomycin (mg/L)',
  chartYAxis: 'Bacteria survival · log10(CFU/mL)',
  chartHollowNote: 'Hollow dot = 0 colonies (detection floor used)',
  compTitle: 'Compare Multiple Lab Runs',
  compSubtitle: 'Overlay curves across different villages or dates, each measured against its own Mu3 control.',
  refreshBtn: 'Refresh',
  downloadIsolateCsvBtn: 'Download Sample Table CSV',
  downloadRunDiffCsvBtn: 'Download Run Summary CSV',
  filterHeading: 'Filter Runs & Samples',
  overlayMu3Check: 'Show Mu3 control curves',
  includeStaleCheck: 'Include runs needing recalculation',
  compCurvesTitle: 'Overlay Curves',
  compCurvesSub: 'Dashed lines show Mu3 reference or comparison runs.',
  compTableTitle: 'All Compared Samples',
  qaTitle: 'Quality Check & Specialist Approval',
  qaSubDisclaimer: 'Checks laboratory data accuracy only, not a patient medical diagnosis.',
  qaRulesTitle: '8 Automatic Lab Safety Checks',
  qaRulesSub: 'Checks for missing controls, wrong dilutions, or missing zero-colony rules.',
  qaFlagsTitle: 'Quality Alerts',
  qaFlagsSub: 'Red alerts must be fixed before results can be approved.',
  filterAll: 'All',
  filterRed: 'Red (Must Fix)',
  filterAmber: 'Amber (Warning)',
  filterInfo: 'Note',
  noFlagsInFilter: 'No alerts in this filter.',
  goToRowBtn: 'Go to Row',
  plainGuideBtn: 'Simple Explanation',
  acknowledgeBtn: 'Acknowledge',
  acknowledgedBy: 'Checked by',
  resolutionLabel: 'How to fix:',
  reviewDecisionTitle: 'Specialist Sign-Off',
  reviewerRoleReq: 'Senior Microbiologist role needed',
  reviewDecisionDesc: 'Approving confirms the lab numbers and quality checks are valid.',
  reviewerCommentLabel: 'Review Notes',
  reviewerCommentPlaceholder: 'Write check notes or why correction is needed...',
  addCommentBtn: 'Save Note',
  returnCorrectionBtn: 'Send Back for Fix',
  markReviewedBtn: 'Approve Run',
  reviewLogTitle: 'Sign-Off History',
  noReviewsYet: 'No specialist notes recorded yet.',
  auditTitle: 'Full Change History',
  auditSub: 'Permanent log of every plate edit, calculation, and approval.',
  thisRunAudit: 'This Run',
  workspaceAudit: 'All Runs',
  reportTitle: 'Reports & Printouts',
  reportSubtitle: 'Choose Simple Village Summary for community workers or Full Lab Report for technical records.',
  reportTabSimple: 'Simple Village Summary',
  reportTabFull: 'Full Lab Report',
  exportRawCsv: 'Raw Data CSV',
  exportDerivedCsv: 'Calculated CSV',
  exportSummaryCsv: 'Summary CSV',
  downloadPdfBtn: 'Download PDF',
  printReportBtn: 'Print / Save PDF',
  reportSyntheticBanner:
    'PRACTICE / SAMPLE DATA: This is a demonstration dataset for training and workflow review only.',
  reportInvalidBanner:
    'RECALCULATION NEEDED: Plate numbers were changed after the last calculation. Please recalculate in Lab & Results.',
  reportHeaderLabel: 'सूक्ष्मवेध (SukshmaVedh) · Laboratory Analysis Report',
  reportSimpleHeader: 'सूक्ष्मवेध (SukshmaVedh) · Simple Community & ASHA Health Worker Summary',
  reportMetaTitle: 'Run Information',
  reportProtoTitle: 'Test Method Settings',
  reportRefStrain: 'Control Strain',
  reportObsRows: 'Total Plate Rows',
  reportIncubation: 'Growth Conditions',
  reportProtocol: 'Method Name',
  reportConcSeries: 'Vancomycin Levels',
  reportZeroRule: 'Zero-Colony Rule',
  reportEngineVer: 'Calculator Version',
  reportCalcTime: 'Calculated On',
  reportAucTableTitle: 'Result Comparison Summary (AUC & Ratio)',
  colStrainId: 'Sample ID',
  colRole: 'Type',
  colAuc: 'Area (AUC)',
  colMu3Auc: 'Control (Mu3) AUC',
  colRatio: 'Ratio',
  colBand: 'Plain Meaning',
  roleRefControl: 'Reference Control',
  roleTestIsolate: 'Test Sample',
  mu3BaselineNote: 'Control benchmark in same run',
  reportQaTitle: 'Quality Check Warnings',
  reportReviewTitle: 'Reviewer Sign-Off',
  reportObsTableTitle: 'Plate Counts & Calculations',
  colConc: 'Conc (mg/L)',
  colRep: 'Rep',
  colDilution: 'Dilution',
  colVol: 'Vol (mL)',
  colColonies: 'Colonies',
  colCurveVal: 'Graph Value',
  reportDisclaimerTitle: 'Important Scope Notice',
  reportDisclaimer1:
    '1. Ratios depend on the laboratory plate dilution, volume plated, and zero-colony rule selected in the method profile.',
  reportDisclaimer2:
    '2. This report checks laboratory data quality only and is not a personal medical diagnosis or medicine prescription.',
  reportSimpleDisclaimer:
    'Awareness summary only. Always guide anyone with ongoing fever or unhealed wounds to visit the nearest PHC doctor.',
  noQaFlags: 'No quality problems found.',
  pendingReviewNote: 'Waiting for Senior Microbiologist approval.',
  modalNewRunTitle: 'Start a New Lab Run',
  modalClose: 'Close',
  modalCancel: 'Cancel',
  modalCreateBtn: 'Create Lab Run',
  footerNotice: 'सूक्ष्मवेध (SukshmaVedh) · Rural & Tribal Lab Bridge · No personal patient names stored',
  navDashboard: 'Dashboard',
  navExperiments: 'Experiments',
  navAnalysis: 'PAP-AUC Analysis',
  navQa: 'Quality Assurance',
  loginRegisterBtn: 'Login / Register',
  portalBannerSubtitle: 'Public Health Microbiology, PAP-AUC QA & Rural Surveillance Portal',
  portalStripLabel: 'Microbiology Surveillance & Rural Health Portal',
  portalMissionBadge: 'NATIONAL & RURAL MICROBIOLOGY BRIDGE',
  portalMissionTitle: 'Population Analysis Profile (PAP-AUC) & Village Surveillance Portal',
  portalMissionDesc:
    'A unified laboratory quality-assurance and rural community outreach platform comparing vancomycin-exposed Staphylococcus aureus growth against Mu3 reference benchmarks without storing personal patient names.',
  portalDivisionsHeading: 'Explore Portal Divisions & Modules',
  portalUpdatesHeading: 'Latest Lab Updates, Camps & SOPs',
  portalTabsOverview: 'Portal Overview',
  portalTabsModules: 'All 7 Modules',
  portalTabsMethod: 'PAP-AUC Method & Rules',
  portalTabsRural: 'Village Health Bridge',
  portalSignInPrompt: 'Sign in with Password or Face Lock to open full interactive workspace modules.',
  portalExploreBtn: 'Sign In to Workspace',
  portalOpenModuleBtn: 'Open Module',
  fontDecreaseTitle: 'Decrease text size',
  fontResetTitle: 'Reset text size',
  fontIncreaseTitle: 'Increase text size',
  reportGraphsTitle: 'Visual Graphs (Survival Curve & PAP-AUC Ratio)',
  reportGraphsSub: 'Same-run Mu3 control benchmark compared against test bacterial samples.',
  ratioChartTitle: 'PAP-AUC Ratio Comparison Graph',
  ratioChartSub: 'Values between 0.90 and 1.30 fall within the configured hVISA range; above 1.30 requires specialist review.',
  mu3RefLineLabel: 'Mu3 Benchmark (1.000)',
  hvisaRangeLabel: 'hVISA Range (0.90 – 1.30)',
  loginHeroTitle: 'Sign in to सूक्ष्मवेध (SukshmaVedh)',
  loginHeroSub: 'Secure access for village health workers, lab technicians, and microbiologists. Saved in the local SQLite database.',
  tabPasswordLogin: 'Password Login',
  tabFaceLogin: 'Face Lock',
  tabRegisterAccount: 'Create Account',
  usernameLabel: 'Username',
  displayNameLabel: 'Full Name / Title',
  passwordLabel: 'Password',
  signInBtn: 'Sign In',
  signingInLabel: 'Signing in...',
  createAccountBtn: 'Create Account & Sign In',
  creatingAccountLabel: 'Creating account...',
  demoAccountsTitle: 'Ready Demo Accounts (SQLite Database)',
  demoAccountsHint: 'Click any account to auto-fill credentials (password: hvisa123):',
  faceLockTitle: 'Face Lock Camera Unlock',
  faceLockSub: 'Look straight into the camera or upload a clear front photo to unlock with your saved SQLite Face Lock profile.',
  startCameraBtn: 'Start Camera',
  stopCameraBtn: 'Stop Camera',
  captureUnlockBtn: 'Scan Face & Unlock',
  captureEnrollBtn: 'Capture & Save Face Lock',
  uploadSelfieBtn: 'Or Upload Face Photo',
  faceCapturedLabel: 'Face captured and ready to save in database.',
  faceOptionalUsername: 'Username (optional; leave blank to auto-match)',
  faceSavedBadge: 'Face Lock Active',
  faceNotSavedBadge: 'Password Only',
  accountBtn: 'Account & Face Lock',
  signOutBtn: 'Sign Out',
  accountModalTitle: 'User Account & Face Lock Security',
  accountModalSub: 'Your password hash and Face Lock profile are stored locally in the SQLite database.',
  enrollFaceTitle: 'Enroll or Update Face Lock',
  enrollFaceSub: 'Once saved, you can unlock the app using your camera without typing a password.',
  removeFaceBtn: 'Disable Face Lock',
  dbSavedNote: 'Persisted in SQLite database (/data/hvisa_insight.db)',
};

const HI: Record<TranslationKey, string> = {
  appTitle: 'सूक्ष्मवेध',
  navHome: 'होम',
  navOutreach: 'ग्राम स्वास्थ्य सेवा',
  navLab: 'लैब और जांच',
  navReports: 'रिपोर्ट',
  newRunBtn: 'नई लैब जांच',
  viewReportBtn: 'रिपोर्ट देखें',
  languageLabel: 'भाषा',
  activeRunLabel: 'चुनी गई जांच',
  whoAmILabel: 'आपकी भूमिका',
  roleAnalyst: 'फील्ड / लैब तकनीशियन',
  roleReviewer: 'वरिष्ठ माइक्रोबायोलॉजिस्ट',
  roleAuditor: 'निरीक्षक (केवल देखें)',
  demoBadge: 'अभ्यास मोड · नमूना डेटा',
  homeTitle: 'गांव से लैब तक सरल जांच ट्रैकर',
  homeSubtitle:
    'आदिवासी गांवों से सैंपल भेजने, लैब की प्लेट गिनती जांचने और अपनी भाषा में आसान रिपोर्ट पढ़ने के लिए नीचे दिए 3 आसान कदम अपनाएं।',
  howItWorksTitle: 'इस ऐप का उपयोग कैसे करें (3 आसान कदम)',
  step1Title: '1. गांव से सैंपल भेजें',
  step1Desc:
    'आइस-बॉक्स में सैंपल दर्ज करें (बिना इंटरनेट भी चलता है), यात्रा के घंटे जांचें और लैब तक पहुंच ट्रैक करें।',
  step1Action: 'ग्राम स्वास्थ्य सेवा खोलें',
  step2Title: '2. गिनती भरें और गुणवत्ता जांचें',
  step2Desc:
    'लैब प्लेट की कॉलोनी गिनती लिखें, अपने-आप ग्राफ गणना चलाएं और लाल चेतावनी ठीक करें।',
  step2Action: 'लैब और जांच खोलें',
  step3Title: '3. रिपोर्ट पढ़ें और साझा करें',
  step3Desc:
    'आशा कार्यकर्ताओं के लिए सरल भाषा/ऑडियो सारांश या पूरी लैब रिपोर्ट देखें और प्रिंट करें।',
  step3Action: 'रिपोर्ट खोलें',
  loadDemoBtn: 'अभ्यास सैंपल चलाएं',
  compareRunsBtn: 'कई जांचों की तुलना करें',
  kpiTotalRuns: 'कुल लैब जांच',
  kpiTotalRunsSub: 'डेटाबेस में सुरक्षित',
  kpiCalculated: 'तैयार परिणाम',
  kpiCalculatedSub: 'ग्राफ और अनुपात तैयार',
  kpiPending: 'समीक्षा बाकी',
  kpiPendingSub: 'विशेषज्ञ जांच की प्रतीक्षा',
  kpiBlocked: 'सुधार जरूरी',
  kpiBlockedSub: 'गुणवत्ता जांच से रुका',
  recentRunsTitle: 'हाल की लैब जांचें',
  recentRunsSub: 'गिनती भरने, ग्राफ देखने या रिपोर्ट प्रिंट करने के लिए दाईं ओर बटन दबाएं।',
  colRunId: 'जांच कोड',
  colDate: 'तारीख',
  colMethod: 'जांच नियम',
  colSamples: 'सैंपल संख्या',
  colRows: 'प्लेट पंक्तियाँ',
  colStatus: 'स्थिति',
  colQuality: 'गुणवत्ता जांच',
  colActions: 'खोलें',
  btnOpenLab: 'गिनती भरें',
  btnOpenReport: 'परिणाम व ग्राफ',
  btnOpenQa: 'गुणवत्ता जांच',
  noIssues: 'सब ठीक है',
  blockingLabel: 'सुधार जरूरी',
  warnLabel: 'चेतावनी',
  statusReviewed: 'स्वीकृत और जांचा गया',
  statusCalculated: 'गणना पूर्ण · समीक्षा बाकी',
  statusValidated: 'डेटा सही है',
  statusInvalidated: 'दोबारा गणना जरूरी',
  statusDraft: 'ड्राफ्ट (अधूरा)',
  qaBlocking: 'रुकें · सुधार जरूरी',
  qaWarning: 'चेतावनी',
  qaInfo: 'सूचना',
  bandBelow: 'सामान्य सीमा (निचली सीमा से कम)',
  bandHvisa: 'ध्यान दें (hVISA सीमा में)',
  bandExpert: 'विशेषज्ञ जांच जरूरी (ऊपरी सीमा से अधिक)',
  bandNotCalc: 'अभी गणना नहीं हुई',
  labTitle: 'लैब और परिणाम कार्यक्षेत्र',
  labSubtitle: 'क्रम से 1 से 3 कदम पूरे करें: प्लेट गिनती भरें, ग्राफ परिणाम देखें और गुणवत्ता स्वीकृति दें।',
  labStep1: 'कदम 1: प्लेट गिनती भरें',
  labStep2: 'कदम 2: ग्राफ और परिणाम',
  labStep3: 'कदम 3: गुणवत्ता जांच और स्वीकृति',
  labStep1Help: 'प्लेट से कॉलोनी संख्या भरें या CSV डालें, फिर सेव करें और गणना बटन दबाएं।',
  labStep2Help: 'अपने सैंपल ग्राफ की तुलना Mu3 नियंत्रण लाइन से करें। आप कई जांचों की तुलना भी कर सकते हैं।',
  labStep3Help: 'स्वीकृति देने से पहले सभी लाल या पीली चेतावनियों की जांच करें। हर चेतावनी का सरल अर्थ उपलब्ध है।',
  glossaryToggle: 'इन लैब शब्दों का सरल अर्थ क्या है?',
  glossaryMu3Title: 'Mu3 नियंत्रण मानक',
  glossaryMu3Desc: 'एक ज्ञात तुलनात्मक जीवाणु जिसे हर जांच में साथ चलाया जाता है ताकि परिणाम सही रहें।',
  glossaryCfuTitle: 'कॉलोनी और CFU/mL',
  glossaryCfuDesc: 'विभिन्न दवा स्तरों पर लैब प्लेट में उगे जीवित जीवाणुओं की गिनती।',
  glossaryAucTitle: 'AUC और अनुपात',
  glossaryAucDesc: 'ग्राफ के नीचे का कुल क्षेत्र। यदि सैंपल / Mu3 अनुपात 0.90–1.30 के बीच है, तो विशेष ध्यान जरूरी है।',
  glossaryQaTitle: 'लाल / पीली गुणवत्ता जांच',
  glossaryQaDesc: 'स्वचालित सुरक्षा जांच जो अधूरा या गलत डेटा होने पर रिपोर्ट को स्वीकृत होने से रोकती है।',
  outreachTitle: 'ग्राम स्वास्थ्य सेवा और कोल्ड-चेन ट्रैकर',
  outreachSubtitle:
    'बिना इंटरनेट सैंपल दर्ज करें, आइस-बॉक्स यात्रा समय जांचें, मोबाइल कैंप तय करें और ऑडियो स्वास्थ्य कार्ड सुनें।',
  onlineSimulateOffline: 'ऑनलाइन · ऑफलाइन मोड आज़माएं',
  offlineModeActive: 'ऑफलाइन मोड चालू (स्थानीय कतार)',
  syncQueuedBtn: 'रुके सैंपल सिंक करें',
  exportBundleBtn: 'ऑफलाइन फाइल डाउनलोड',
  kpiClusters: 'आदिवासी पीएचसी क्लस्टर',
  kpiActiveSamples: 'रास्ते में / लैब में सैंपल',
  kpiColdAlerts: 'कोल्ड-बॉक्स चेतावनी',
  kpiCamps: 'आगामी स्वास्थ्य कैंप',
  tabFieldSamples: 'सैंपल भेजें व ट्रैक करें',
  tabClustersCamps: 'गांव और मोबाइल कैंप',
  tabCardsAudio: 'चित्र और ऑडियो गाइड',
  logSampleTitle: 'नया गांव सैंपल दर्ज करें',
  logSampleSub: 'इंटरनेट के बिना भी काम करता है। मरीज का नाम कभी न लिखें, केवल कोड लिखें।',
  sampleCodeLabel: 'सैंपल कोड',
  chwIdLabel: 'स्वास्थ्य कार्यकर्ता आईडी',
  clusterSelectLabel: 'पीएचसी / ब्लॉक नाम',
  villageLabel: 'गांव / टोला / पाड़ा',
  carrierLabel: 'ठंडे बॉक्स का प्रकार',
  transitHoursLabel: 'यात्रा के घंटे',
  linkRunLabel: 'लैब जांच से जोड़ें (वैकल्पिक)',
  coldSealCheck: 'आइस-पैक ठंडा है और सील सुरक्षित है',
  notesLabel: 'परिवहन टिप्पणी (नाम न लिखें)',
  saveQueueBtn: 'ऑफलाइन सहेजें (बाद में सिंक)',
  saveDispatchBtn: 'सैंपल रिकॉर्ड भेजें',
  dispatchesTitle: 'गांव से लैब तक सैंपल ट्रैकर',
  dispatchesSub: '24 घंटे से अधिक देरी होने पर चेतावनी दिखाता है; आशा दीदी के लिए SMS कॉपी करें।',
  coldChainOk: 'कोल्ड-चेन ठीक',
  delayWarning: '24 घंटे से अधिक देरी',
  coldChainBreach: 'ठंडक टूट गई',
  statusInTransit: 'रास्ते में',
  statusAtLab: 'लैब पहुंचा',
  statusReturned: 'रिपोर्ट गांव पीएचसी को भेजी',
  markReceivedBtn: 'लैब पहुंचा चिह्नित करें',
  returnPhcBtn: 'पीएचसी को रिपोर्ट भेजें',
  copySmsBtn: 'SMS कॉपी',
  copiedSmsBtn: 'कॉपी हो गया!',
  offlineQueueTitle: 'ऑफलाइन कतार',
  offlineQueueSub: 'बिना इंटरनेट सुरक्षित सहेजा गया। नेटवर्क मिलने पर सिंक करें।',
  clearQueueBtn: 'कतार साफ करें',
  syncNowBtn: 'अभी सिंक करें',
  syncingLabel: 'सिंक हो रहा है...',
  iceBoxOption: 'आइस बॉक्स (2–8 °C)',
  incubatorOption: 'पोर्टेबल इनक्यूबेटर',
  ambientOption: 'सामान्य बॉक्स',
  switchRoleNote: 'बदलाव या कैंप तय करने के लिए लैब तकनीशियन या वरिष्ठ माइक्रोबायोलॉजिस्ट भूमिका चुनें।',
  clusterTableTitle: 'आदिवासी ब्लॉक और पीएचसी सारांश',
  clusterTableSub: 'हर क्षेत्र के सैंपल, लैब परिणाम और कोल्ड-बॉक्स चेतावनियां दिखाता है।',
  registerClusterBtn: 'नया पीएचसी ब्लॉक जोड़ें',
  clusterCodeLabel: 'ब्लॉक कोड',
  districtLabel: 'जिला',
  stateLabel: 'राज्य',
  primaryLangLabel: 'मुख्य भाषा',
  connectivityLabel: 'इंटरनेट स्थिति',
  referralLabLabel: 'जिला लैब',
  ashaCountLabel: 'आशा संख्या',
  saveClusterBtn: 'ब्लॉक सहेजें',
  savingLabel: 'सहेजा जा रहा है...',
  colClusterDistrict: 'ब्लॉक और जिला',
  colLangSync: 'भाषा और नेटवर्क',
  colFieldSamples: 'गांव सैंपल',
  colLinkedRuns: 'जुड़ी लैब जांच',
  colHvisaRange: 'hVISA निगरानी',
  colExpertReview: 'विशेषज्ञ जांच',
  colColdAlerts: 'कोल्ड चेतावनी',
  scheduleCampTitle: 'मोबाइल स्वास्थ्य कैंप तय करें',
  campsTableTitle: 'आगामी और पुराने ग्राम कैंप',
  campsTableSub: 'मोबाइल मेडिकल टीम के गांव, तारीख और सेवाएं देखें।',
  campCodeLabel: 'कैंप कोड',
  campDateLabel: 'कैंप तारीख',
  campClusterLabel: 'पीएचसी ब्लॉक',
  campVillageLabel: 'गांव / टोला',
  campChwLabel: 'प्रमुख कार्यकर्ता आईडी',
  campHouseholdsLabel: 'अनुमानित घर',
  campServicesLabel: 'कैंप सेवाएं और किट',
  scheduleCampBtn: 'कैंप तय करें',
  colCampDate: 'कैंप व तारीख',
  colClusterHamlets: 'ब्लॉक व गांव',
  colServices: 'सेवाएं',
  colHouseholds: 'घर',
  campScheduled: 'निर्धारित',
  campActive: 'चालू',
  campCompleted: 'पूर्ण',
  selectLangTitle: 'गाइड और ऑडियो के लिए भाषा चुनें',
  selectLangSub: 'ग्राम बैठक और कम पढ़े-लिखे लोगों के लिए सरल शब्द और बोलकर सुनाने वाला ऑडियो।',
  printCardsBtn: 'चित्र कार्ड प्रिंट करें',
  runSummaryTitle: 'आशा / ग्राम कार्यकर्ता के लिए सरल लैब अपडेट',
  runSummarySub: 'बिना कठिन शब्दों के चुनी गई लैब जांच का आसान अर्थ बताता है।',
  refreshSummaryBtn: 'अपडेट करें',
  listenAudioBtn: 'सुनें (ऑडियो)',
  stopAudioBtn: 'ऑडियो रोकें',
  copyTextBtn: 'संदेश कॉपी करें',
  communityAidLabel: 'ग्राम स्वास्थ्य गाइड',
  copyCardBtn: 'कार्ड कॉपी करें',
  expWorkspaceTitle: 'प्लेट कॉलोनी गिनती भरें',
  editMetaBtn: 'जांच जानकारी और नियम बदलें',
  hideMetaBtn: 'जानकारी छुपाएं',
  cardTestIsolates: 'जांच सैंपल',
  cardObsRows: 'प्लेट पंक्तियाँ भरी गईं',
  cardRefControl: 'नियंत्रण मानक',
  cardRefSub: 'इसी जांच का तुलना आधार',
  cardRunStatus: 'वर्तमान स्थिति',
  cardNoQaFlags: 'कोई चेतावनी नहीं',
  obsDataTitle: 'प्लेट गिनती तालिका',
  obsDataSub: 'हर प्लेट पर दिखी कॉलोनी गिनती लिखें। CFU/mL और ग्राफ मान अपने-आप निकलते हैं।',
  lockedObsNote: 'इस भूमिका में केवल पढ़ने की अनुमति है',
  addRowBtn: 'पंक्ति जोड़ें',
  addSeriesBtn: 'नया सैंपल सेट जोड़ें',
  importCsvBtn: 'CSV डालें',
  saveObsBtn: 'गिनती सहेजें',
  validateInputsBtn: 'डेटा जांचें',
  calcPapAucBtn: 'परिणाम निकालें',
  rawPreservedNote: 'मूल गिनती सुरक्षित रहती है। कोई भी बदलाव करने पर दोबारा गणना जरूरी होती है।',
  activeQaTitle: 'सक्रिय गुणवत्ता चेतावनियां',
  openFullQaBtn: 'गुणवत्ता जांच पर जाएं',
  colDelete: 'हटाएं',
  csvModalTitle: 'प्लेट गिनती CSV आयात करें',
  csvFillSample: 'नमूना CSV भरें',
  csvDownloadSample: 'नमूना CSV डाउनलोड करें',
  csvImportReplace: 'मौजूदा पंक्तियाँ बदलें',
  csvImportAppend: 'मौजूदा पंक्तियों में जोड़ें',
  csvApplyBtn: 'पंक्तियाँ आयात करें',
  singleRunMode: 'एकल जांच',
  comparativeMode: 'कई जांचों की तुलना',
  modeSwitchHint: 'इस जांच का ग्राफ देखें या कई जांचों की एक साथ तुलना करें।',
  analysisHeaderTitle: 'ग्रोथ कर्व और PAP-AUC परिणाम',
  protocolSettingsBtn: 'नियम व सीमा सेटिंग्स',
  hideProtocolSettingsBtn: 'सेटिंग्स छुपाएं',
  recalcPapAucBtn: 'फिर से गणना करें',
  notComputedTitle: 'अभी परिणाम गणना नहीं हुई',
  notComputedDesc: 'कदम 1 में प्लेट गिनती भरें और ग्राफ बनाने के लिए गणना बटन दबाएं।',
  openWorkspaceBtn: 'कदम 1 पर जाएं (गिनती भरें)',
  inspectBlockingBtn: 'अवरोधक त्रुटियां देखें',
  combinedCurvesBtn: 'सभी सैंपल एक साथ',
  individualCurvesBtn: 'एक सैंपल बनाम Mu3',
  compareFilterLabel: 'दिखाएं:',
  allIsolatesBtn: 'सभी सैंपल',
  shadedAucLabel: 'छायांकित क्षेत्र:',
  noneOption: 'कोई नहीं',
  soloCurveBtn: 'अलग ग्राफ देखें',
  showAllBtn: 'सभी दिखाएं',
  testAucLabel: 'सैंपल AUC',
  mu3AucLabel: 'नियंत्रण (Mu3) AUC',
  papRatioLabel: 'PAP-AUC अनुपात',
  thresholdsHeading: 'लागू निर्णय सीमाएं',
  qaContextTitle: 'गुणवत्ता और सुरक्षा जांच',
  reviewRunBtn: 'गुणवत्ता समीक्षा खोलें',
  exportReportLink: 'रिपोर्ट पर जाएं',
  calcDetailsTitle: 'चरण-दर-चरण गणित विवरण',
  calcDetailsSub: 'हर समलंब क्षेत्र, CFU/mL गणना और औसत दिखाता है।',
  tabSegments: 'कर्व खंड (AUC)',
  tabObsCalc: 'प्लेट गणित',
  tabReplicates: 'दोहराव औसत',
  chartTitle: 'जीवाणु वृद्धि ग्राफ (दवा बनाम कॉलोनी)',
  chartSubtitle: 'ऊंची रेखा का अर्थ है कि उस दवा स्तर पर अधिक जीवाणु जीवित रहे।',
  chartHoverHint: 'मान देखने के लिए बिंदुओं पर कर्सर ले जाएं',
  chartXAxis: 'दवा सांद्रता · Vancomycin (mg/L)',
  chartYAxis: 'जीवाणु मात्रा · log10(CFU/mL)',
  chartHollowNote: 'खाली गोला = 0 कॉलोनी (न्यूनतम सीमा लागू)',
  compTitle: 'कई लैब जांचों की तुलना',
  compSubtitle: 'विभिन्न गांवों या तारीखों के ग्राफ साथ देखें; हर सैंपल अपने ही Mu3 से मापा जाता है।',
  refreshBtn: 'ताज़ा करें',
  downloadIsolateCsvBtn: 'सैंपल तुलना CSV डाउनलोड',
  downloadRunDiffCsvBtn: 'जांच अंतर CSV डाउनलोड',
  filterHeading: 'जांच और सैंपल चुनें',
  overlayMu3Check: 'Mu3 नियंत्रण रेखाएं दिखाएं',
  includeStaleCheck: 'दोबारा गणना वाली जांच शामिल करें',
  compCurvesTitle: 'तुलनात्मक ग्राफ',
  compCurvesSub: 'टूटी रेखाएं Mu3 नियंत्रण या तुलनात्मक जांच दिखाती हैं।',
  compTableTitle: 'सभी तुलना किए गए सैंपल',
  qaTitle: 'गुणवत्ता जांच और विशेषज्ञ स्वीकृति',
  qaSubDisclaimer: 'यह केवल लैब डेटा की सटीकता जांचता है, किसी मरीज का निदान नहीं।',
  qaRulesTitle: '8 स्वचालित लैब सुरक्षा जांच',
  qaRulesSub: 'नियंत्रण कमी, गलत तनुकरण या शून्य-कॉलोनी नियम की जांच करता है।',
  qaFlagsTitle: 'गुणवत्ता चेतावनियां',
  qaFlagsSub: 'लाल चेतावनी ठीक किए बिना अंतिम स्वीकृति नहीं दी जा सकती।',
  filterAll: 'सभी',
  filterRed: 'लाल (सुधार जरूरी)',
  filterAmber: 'पीली (चेतावनी)',
  filterInfo: 'सूचना',
  noFlagsInFilter: 'इस श्रेणी में कोई चेतावनी नहीं है।',
  goToRowBtn: 'पंक्ति पर जाएं',
  plainGuideBtn: 'सरल भाषा में समझें',
  acknowledgeBtn: 'पुष्टि करें',
  acknowledgedBy: 'जांचा गया:',
  resolutionLabel: 'कैसे ठीक करें:',
  reviewDecisionTitle: 'विशेषज्ञ स्वीकृति',
  reviewerRoleReq: 'वरिष्ठ माइक्रोबायोलॉजिस्ट भूमिका जरूरी',
  reviewDecisionDesc: 'स्वीकृति का अर्थ है कि लैब गिनती और गुणवत्ता जांच सही पाई गई है।',
  reviewerCommentLabel: 'समीक्षा टिप्पणी',
  reviewerCommentPlaceholder: 'जांच टिप्पणी या सुधार का कारण लिखें...',
  addCommentBtn: 'टिप्पणी जोड़ें',
  returnCorrectionBtn: 'सुधार हेतु वापस भेजें',
  markReviewedBtn: 'जांच स्वीकृत करें',
  reviewLogTitle: 'स्वीकृति इतिहास',
  noReviewsYet: 'अभी कोई विशेषज्ञ टिप्पणी दर्ज नहीं हुई।',
  auditTitle: 'संपूर्ण बदलाव इतिहास',
  auditSub: 'हर बदलाव, गणना और स्वीकृति का स्थायी रिकॉर्ड।',
  thisRunAudit: 'यह जांच',
  workspaceAudit: 'सभी जांचें',
  reportTitle: 'रिपोर्ट और प्रिंट',
  reportSubtitle: 'ग्राम कार्यकर्ताओं के लिए सरल सारांश या तकनीकी रिकॉर्ड के लिए पूरी लैब रिपोर्ट चुनें।',
  reportTabSimple: 'सरल ग्राम सारांश',
  reportTabFull: 'पूरी लैब रिपोर्ट',
  exportRawCsv: 'कच्चा डेटा CSV',
  exportDerivedCsv: 'गणना CSV',
  exportSummaryCsv: 'सारांश CSV',
  downloadPdfBtn: 'PDF डाउनलोड',
  printReportBtn: 'प्रिंट / PDF सहेजें',
  reportSyntheticBanner:
    'अभ्यास / नमूना डेटा: यह केवल प्रशिक्षण और प्रणाली दिखाने के लिए काल्पनिक डेटा है।',
  reportInvalidBanner:
    'दोबारा गणना जरूरी: पिछली गणना के बाद प्लेट संख्या बदली गई है। कृपया लैब टैब में फिर से गणना करें।',
  reportHeaderLabel: 'सूक्ष्मवेध · प्रयोगशाला विश्लेषण रिपोर्ट',
  reportSimpleHeader: 'सूक्ष्मवेध · आशा और ग्राम स्वास्थ्य कार्यकर्ता सरल रिपोर्ट',
  reportMetaTitle: 'जांच की जानकारी',
  reportProtoTitle: 'जांच नियम सेटिंग्स',
  reportRefStrain: 'नियंत्रण स्ट्रेन',
  reportObsRows: 'कुल प्लेट पंक्तियाँ',
  reportIncubation: 'उष्मायन स्थिति',
  reportProtocol: 'नियम का नाम',
  reportConcSeries: 'दवा सांद्रता स्तर',
  reportZeroRule: 'शून्य-कॉलोनी नियम',
  reportEngineVer: 'कैलकुलेटर संस्करण',
  reportCalcTime: 'गणना समय',
  reportAucTableTitle: 'परिणाम तुलना सारांश (AUC व अनुपात)',
  colStrainId: 'सैंपल आईडी',
  colRole: 'प्रकार',
  colAuc: 'क्षेत्रफल (AUC)',
  colMu3Auc: 'नियंत्रण (Mu3) AUC',
  colRatio: 'अनुपात',
  colBand: 'सरल अर्थ',
  roleRefControl: 'नियंत्रण मानक',
  roleTestIsolate: 'जांच सैंपल',
  mu3BaselineNote: 'इसी जांच का मानक नियंत्रण',
  reportQaTitle: 'गुणवत्ता जांच चेतावनियां',
  reportReviewTitle: 'विशेषज्ञ हस्ताक्षर इतिहास',
  reportObsTableTitle: 'प्लेट गिनती और गणना विवरण',
  colConc: 'सांद्रता (mg/L)',
  colRep: 'दोहराव',
  colDilution: 'तनुकरण',
  colVol: 'मात्रा (mL)',
  colColonies: 'कॉलोनी',
  colCurveVal: 'ग्राफ मान',
  reportDisclaimerTitle: 'महत्वपूर्ण सूचना',
  reportDisclaimer1:
    '1. अनुपात लैब प्लेट के तनुकरण, मात्रा और शून्य-कॉलोनी नियम पर निर्भर करते हैं।',
  reportDisclaimer2:
    '2. यह रिपोर्ट केवल लैब डेटा की गुणवत्ता जांचती है; यह किसी मरीज का निदान या दवा सलाह नहीं है।',
  reportSimpleDisclaimer:
    'यह केवल जागरूकता सारांश है। लगातार बुखार या न भरने वाले घाव के लिए हमेशा नजदीकी पीएचसी डॉक्टर के पास जाएं।',
  noQaFlags: 'कोई गुणवत्ता समस्या नहीं मिली।',
  pendingReviewNote: 'वरिष्ठ माइक्रोबायोलॉजिस्ट की स्वीकृति की प्रतीक्षा है।',
  modalNewRunTitle: 'नई लैब जांच शुरू करें',
  modalClose: 'बंद करें',
  modalCancel: 'रद्द करें',
  modalCreateBtn: 'जांच बनाएं',
  footerNotice: 'सूक्ष्मवेध · ग्रामीण और आदिवासी लैब सेतु · कोई व्यक्तिगत मरीज नाम नहीं',
  navDashboard: 'डैशबोर्ड',
  navExperiments: 'प्रयोग (प्लेट डेटा)',
  navAnalysis: 'PAP-AUC विश्लेषण',
  navQa: 'गुणवत्ता आश्वासन',
  loginRegisterBtn: 'लॉगिन / पंजीकरण',
  portalBannerSubtitle: 'सार्वजनिक स्वास्थ्य सूक्ष्मजीव विज्ञान, PAP-AUC गुणवत्ता जांच और ग्रामीण सेवा पोर्टल',
  portalStripLabel: 'माइक्रोबायोलॉजी निगरानी और ग्रामीण स्वास्थ्य पोर्टल',
  portalMissionBadge: 'ग्रामीण एवं संदर्भ प्रयोगशाला सेतु',
  portalMissionTitle: 'PAP-AUC जनसंख्या विश्लेषण और ग्राम स्वास्थ्य निगरानी पोर्टल',
  portalMissionDesc:
    'यह पोर्टल ग्रामीण प्राथमिक स्वास्थ्य केंद्रों और जिला माइक्रोबायोलॉजी प्रयोगशालाओं को जोड़ता है, और बिना किसी व्यक्तिगत रोगी नाम के Mu3 मानक के साथ PAP-AUC अनुपात, 8-नियम गुणवत्ता जांच तथा स्थानीय भाषा में रिपोर्ट प्रदान करता है।',
  portalDivisionsHeading: 'पोर्टल के मुख्य विभाग और मॉड्यूल देखें',
  portalUpdatesHeading: 'ताज़ा लैब अपडेट, शिविर और नियम',
  portalTabsOverview: 'पोर्टल अवलोकन',
  portalTabsModules: 'सभी 7 मॉड्यूल',
  portalTabsMethod: 'PAP-AUC विधि और नियम',
  portalTabsRural: 'ग्राम स्वास्थ्य सेतु',
  portalSignInPrompt: 'इंटरैक्टिव लैब और ग्राम सेवा मॉड्यूल खोलने के लिए पासवर्ड या फेस लॉक से लॉगिन करें।',
  portalExploreBtn: 'कार्यक्षेत्र में लॉगिन करें',
  portalOpenModuleBtn: 'मॉड्यूल खोलें',
  fontDecreaseTitle: 'अक्षर छोटे करें',
  fontResetTitle: 'सामान्य अक्षर आकार',
  fontIncreaseTitle: 'अक्षर बड़े करें',
  reportGraphsTitle: 'ग्राफ और दृश्य परिणाम (सर्वाइवल वक्र और PAP-AUC अनुपात)',
  reportGraphsSub: 'एक ही जांच में Mu3 कंट्रोल और परीक्षण सैंपल की ग्राफ तुलना।',
  ratioChartTitle: 'PAP-AUC अनुपात तुलना ग्राफ',
  ratioChartSub: '0.90 से 1.30 के बीच का मान hVISA श्रेणी में आता है; 1.30 से ऊपर विशेषज्ञ समीक्षा जरूरी है।',
  mu3RefLineLabel: 'Mu3 मानक (1.000)',
  hvisaRangeLabel: 'hVISA सीमा (0.90 – 1.30)',
  loginHeroTitle: 'सूक्ष्मवेध में लॉगिन करें',
  loginHeroSub: 'ग्रामीण स्वास्थ्य कार्यकर्ता, लैब तकनीशियन और विशेषज्ञों के लिए सुरक्षित लॉगिन (SQLite डेटाबेस में सुरक्षित)।',
  tabPasswordLogin: 'पासवर्ड लॉगिन',
  tabFaceLogin: 'फेस लॉक',
  tabRegisterAccount: 'नया खाता बनाएं',
  usernameLabel: 'यूजरनेम',
  displayNameLabel: 'पूरा नाम / पद',
  passwordLabel: 'पासवर्ड',
  signInBtn: 'लॉगिन करें',
  signingInLabel: 'लॉगिन हो रहा है...',
  createAccountBtn: 'खाता बनाएं और प्रवेश करें',
  creatingAccountLabel: 'खाता बन रहा है...',
  demoAccountsTitle: 'तैयार डेमो खाते (SQLite डेटाबेस)',
  demoAccountsHint: 'पासवर्ड भरने के लिए किसी भी खाते पर क्लिक करें (पासवर्ड: hvisa123):',
  faceLockTitle: 'फेस लॉक कैमरा अनलॉक',
  faceLockSub: 'कैमरे की ओर सीधे देखें या अपनी साफ फोटो अपलोड करके डेटाबेस में सहेजे गए फेस लॉक से खोलें।',
  startCameraBtn: 'कैमरा चालू करें',
  stopCameraBtn: 'कैमरा बंद करें',
  captureUnlockBtn: 'चेहरा स्कैन कर लॉगिन करें',
  captureEnrollBtn: 'चेहरा स्कैन कर फेस लॉक सहेजें',
  uploadSelfieBtn: 'या चेहरे की फोटो चुनें',
  faceCapturedLabel: 'चेहरा कैप्चर हो गया है और डेटाबेस में सहेजने के लिए तैयार है।',
  faceOptionalUsername: 'यूजरनेम (वैकल्पिक, ऑटो-मैच के लिए खाली छोड़ें)',
  faceSavedBadge: 'फेस लॉक चालू',
  faceNotSavedBadge: 'केवल पासवर्ड',
  accountBtn: 'खाता और फेस लॉक',
  signOutBtn: 'लॉगआउट',
  accountModalTitle: 'उपयोगकर्ता खाता और फेस लॉक सुरक्षा',
  accountModalSub: 'आपका पासवर्ड और फेस लॉक डेटा स्थानीय SQLite डेटाबेस में सहेजा जाता है।',
  enrollFaceTitle: 'फेस लॉक जोड़ें या अपडेट करें',
  enrollFaceSub: 'सहेजने के बाद आप बिना पासवर्ड टाइप किए अपने चेहरे से ऐप खोल सकते हैं।',
  removeFaceBtn: 'फेस लॉक हटाएं',
  dbSavedNote: 'SQLite डेटाबेस में सुरक्षित',
};

const MR: Record<TranslationKey, string> = {
  ...HI,
  navHome: 'मुख्य पान',
  navOutreach: 'ग्रामीण आरोग्य सेवा',
  navLab: 'लॅब आणि तपासणी',
  navReports: 'अहवाल',
  newRunBtn: 'नवीन लॅब तपासणी',
  viewReportBtn: 'अहवाल पहा',
  languageLabel: 'भाषा',
  activeRunLabel: 'निवडलेली तपासणी',
  whoAmILabel: 'तुमची भूमिका',
  roleAnalyst: 'फील्ड / लॅब तंत्रज्ञ',
  roleReviewer: 'वरिष्ठ सूक्ष्मजीवशास्त्रज्ञ',
  roleAuditor: 'निरीक्षक (फक्त वाचन)',
  demoBadge: 'सराव मोड · नमुना डेटा',
  homeTitle: 'गावापासून लॅबपर्यंत सोपा तपासणी ट्रॅकर',
  homeSubtitle:
    'आदिवासी गावांमधून नमुने पाठवण्यासाठी, लॅब मोजणी तपासण्यासाठी आणि तुमच्या भाषेत सोपा अहवाल वाचण्यासाठी खालील ३ सोप्या पायऱ्या वापरा.',
  howItWorksTitle: 'हे ॲप कसे वापरावे (३ सोप्या पायऱ्या)',
  step1Title: '१. गावातून नमुना पाठवा',
  step1Desc: 'आइस-बॉक्समध्ये नमुना नोंदवा (इंटरनेटशिवायही चालते), प्रवासाचे तास तपासा आणि लॅबपर्यंत मागोवा घ्या.',
  step1Action: 'ग्रामीण आरोग्य सेवा उघडा',
  step2Title: '२. मोजणी भरा आणि गुणवत्ता तपासा',
  step2Desc: 'लॅब प्लेटवरील वसाहत संख्या भरा, आपोआप आलेख काढा आणि लाल सूचना दुरुस्त करा.',
  step2Action: 'लॅब आणि तपासणी उघडा',
  step3Title: '३. अहवाल वाचा आणि शेअर करा',
  step3Desc: 'आशा सेविकांसाठी सोपा सारांश व ऑडिओ किंवा पूर्ण लॅब अहवाल पहा आणि प्रिंट करा.',
  step3Action: 'अहवाल उघडा',
  loadDemoBtn: 'सराव नमुना चालवा',
  compareRunsBtn: 'अनेक तपासण्यांची तुलना करा',
  kpiTotalRuns: 'एकूण लॅब तपासण्या',
  kpiTotalRunsSub: 'डेटाबेसमध्ये सुरक्षित',
  kpiCalculated: 'तयार निकाल',
  kpiCalculatedSub: 'आलेख व गुणोत्तर पूर्ण',
  kpiPending: 'तपासणी प्रलंबित',
  kpiPendingSub: 'तज्ज्ञांच्या मंजुरीची प्रतीक्षा',
  kpiBlocked: 'दुरुस्ती आवश्यक',
  kpiBlockedSub: 'गुणवत्ता तपासणीमुळे थांबले',
  recentRunsTitle: 'अलीकडील लॅब तपासण्या',
  recentRunsSub: 'मोजणी भरण्यासाठी, निकाल पाहण्यासाठी किंवा अहवाल प्रिंट करण्यासाठी बटणावर क्लिक करा.',
  colRunId: 'तपासणी कोड',
  colDate: 'दिनांक',
  colMethod: 'तपासणी पद्धत',
  colSamples: 'नमुने',
  colRows: 'ओळी',
  colStatus: 'स्थिती',
  colQuality: 'गुणवत्ता',
  colActions: 'उघडा',
  btnOpenLab: 'मोजणी भरा',
  btnOpenReport: 'निकाल व आलेख',
  btnOpenQa: 'गुणवत्ता तपासणी',
  noIssues: 'सर्व ठीक',
  blockingLabel: 'दुरुस्ती आवश्यक',
  warnLabel: 'इशारा',
  statusReviewed: 'मंजूर व तपासलेले',
  statusCalculated: 'गणना पूर्ण · प्रतीक्षेत',
  statusValidated: 'माहिती तपासली',
  statusInvalidated: 'पुन्हा गणना आवश्यक',
  statusDraft: 'मसुदा (सुरू आहे)',
  qaBlocking: 'थांबा · दुरुस्ती आवश्यक',
  qaWarning: 'इशारा',
  qaInfo: 'माहिती',
  bandBelow: 'सामान्य मर्यादा (खालच्या मर्यादेपेक्षा कमी)',
  bandHvisa: 'लक्ष द्या (hVISA मर्यादेत)',
  bandExpert: 'तज्ज्ञ तपासणी आवश्यक (वरच्या मर्यादेपेक्षा जास्त)',
  bandNotCalc: 'अद्याप गणना नाही',
  labTitle: 'प्रयोगशाळा आणि निकाल कार्यक्षेत्र',
  labSubtitle: 'पायरी १ ते ३ क्रमाने पूर्ण करा: प्लेट मोजणी भरा, आलेख पहा आणि गुणवत्ता मंजुरी द्या.',
  labStep1: 'पायरी १: प्लेट मोजणी भरा',
  labStep2: 'पायरी २: आलेख आणि निकाल',
  labStep3: 'पायरी ३: गुणवत्ता तपासणी आणि मंजुरी',
  labStep1Help: 'प्लेटवरील वसाहत संख्या भरा किंवा CSV टाका, नंतर जतन करा आणि गणना दाबा.',
  labStep2Help: 'तुमच्या नमुन्याचा आलेख Mu3 नियंत्रण रेषेशी तपासा. अनेक तपासण्यांची तुलनाही करता येते.',
  labStep3Help: 'मंजुरी देण्यापूर्वी सर्व लाल किंवा पिवळ्या सूचना तपासा. प्रत्येक सूचनेचा सोपा अर्थ उपलब्ध आहे.',
  glossaryToggle: 'या लॅब शब्दांचा सोपा अर्थ काय आहे?',
  glossaryMu3Title: 'Mu3 नियंत्रण मानक',
  glossaryMu3Desc: 'प्रत्येक तपासणीत सोबत ठेवलेला ज्ञात मानक जिवाणू ज्यामुळे निकाल बरोबर येतो.',
  glossaryCfuTitle: 'वसाहत आणि CFU/mL',
  glossaryCfuDesc: 'वेगवेगळ्या औषध पातळीवर प्लेटवर वाढलेल्या जिवंत जिवाणूंची संख्या.',
  glossaryAucTitle: 'AUC आणि गुणोत्तर',
  glossaryAucDesc: 'आलेखाखालील एकूण क्षेत्र. नमुना / Mu3 गुणोत्तर ०.९०–१.३० असल्यास विशेष लक्ष आवश्यक.',
  glossaryQaTitle: 'लाल / पिवळी गुणवत्ता तपासणी',
  glossaryQaDesc: 'माहिती अपूर्ण किंवा चुकीची असल्यास अहवाल मंजूर होण्यापासून रोखणारी स्वयंचलित तपासणी.',
  outreachTitle: 'ग्रामीण आरोग्य सेवा व कोल्ड-चेन ट्रॅकर',
  outreachSubtitle: 'इंटरनेटशिवाय नमुने नोंदवा, थंड पेटीचे तास तपासा, फिरते शिबिर ठरवा आणि ऑडिओ माहिती ऐका.',
  onlineSimulateOffline: 'ऑनलाइन · ऑफलाइन मोड तपासा',
  offlineModeActive: 'ऑफलाइन मोड सुरू (स्थानिक रांग)',
  syncQueuedBtn: 'रांगेतील नमुने सिंक करा',
  exportBundleBtn: 'ऑफलाइन फाइल डाउनलोड',
  kpiClusters: 'आदिवासी पीएचसी केंद्र',
  kpiActiveSamples: 'प्रवासात / लॅबमधील नमुने',
  kpiColdAlerts: 'थंड पेटी सूचना',
  kpiCamps: 'नियोजित आरोग्य शिबिरे',
  tabFieldSamples: 'नमुने पाठवा व पहा',
  tabClustersCamps: 'गावे आणि शिबिरे',
  tabCardsAudio: 'चित्र आणि ऑडिओ मार्गदर्शक',
  logSampleTitle: 'नवीन गाव नमुना नोंदवा',
  logSampleSub: 'इंटरनेटशिवायही चालते. रुग्णाचे नाव कधीही लिहू नका, फक्त कोड वापरा.',
  sampleCodeLabel: 'नमुना कोड',
  chwIdLabel: 'आरोग्य सेवक आयडी',
  clusterSelectLabel: 'पीएचसी केंद्र',
  villageLabel: 'गाव / पाडा',
  carrierLabel: 'थंड पेटी प्रकार',
  transitHoursLabel: 'प्रवास तास',
  linkRunLabel: 'लॅब तपासणीशी जोडा (ऐच्छिक)',
  coldSealCheck: 'बर्फाचा पॅक थंड आणि सील सुरक्षित आहे',
  notesLabel: 'वाहतूक नोंद (नाव लिहू नका)',
  saveQueueBtn: 'ऑफलाइन साठवा',
  saveDispatchBtn: 'नमुना नोंद पाठवा',
  dispatchesTitle: 'गावापासून लॅबपर्यंत नमुना ट्रॅकर',
  dispatchesSub: '२४ तासांपेक्षा जास्त उशीर झाल्यास सूचना दाखवते; आशा सेविकेसाठी SMS कॉपी करा.',
  coldChainOk: 'थंड पेटी ठीक',
  delayWarning: '२४ तासांपेक्षा जास्त उशीर',
  coldChainBreach: 'थंड साखळी तुटली',
  statusInTransit: 'प्रवासात',
  statusAtLab: 'लॅबमध्ये पोहोचला',
  statusReturned: 'अहवाल गाव पीएचसीला पाठवला',
  markReceivedBtn: 'लॅबमध्ये आला नोंदवा',
  returnPhcBtn: 'पीएचसीला अहवाल पाठवा',
  copySmsBtn: 'SMS कॉपी',
  copiedSmsBtn: 'कॉपी झाले!',
  offlineQueueTitle: 'ऑफलाइन रांग',
  offlineQueueSub: 'इंटरनेटशिवाय सुरक्षित जतन. नेटवर्क आल्यावर सिंक करा.',
  clearQueueBtn: 'रांग साफ करा',
  syncNowBtn: 'आत्ता सिंक करा',
  syncingLabel: 'सिंक होत आहे...',
  iceBoxOption: 'आइस बॉक्स (२–८ °C)',
  incubatorOption: 'पोर्टेबल इनक्यूबेटर',
  ambientOption: 'साधी पेटी',
  switchRoleNote: 'बदल किंवा शिबिर ठरवण्यासाठी लॅब तंत्रज्ञ किंवा वरिष्ठ सूक्ष्मजीवशास्त्रज्ञ निवडा.',
  clusterTableTitle: 'आदिवासी गट व पीएचसी सारांश',
  clusterTableSub: 'प्रत्येक भागातील नमुने, लॅब निष्कर्ष आणि थंड पेटी सूचना दाखवते.',
  registerClusterBtn: 'नवीन पीएचसी गट जोडा',
  saveClusterBtn: 'गट जतन करा',
  savingLabel: 'जतन होत आहे...',
  scheduleCampTitle: 'फिरते आरोग्य शिबिर ठरवा',
  campsTableTitle: 'आगामी आणि जुनी ग्राम शिबिरे',
  campsTableSub: 'फिरत्या वैद्यकीय पथकाचे गाव, तारीख आणि सेवा पहा.',
  scheduleCampBtn: 'शिबिर ठरवा',
  selectLangTitle: 'मार्गदर्शक आणि ऑडिओसाठी भाषा निवडा',
  selectLangSub: 'ग्रामसभा आणि सोप्या संवादासाठी साधे शब्द व बोलणारा ऑडिओ.',
  printCardsBtn: 'चित्र कार्ड प्रिंट करा',
  runSummaryTitle: 'आशा / ग्राम आरोग्य सेवकासाठी सोपा लॅब संदेश',
  runSummarySub: 'कठीण शब्दांशिवाय निवडलेल्या तपासणीचा सोपा अर्थ सांगते.',
  refreshSummaryBtn: 'संदेश अपडेट करा',
  listenAudioBtn: 'ऐका (ऑडिओ)',
  stopAudioBtn: 'ऑडिओ थांबवा',
  copyTextBtn: 'संदेश कॉपी करा',
  communityAidLabel: 'ग्रामीण आरोग्य मार्गदर्शक',
  copyCardBtn: 'कार्ड कॉपी करा',
  expWorkspaceTitle: 'प्लेट वसाहत मोजणी भरा',
  editMetaBtn: 'माहिती व पद्धत बदला',
  hideMetaBtn: 'माहिती लपवा',
  obsDataTitle: 'प्लेट मोजणी तक्ता',
  addRowBtn: 'ओळ जोडा',
  addSeriesBtn: 'नमुना संच जोडा',
  importCsvBtn: 'CSV आयात',
  saveObsBtn: 'मोजणी जतन करा',
  validateInputsBtn: 'माहिती तपासा',
  calcPapAucBtn: 'निकाल काढा',
  analysisHeaderTitle: 'आलेख आणि PAP-AUC निकाल',
  recalcPapAucBtn: 'पुन्हा गणना करा',
  qaTitle: 'गुणवत्ता तपासणी व तज्ज्ञ मंजुरी',
  markReviewedBtn: 'तपासणी मंजूर करा',
  reportTitle: 'अहवाल आणि प्रिंट',
  reportSubtitle: 'आरोग्य सेविकांसाठी सोपा ग्रामीण सारांश किंवा तांत्रिक नोंदीसाठी पूर्ण लॅब अहवाल निवडा.',
  reportTabSimple: 'सोपा ग्रामीण सारांश',
  reportTabFull: 'पूर्ण लॅब अहवाल',
  exportRawCsv: 'मूळ डेटा CSV',
  exportDerivedCsv: 'गणना CSV',
  exportSummaryCsv: 'सारांश CSV',
  downloadPdfBtn: 'PDF डाउनलोड',
  printReportBtn: 'प्रिंट / PDF जतन करा',
  reportSyntheticBanner: 'सराव / नमुना डेटा: हा केवळ प्रशिक्षणासाठी नमुना डेटा आहे.',
  reportInvalidBanner: 'पुन्हा गणना आवश्यक: मोजणी बदलल्यानंतर पुन्हा गणना करणे आवश्यक आहे.',
  reportHeaderLabel: 'सूक्ष्मवेध · प्रयोगशाळा विश्लेषण अहवाल',
  reportSimpleHeader: 'सूक्ष्मवेध · आशा व ग्राम आरोग्य सेवक सोपा अहवाल',
  reportMetaTitle: 'तपासणी माहिती',
  reportProtoTitle: 'तपासणी नियम माहिती',
  reportRefStrain: 'नियंत्रण स्ट्रेन',
  reportObsRows: 'एकूण प्लेट ओळी',
  reportIncubation: 'वाढ परिस्थिती',
  reportProtocol: 'पद्धतीचे नाव',
  reportConcSeries: 'औषध पातळी',
  reportZeroRule: 'शून्य-वसाहत नियम',
  reportEngineVer: 'कॅल्क्युलेटर आवृत्ती',
  reportCalcTime: 'गणना वेळ',
  reportAucTableTitle: 'निकाल तुलना सारांश (AUC व गुणोत्तर)',
  colStrainId: 'नमुना आयडी',
  colRole: 'प्रकार',
  colAuc: 'क्षेत्रफळ (AUC)',
  colMu3Auc: 'नियंत्रण (Mu3) AUC',
  colRatio: 'गुणोत्तर',
  colBand: 'सोपा अर्थ',
  roleRefControl: 'नियंत्रण मानक',
  roleTestIsolate: 'चाचणी नमुना',
  mu3BaselineNote: 'त्याच तपासणीतील मानक नियंत्रण',
  reportQaTitle: 'गुणवत्ता तपासणी सूचना',
  reportReviewTitle: 'तज्ज्ञ स्वाक्षरी इतिहास',
  reportObsTableTitle: 'प्लेट मोजणी व गणना तक्ता',
  colConc: 'सांद्रता (mg/L)',
  colRep: 'पुनरावृत्ती',
  colDilution: 'पातळपणा',
  colVol: 'प्रमाण (mL)',
  colColonies: 'वसाहती',
  colCurveVal: 'आलेख मूल्य',
  reportDisclaimerTitle: 'महत्त्वाची सूचना',
  reportDisclaimer1: '१. गुणोत्तर प्रयोगशाळेतील प्लेट पातळपणा, प्रमाण आणि शून्य-वसाहत नियमांवर अवलंबून असते.',
  reportDisclaimer2: '२. हा अहवाल केवळ लॅब डेटाची गुणवत्ता तपासतो; हा वैयक्तिक वैद्यकीय निदान किंवा औषध सल्ला नाही.',
  reportSimpleDisclaimer:
    'केवळ जनजागृती सारांश. सतत ताप किंवा न भरणाऱ्या जखमेसाठी जवळच्या प्राथमिक आरोग्य केंद्रातील डॉक्टरांचा सल्ला घ्या.',
  noQaFlags: 'कोणतीही गुणवत्ता अडचण आढळली नाही.',
  pendingReviewNote: 'वरिष्ठ सूक्ष्मजीवशास्त्रज्ञांच्या मंजुरीची प्रतीक्षा आहे.',
  modalNewRunTitle: 'नवीन लॅब तपासणी सुरू करा',
  modalClose: 'बंद करा',
  modalCancel: 'रद्द करा',
  modalCreateBtn: 'तपासणी तयार करा',
  footerNotice: 'सूक्ष्मवेध · ग्रामीण व आदिवासी लॅब सेतू · रुग्णांची वैयक्तिक नावे साठवली जात नाहीत',
  reportGraphsTitle: 'ग्राफ आणि दृश्य परिणाम (वक्र व PAP-AUC गुणोत्तर)',
  reportGraphsSub: 'एकाच तपासणीतील Mu3 नियंत्रण व चाचणी नमुन्यांची ग्राफ तुलना.',
  ratioChartTitle: 'PAP-AUC गुणोत्तर तुलना ग्राफ',
  ratioChartSub: '0.90 ते 1.30 मधील मूल्य hVISA श्रेणीत येते; 1.30 पेक्षा जास्त असल्यास तज्ज्ञ तपासणी आवश्यक.',
  mu3RefLineLabel: 'Mu3 मानक (1.000)',
  hvisaRangeLabel: 'hVISA मर्यादा (0.90 – 1.30)',
  loginHeroTitle: 'सूक्ष्मवेध मध्ये लॉगिन करा',
  loginHeroSub: 'ग्रामीण आरोग्य सेवक, लॅब तंत्रज्ञ आणि तज्ज्ञांसाठी सुरक्षित प्रवेश (SQLite डेटाबेसमध्ये जतन).',
  tabPasswordLogin: 'पासवर्ड लॉगिन',
  tabFaceLogin: 'फेस लॉक',
  tabRegisterAccount: 'नवीन खाते तयार करा',
  usernameLabel: 'युजरनेम',
  displayNameLabel: 'पूर्ण नाव / हुद्दा',
  passwordLabel: 'पासवर्ड',
  signInBtn: 'लॉगिन करा',
  signingInLabel: 'लॉगिन होत आहे...',
  createAccountBtn: 'खाते तयार करा व प्रवेश करा',
  creatingAccountLabel: 'खाते तयार होत आहे...',
  demoAccountsTitle: 'तयार डेमो खाती (SQLite डेटाबेस)',
  demoAccountsHint: 'माहिती भरण्यासाठी कोणत्याही खात्यावर क्लिक करा (पासवर्ड: hvisa123):',
  faceLockTitle: 'फेस लॉक कॅमेरा अनलॉक',
  faceLockSub: 'कॅमेऱ्याकडे सरळ पहा किंवा स्पष्ट फोटो अपलोड करून डेटाबेसमधील फेस लॉकने प्रवेश करा.',
  startCameraBtn: 'कॅमेरा सुरू करा',
  stopCameraBtn: 'कॅमेरा बंद करा',
  captureUnlockBtn: 'चेहरा स्कॅन करून अनलॉक करा',
  captureEnrollBtn: 'चेहरा जतन करून फेस लॉक लावा',
  uploadSelfieBtn: 'किंवा चेहऱ्याचा फोटो निवडा',
  faceCapturedLabel: 'चेहरा टिपला गेला आहे आणि डेटाबेसमध्ये जतन होण्यास तयार आहे.',
  faceOptionalUsername: 'युजरनेम (ऐच्छिक, आपोआप ओळखण्यासाठी रिकामे ठेवा)',
  faceSavedBadge: 'फेस लॉक सक्रिय',
  faceNotSavedBadge: 'फक्त पासवर्ड',
  accountBtn: 'खाते व फेस लॉक',
  signOutBtn: 'बाहेर पडा',
  accountModalTitle: 'वापरकर्ता खाते आणि फेस लॉक सुरक्षा',
  accountModalSub: 'तुमचा पासवर्ड हॅश आणि फेस लॉक प्रोफाइल स्थानिक SQLite डेटाबेसमध्ये सुरक्षित ठेवले जाते.',
  enrollFaceTitle: 'फेस लॉक सेट किंवा अपडेट करा',
  enrollFaceSub: 'एकदा जतन केल्यानंतर तुम्ही पासवर्डशिवाय चेहऱ्याने अ‍ॅप उघडू शकता.',
  removeFaceBtn: 'फेस लॉक बंद करा',
  dbSavedNote: 'SQLite डेटाबेसमध्ये जतन',
  navDashboard: 'डॅशबोर्ड',
  navExperiments: 'प्रयोग (प्लेट डेटा)',
  navAnalysis: 'PAP-AUC विश्लेषण',
  navQa: 'गुणवत्ता हमी',
  loginRegisterBtn: 'लॉगिन / नोंदणी',
  portalBannerSubtitle: 'सार्वजनिक आरोग्य सूक्ष्मजीवशास्त्र, PAP-AUC गुणवत्ता तपासणी व ग्रामीण सेवा पोर्टल',
  portalStripLabel: 'सूक्ष्मजीवशास्त्र निगराणी आणि ग्रामीण आरोग्य पोर्टल',
  portalMissionBadge: 'ग्रामीण व संदर्भ प्रयोगशाळा सेतू',
  portalMissionTitle: 'PAP-AUC लोकसंख्या विश्लेषण आणि ग्राम आरोग्य निगराणी पोर्टल',
  portalMissionDesc:
    'हे पोर्टल ग्रामीण प्राथमिक आरोग्य केंद्रे आणि जिल्हा प्रयोगशाळांना जोडते, तसेच कोणत्याही रुग्णाचे वैयक्तिक नाव न साठवता Mu3 मानकासोबत PAP-AUC गुणोत्तर, ८-नियम गुणवत्ता तपासणी आणि मराठी/हिंदी/इंग्रजी अहवाल देते.',
  portalDivisionsHeading: 'पोर्टलचे मुख्य विभाग आणि मॉड्यूल्स पहा',
  portalUpdatesHeading: 'ताज्या लॅब नोंदी, शिबिरे व मानके',
  portalTabsOverview: 'पोर्टल आढावा',
  portalTabsModules: 'सर्व ७ मॉड्यूल्स',
  portalTabsMethod: 'PAP-AUC पद्धत व नियम',
  portalTabsRural: 'ग्राम आरोग्य सेतू',
  portalSignInPrompt: 'प्रयोगशाळा व ग्रामीण सेवा विभाग वापरण्यासाठी पासवर्ड किंवा फेस लॉकने लॉगिन करा.',
  portalExploreBtn: 'कार्यक्षेत्रात लॉगिन करा',
  portalOpenModuleBtn: 'विभाग उघडा',
  fontDecreaseTitle: 'अक्षरे लहान करा',
  fontResetTitle: 'मूळ अक्षर आकार',
  fontIncreaseTitle: 'अक्षरे मोठी करा',
};

const DICTIONARIES: Record<TribalLanguageCode, Record<TranslationKey, string>> = {
  en: EN,
  hi: HI,
  mr: MR,
};

interface I18nContextValue {
  lang: TribalLanguageCode;
  setLang: (lang: TribalLanguageCode) => void;
  fontScale: number;
  increaseFont: () => void;
  decreaseFont: () => void;
  resetFont: () => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  t: (key: TranslationKey) => string;
  translateStatus: (status: ExperimentStatus) => string;
  translateSeverity: (severity: QaSeverity) => string;
  translateBand: (band: InterpretationBand, fallback: string) => string;
  translateRoleShort: (role: UserRole) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const FONT_MIN = 87.5;
const FONT_MAX = 125;
const FONT_STEP = 12.5;

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<TribalLanguageCode>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as TribalLanguageCode | null;
      if (saved && saved in DICTIONARIES) return saved;
    } catch {
      // ignore storage errors
    }
    return 'en';
  });

  const [fontScale, setFontScale] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(FONT_STORAGE_KEY));
      if (Number.isFinite(saved) && saved >= FONT_MIN && saved <= FONT_MAX) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 100;
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CONTRAST_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const setLang = (next: TribalLanguageCode) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    try {
      localStorage.setItem(CONTRAST_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  };

  const applyFontScale = (next: number) => {
    const clamped = Math.min(FONT_MAX, Math.max(FONT_MIN, next));
    setFontScale(clamped);
    try {
      localStorage.setItem(FONT_STORAGE_KEY, String(clamped));
    } catch {
      // ignore
    }
  };

  const increaseFont = () => applyFontScale(fontScale + FONT_STEP);
  const decreaseFont = () => applyFontScale(fontScale - FONT_STEP);
  const resetFont = () => applyFontScale(100);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);

  const dict = DICTIONARIES[lang] ?? EN;
  const t = (key: TranslationKey) => dict[key] ?? EN[key] ?? key;

  const translateStatus = (status: ExperimentStatus) => {
    switch (status) {
      case 'REVIEWED':
        return t('statusReviewed');
      case 'CALCULATED':
        return t('statusCalculated');
      case 'VALIDATED':
        return t('statusValidated');
      case 'CALCULATION_INVALIDATED':
        return t('statusInvalidated');
      case 'DRAFT':
      default:
        return t('statusDraft');
    }
  };

  const translateSeverity = (severity: QaSeverity) => {
    switch (severity) {
      case 'BLOCKING':
        return t('qaBlocking');
      case 'WARNING':
        return t('qaWarning');
      case 'INFO':
      default:
        return t('qaInfo');
    }
  };

  const translateBand = (band: InterpretationBand, fallback: string) => {
    if (lang === 'en') return fallback;
    switch (band) {
      case 'BELOW_THRESHOLD':
        return t('bandBelow');
      case 'COMPATIBLE_HVISA':
        return t('bandHvisa');
      case 'EXPERT_REVIEW_VISA_RANGE':
        return t('bandExpert');
      default:
        return t('bandNotCalc');
    }
  };

  const translateRoleShort = (role: UserRole) => {
    switch (role) {
      case 'LAB_ANALYST':
        return t('roleAnalyst');
      case 'REVIEWER_MICROBIOLOGIST':
        return t('roleReviewer');
      case 'AUDITOR':
        return t('roleAuditor');
    }
  };

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        fontScale,
        increaseFont,
        decreaseFont,
        resetFont,
        highContrast,
        setHighContrast,
        t,
        translateStatus,
        translateSeverity,
        translateBand,
        translateRoleShort,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }
  return ctx;
}

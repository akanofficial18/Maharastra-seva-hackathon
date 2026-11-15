import type { TribalLanguageCode } from '../types/hvisa.ts';

export interface PortalLocaleBundle {
  header: {
    skipToContent: string;
    screenReaderAccess: string;
    screenReaderNotice: string;
    emblemAlt: string;
    siteName: string;
    siteDescription: string;
    demoBannerTag: string;
    prototypeDisclaimer: string;
    languageSelectLabel: string;
    loginBtn: string;
    registerBtn: string;
    profileMenuItem: string;
    settingsMenuItem: string;
    logoutMenuItem: string;
    backToWorkspaceBtn: string;
    publicNav: Array<{ id: string; label: string }>;
    authNav: {
      dashboard: string;
      experiments: string;
      analysis: string;
      qa: string;
      reports: string;
      outreach: string;
      settings: string;
    };
  };
  publicHome: {
    heroTitle: string;
    heroDescription: string;
    heroLoginBtn: string;
    heroRegisterBtn: string;
    heroHowItWorksBtn: string;
    heroImageCaption: string;
    heroImageAlt: string;
    noticeBarText: string;
    quickOverviewCards: Array<{
      id: string;
      title: string;
      summary: string;
      linkText: string;
    }>;
    aboutSectionTitle: string;
    aboutParagraphs: string[];
    whatIsTitle: string;
    whatIsIntro: string;
    whatIsTerms: Array<{
      term: string;
      plainMeaning: string;
      detail: string;
    }>;
    howItWorksTitle: string;
    howItWorksSubtitle: string;
    howItWorksSteps: Array<{
      step: string;
      title: string;
      detail: string;
    }>;
    whoCanUseTitle: string;
    whoCanUseSubtitle: string;
    roles: Array<{
      title: string;
      badge: string;
      summary: string;
      permissions: string[];
    }>;
    galleryTitle: string;
    gallerySubtitle: string;
    galleryItems: Array<{
      key: 'petri' | 'pap_svg' | 'rural' | 'team';
      caption: string;
      alt: string;
    }>;
    faqTitle: string;
    faqs: Array<{ q: string; a: string }>;
    contactTitle: string;
    contactCards: Array<{ label: string; value: string; note: string }>;
    disclaimerTitle: string;
    disclaimerPoints: string[];
  };
  login: {
    whyLoginTitle: string;
    whyLoginBullets: string[];
    noAccountPrompt: string;
    registerHereLink: string;
    imageCaption: string;
    imageAlt: string;
    loginHeading: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    chooseMethodLabel: string;
    passwordMethodLabel: string;
    faceMethodLabel: string;
    passwordLabel: string;
    showPasswordBtn: string;
    hidePasswordBtn: string;
    forgotPasswordLink: string;
    loginSubmitBtn: string;
    loggingInBtn: string;
    scanFaceHeading: string;
    scanFaceHint: string;
    scanFaceBtn: string;
    usePasswordInstead: string;
    newUserPrompt: string;
    registerLink: string;
    backToHomeLink: string;
    oneMethodNote: string;
    registerHeading: string;
    displayNameLabel: string;
    emailLabel: string;
    roleLabel: string;
    confirmPasswordLabel: string;
    passwordRuleHint: string;
    optionalFaceEnroll: string;
    createAccountBtn: string;
    creatingAccountBtn: string;
    accountCreatedSuccess: string;
    alreadyHaveAccount: string;
    forgotHeading: string;
    forgotStep1Desc: string;
    registeredEmailLabel: string;
    sendOtpBtn: string;
    sendingOtpBtn: string;
    demoOtpBoxLabel: string;
    demoOtpValidNote: string;
    otpInputLabel: string;
    newPasswordLabel: string;
    confirmNewPasswordLabel: string;
    resetPasswordBtn: string;
    resendOtpBtn: string;
    resendLimitNote: string;
    backToLoginLink: string;
    passwordMismatchError: string;
  };
  settings: {
    title: string;
    breadcrumbHome: string;
    breadcrumbSettings: string;
    menu: {
      general: string;
      password: string;
      faceLock: string;
      accessibility: string;
      session: string;
      demoRole: string;
    };
    generalHeading: string;
    portalLangLabel: string;
    langSavedToAccountNote: string;
    saveLangBtn: string;
    savedSuccess: string;
    changePasswordHeading: string;
    currentPasswordLabel: string;
    newPasswordLabel: string;
    confirmPasswordLabel: string;
    updatePasswordBtn: string;
    faceLockHeading: string;
    faceStatusLabel: string;
    faceStatusSet: string;
    faceStatusNotSet: string;
    faceDesc: string;
    enableFaceBtn: string;
    disableFaceBtn: string;
    faceFallbackNote: string;
    privacyTemplateNote: string;
    accessibilityHeading: string;
    textSizeLabel: string;
    highContrastLabel: string;
    highContrastDesc: string;
    enableContrastBtn: string;
    disableContrastBtn: string;
    sessionHeading: string;
    signedInAsLabel: string;
    logoutBtn: string;
    logoutDeviceBtn: string;
    demoRoleHeading: string;
    demoRoleBanner: string;
    demoRoleSelectLabel: string;
  };
  dashboard: {
    welcomePrefix: string;
    roleLabel: string;
    lastLoginLabel: string;
    firstLoginLabel: string;
    demoTag: string;
    kpiTotal: string;
    kpiAwaiting: string;
    kpiBlocking: string;
    kpiReviewed: string;
    recentHeading: string;
    quickActionsHeading: string;
    colRunId: string;
    colDate: string;
    colProtocol: string;
    colStatus: string;
    colAction: string;
    openRunBtn: string;
    btnNewExperiment: string;
    btnLoadDemo: string;
    btnOpenAnalysis: string;
    btnViewQa: string;
    btnCompareRuns: string;
    footerTip: string;
  };
  footer: {
    quickLinks: string;
    accessibility: string;
    terms: string;
    privacy: string;
    help: string;
    lastUpdatedLine: string;
    prototypeLine: string;
    dialogClose: string;
    infoTexts: Record<'accessibility' | 'terms' | 'privacy' | 'help', { title: string; body: string }>;
  };
}

export const PORTAL_CONTENT: Record<TribalLanguageCode, PortalLocaleBundle> = {
  en: {
    header: {
      skipToContent: 'Skip to main content',
      screenReaderAccess: 'Screen reader access',
      screenReaderNotice:
        'Screen reader mode active: Use Tab to move between links, A-/A/A+ to resize text, and the Language selector to switch between English, Hindi, and Marathi.',
      emblemAlt: 'State Emblem of India',
      siteName: 'सूक्ष्मवेध (SukshmaVedh)',
      siteDescription:
        'Laboratory Analysis Portal for Heterogeneous Vancomycin-Intermediate S. aureus',
      demoBannerTag: 'DEMO / SYNTHETIC DATA',
      prototypeDisclaimer: 'Prototype portal (not an official Government of India website)',
      languageSelectLabel: 'Language',
      loginBtn: 'Login',
      registerBtn: 'Register',
      profileMenuItem: 'Public Info Page',
      settingsMenuItem: 'Settings',
      logoutMenuItem: 'Logout',
      backToWorkspaceBtn: 'Open Software Workspace',
      publicNav: [
        { id: 'home', label: 'Home' },
        { id: 'about', label: 'About' },
        { id: 'what-is-hvisa', label: 'What is hVISA' },
        { id: 'how-it-works', label: 'How it works' },
        { id: 'who-can-use', label: 'Who can use' },
        { id: 'gallery', label: 'Gallery' },
        { id: 'faq', label: 'FAQ' },
        { id: 'contact', label: 'Contact' },
      ],
      authNav: {
        dashboard: 'Dashboard',
        experiments: 'Experiments',
        analysis: 'PAP-AUC Analysis',
        qa: 'QA Review',
        reports: 'Reports',
        outreach: 'Field Outreach',
        settings: 'Settings',
      },
    },
    publicHome: {
      heroTitle: 'Understand hVISA analysis in plain language',
      heroDescription:
        'सूक्ष्मवेध (SukshmaVedh) helps trained microbiology laboratories measure how a Staphylococcus aureus sample grows at rising vancomycin levels, plot a Population Analysis Profile (PAP), and compare Area Under the Curve (AUC) against the Mu3 reference strain. It is a laboratory quality-assurance tool, NOT a diagnostic device.',
      heroLoginBtn: 'Login to Portal',
      heroRegisterBtn: 'Register',
      heroHowItWorksBtn: 'How it works ↓',
      heroImageCaption: 'Microbiology reference laboratory inspecting culture plates and PAP protocols',
      heroImageAlt: 'Microbiologist examining bacterial agar culture plates inside a clinical laboratory',
      noticeBarText:
        'NOTICE: Prototype built with synthetic DEMO data only. Not a medical device, not for clinical decisions, patient diagnosis, or treatment advice.',
      quickOverviewCards: [
        {
          id: 'about',
          title: 'ABOUT THE PORTAL',
          summary: 'What सूक्ष्मवेध (SukshmaVedh) does, deterministic rules, and laboratory quality scope.',
          linkText: 'Read more',
        },
        {
          id: 'what-is-hvisa',
          title: 'WHAT IS hVISA?',
          summary: 'Plain-language guide to PAP curves, AUC integration, and Mu3 reference comparison.',
          linkText: 'Read more',
        },
        {
          id: 'how-it-works',
          title: 'HOW IT WORKS',
          summary: 'Five step-by-step laboratory stages from colony entry to signed PDF/CSV report.',
          linkText: 'Read more',
        },
        {
          id: 'who-can-use',
          title: 'WHO CAN USE',
          summary: 'Role permissions for Lab Analysts, Senior Microbiologist Reviewers, and Auditors.',
          linkText: 'Read more',
        },
      ],
      aboutSectionTitle: 'About the सूक्ष्मवेध (SukshmaVedh) Portal',
      aboutParagraphs: [
        'सूक्ष्मवेध (SukshmaVedh) is a structured laboratory software workspace for trained microbiology personnel studying heterogeneous vancomycin-intermediate Staphylococcus aureus (hVISA).',
        'When laboratory staff count bacterial colonies grown on agar plates containing increasing vancomycin concentrations, the portal converts raw colony counts into CFU/mL and log10(CFU/mL), builds a Population Analysis Profile (PAP), calculates the Area Under the Curve (AUC) using deterministic trapezoidal integration, and computes the test-to-Mu3 AUC ratio.',
        'Every calculation uses fixed mathematics with full quality-assurance checks and audit logging. Artificial intelligence is never used to compute or classify laboratory measurements, and no personal patient names are stored anywhere.',
      ],
      whatIsTitle: 'What is hVISA? (Key Terms in Simple Words)',
      whatIsIntro:
        'Some Staphylococcus aureus isolates look susceptible in routine testing yet carry a small sub-population able to grow at higher vancomycin concentrations. Standard PAP-AUC analysis checks this pattern in the laboratory:',
      whatIsTerms: [
        {
          term: 'PAP (Population Analysis Profile)',
          plainMeaning: 'Growth curve across increasing antibiotic levels',
          detail:
            'Colony counts are measured across rising vancomycin concentrations (such as 0.5, 1.0, 2.0, 2.5, and 4.0 mg/L) and plotted on a log10 CFU/mL survival curve.',
        },
        {
          term: 'AUC (Area Under the Curve)',
          plainMeaning: 'Total survival area calculated deterministically',
          detail:
            'Trapezoidal piecewise integration measures the area beneath the log10 survival curve across the configured concentration series using fixed mathematical formulas.',
        },
        {
          term: 'Mu3 Reference Ratio',
          plainMeaning: 'Same-run benchmark strain (ATCC 700698)',
          detail:
            'Each test isolate AUC is divided by the Mu3 control AUC measured in the exact same laboratory run, then displayed alongside configurable protocol threshold bands.',
        },
      ],
      howItWorksTitle: 'How Laboratory Analysis Works Inside the Portal',
      howItWorksSubtitle:
        'After signing in, staff follow five transparent, audited steps (matching Flow C):',
      howItWorksSteps: [
        {
          step: '1',
          title: 'Create Experiment & Select Protocol',
          detail:
            'Set Run ID, date, SOP profile (concentration grid, zero-colony policy), and Mu3 reference strain.',
        },
        {
          step: '2',
          title: 'Add Colony Observations',
          detail:
            'Enter strain, vancomycin concentration, replicate, dilution, plated volume, and colony count, or import a CSV file.',
        },
        {
          step: '3',
          title: 'Validate & Run Deterministic QA',
          detail:
            'Automated 8-rule checks flag negative/non-integer counts, missing Mu3 controls, duplicate replicates, or zero-colony policy gaps.',
        },
        {
          step: '4',
          title: 'Calculate PAP Curve, AUC & Mu3 Ratio',
          detail:
            'Engine computes CFU/mL, log10(CFU/mL), piecewise trapezoidal AUC, and Mu3 ratio with configurable threshold band.',
        },
        {
          step: '5',
          title: 'QA Review, Report Export & Audit Trail',
          detail:
            'Reviewer adds comments and signs off; export PDF/CSV reports with graphs while every change stays in the audit log.',
        },
      ],
      whoCanUseTitle: 'Who Can Use This Portal',
      whoCanUseSubtitle:
        'Access inside the software workspace is controlled by role so laboratory data stays accountable:',
      roles: [
        {
          title: 'Lab Analyst',
          badge: 'Data Entry & Calculation',
          summary: 'Creates runs, enters or imports colony plate counts, validates inputs, runs PAP-AUC calculations, and logs field dispatches.',
          permissions: [
            'Create new experiment runs & load CSV counts',
            'Run deterministic PAP-AUC & QA validation',
            'Manage PHC field sample dispatches',
          ],
        },
        {
          title: 'Reviewer / Microbiologist',
          badge: 'QA Verification & Sign-Off',
          summary: 'Inspects flagged curves, acknowledges warnings, configures SOP thresholds, and marks completed runs as Reviewed.',
          permissions: [
            'Review QA checklists & add review comments',
            'Approve or invalidate calculation sign-off',
            'Edit SOP thresholds & mark village reports returned',
          ],
        },
        {
          title: 'Auditor (Read-Only)',
          badge: 'Inspection & Compliance',
          summary: 'Inspects calculations, protocol versions, QA flags, timestamps, and immutable audit trails without altering lab records.',
          permissions: [
            'Inspect global and per-run audit diffs',
            'Verify protocol history & QA flags',
            'Export official CSV / PDF inspection copies',
          ],
        },
      ],
      galleryTitle: 'Laboratory & Field Reference Gallery',
      gallerySubtitle:
        'Visual overview of the agar plate workflow, sample PAP curve output, rural PHC bridge, and laboratory review team (synthetic demo illustrations).',
      galleryItems: [
        {
          key: 'petri',
          caption: 'Petri dish showing bacterial colonies across antibiotic plates',
          alt: 'Close-up of agar Petri dish displaying distinct bacterial colonies in a microbiology lab',
        },
        {
          key: 'pap_svg',
          caption: 'Sample PAP-AUC survival curve (Test Isolate in Deep Green vs Mu3 Reference in Saffron)',
          alt: 'Sample Population Analysis Profile curve comparing test isolate log10 CFU/mL against Mu3 reference strain',
        },
        {
          key: 'rural',
          caption: 'Rural Primary Health Centre community sample collection outreach',
          alt: 'Community health worker consulting with rural residents outside a Primary Health Centre',
        },
        {
          key: 'team',
          caption: 'Microbiology team verifying plate colony counts and SOP protocols',
          alt: 'Two laboratory technicians inspecting agar plates and printed observation sheets at a workbench',
        },
      ],
      faqTitle: 'Frequently Asked Questions (FAQ)',
      faqs: [
        {
          q: 'Is सूक्ष्मवेध (SukshmaVedh) a diagnostic tool or medical device?',
          a: 'No. सूक्ष्मवेध (SukshmaVedh) is strictly a laboratory quality-assurance and educational/research analysis prototype using synthetic DEMO data. It does not diagnose patients or suggest clinical treatment.',
        },
        {
          q: 'Why are Dashboard, Experiments, and Reports hidden before login?',
          a: 'Laboratory runs, QA flags, and field dispatches belong inside the authenticated workspace. The public Home page shows plain-language explanations and images only.',
        },
        {
          q: 'How is PAP-AUC calculated, and does it use AI?',
          a: 'Never. All CFU/mL conversions, log10 transforms, trapezoidal AUCs, and ratios relative to Mu3 are computed using fixed TypeScript mathematics and unit-tested formulas.',
        },
        {
          q: 'What happens if a plate has zero colonies (0)?',
          a: 'Zero colonies are never passed to log10(0). Depending on the selected SOP profile, the engine applies the configured policy (Detection Limit, Pseudocount, or Exclude Point) or blocks calculation if unspecified.',
        },
        {
          q: 'Are patient names or personal medical records stored?',
          a: 'No. Only anonymous isolate/sample codes (e.g., DEMO-ISO-01) and coded PHC cluster identifiers are accepted.',
        },
        {
          q: 'How does Face Lock work, and what if I do not set it up?',
          a: 'Face Lock is optional and stores only a numeric descriptor vector, never raw photographs. Password login always remains available, and selecting Face Lock without enrollment automatically returns to Password login.',
        },
        {
          q: 'What happens if someone enters a wrong password 5 times?',
          a: 'For security, the account is locked for 15 minutes after 5 incorrect password attempts, or you can reset your password using the Forgot Password OTP workflow.',
        },
        {
          q: 'Which languages are supported across the portal?',
          a: 'English, हिन्दी (Hindi), and मराठी (Marathi). Selecting a language from the dropdown updates the entire portal and saved reports.',
        },
      ],
      contactTitle: 'Portal Helpdesk & Technical Support',
      contactCards: [
        {
          label: 'Laboratory QA Helpdesk',
          value: 'qa-support@hvisa-demo.org',
          note: 'Mon–Fri, 09:30–17:30 IST (Synthetic Prototype Support)',
        },
        {
          label: 'PHC Field Outreach Desk',
          value: 'field-bridge@hvisa-demo.org',
          note: 'Cold-chain dispatch & CHW audio guide support',
        },
        {
          label: 'Demo Credentials',
          value: 'analyst / reviewer / auditor',
          note: 'Default demo password: hvisa123 (emails: <role>@hvisa-demo.org)',
        },
      ],
      disclaimerTitle: 'Important Scope & Non-Clinical Disclaimer',
      disclaimerPoints: [
        'All runs, counts, and clusters pre-loaded in this prototype are synthetic DEMO datasets.',
        'Interpretation threshold bands (such as < 0.90, 0.90–1.30, > 1.30) are configurable laboratory protocol settings, not clinical truth.',
        'Prototype website style inspired by public information portals (not an official Government of India website).',
      ],
    },
    login: {
      whyLoginTitle: 'Why log in?',
      whyLoginBullets: [
        'Create and manage laboratory experiments',
        'Run deterministic PAP-AUC calculations and 8-rule QA checks',
        'Export signed PDF and CSV reports with survival & ratio graphs',
        'Switch language, change password, and manage Face Lock in Settings',
      ],
      noAccountPrompt: "Don't have an account?",
      registerHereLink: 'Register here',
      imageCaption: 'Authorized microbiology laboratory workspace access',
      imageAlt: 'Laboratory scientist inspecting plates in a clinical microbiology laboratory',
      loginHeading: 'Login to सूक्ष्मवेध (SukshmaVedh)',
      usernameLabel: 'Username / Employee ID',
      usernamePlaceholder: 'e.g. analyst',
      chooseMethodLabel: 'Choose login method',
      passwordMethodLabel: 'Password (default)',
      faceMethodLabel: 'Face Lock',
      passwordLabel: 'Password',
      showPasswordBtn: 'Show',
      hidePasswordBtn: 'Hide',
      forgotPasswordLink: 'Forgot password?',
      loginSubmitBtn: 'Login',
      loggingInBtn: 'Signing in...',
      scanFaceHeading: 'Sign in with Face Lock',
      scanFaceHint: 'Scan your face to sign in.',
      scanFaceBtn: 'Scan face',
      usePasswordInstead: 'Use password instead',
      newUserPrompt: 'New user?',
      registerLink: 'Register',
      backToHomeLink: 'Back to Home',
      oneMethodNote: "Only ONE method is visible at a time. Password login always remains available as a fallback.",
      registerHeading: 'Register New Account',
      displayNameLabel: 'Full Name / Title',
      emailLabel: 'Registered Email',
      roleLabel: 'Role',
      confirmPasswordLabel: 'Confirm Password',
      passwordRuleHint: 'Minimum 8 characters, with at least one letter and one number.',
      optionalFaceEnroll: 'Optional: Capture Face Lock now (can also be done later in Settings)',
      createAccountBtn: 'Create Account',
      creatingAccountBtn: 'Creating account...',
      accountCreatedSuccess: 'Account created successfully. Please log in below.',
      alreadyHaveAccount: 'Already registered? Back to Login',
      forgotHeading: 'Reset Forgotten Password',
      forgotStep1Desc: 'Enter your username and registered email address to generate a 6-digit OTP (valid for 10 minutes).',
      registeredEmailLabel: 'Registered Email',
      sendOtpBtn: 'Send OTP',
      sendingOtpBtn: 'Sending OTP...',
      demoOtpBoxLabel: 'DEMO (in production this is sent by email/SMS)',
      demoOtpValidNote: 'Valid for 10 minutes. Enter this 6-digit code below.',
      otpInputLabel: 'Enter 6-digit OTP',
      newPasswordLabel: 'New Password',
      confirmNewPasswordLabel: 'Confirm New Password',
      resetPasswordBtn: 'Verify OTP & Update Password',
      resendOtpBtn: 'Resend OTP',
      resendLimitNote: 'Maximum 3 resends allowed.',
      backToLoginLink: 'Back to Login (Password)',
      passwordMismatchError: 'Passwords do not match.',
    },
    settings: {
      title: 'Settings',
      breadcrumbHome: 'Home',
      breadcrumbSettings: 'Settings',
      menu: {
        general: 'General / Language',
        password: 'Change Password',
        faceLock: 'Face Lock',
        accessibility: 'Text size & accessibility',
        session: 'Session / Logout',
        demoRole: 'Demo role (prototype)',
      },
      generalHeading: 'General - Language',
      portalLangLabel: 'Portal language',
      langSavedToAccountNote: 'Saved to your user account and browser storage.',
      saveLangBtn: 'Save',
      savedSuccess: 'Saved to your profile.',
      changePasswordHeading: 'Change Password',
      currentPasswordLabel: 'Current password',
      newPasswordLabel: 'New password (min 8 chars, letter + number)',
      confirmPasswordLabel: 'Confirm new password',
      updatePasswordBtn: 'Update Password',
      faceLockHeading: 'Face Lock',
      faceStatusLabel: 'Status:',
      faceStatusSet: 'Set up',
      faceStatusNotSet: 'Not set up',
      faceDesc: 'Enable to sign in with your face instead of typing a password.',
      enableFaceBtn: 'Enable Face Lock',
      disableFaceBtn: 'Disable',
      faceFallbackNote: 'Password login always remains available.',
      privacyTemplateNote: 'Face images are never stored; only an encrypted numeric template is saved.',
      accessibilityHeading: 'Text Size & Accessibility',
      textSizeLabel: 'Text scaling (A- / A / A+)',
      highContrastLabel: 'High-contrast mode',
      highContrastDesc: 'Increases border thickness and foreground contrast across tables and forms.',
      enableContrastBtn: 'Enable High Contrast',
      disableContrastBtn: 'Standard Contrast',
      sessionHeading: 'Session & Sign Out',
      signedInAsLabel: 'Signed in as',
      logoutBtn: 'Logout',
      logoutDeviceBtn: 'Logout from this device',
      demoRoleHeading: 'Demo Role Switcher (Prototype Only)',
      demoRoleBanner: 'For prototype evaluation only: switch active workspace role permissions.',
      demoRoleSelectLabel: 'Active demo role',
    },
    dashboard: {
      welcomePrefix: 'Welcome,',
      roleLabel: 'Role:',
      lastLoginLabel: 'Last login:',
      firstLoginLabel: 'First session',
      demoTag: 'DEMO DATA - synthetic, not for clinical use',
      kpiTotal: 'Total runs',
      kpiAwaiting: 'Awaiting review',
      kpiBlocking: 'QA blocking flags',
      kpiReviewed: 'Reviewed',
      recentHeading: 'Recent experiments',
      quickActionsHeading: 'Quick actions',
      colRunId: 'Run ID',
      colDate: 'Date',
      colProtocol: 'Protocol',
      colStatus: 'Status',
      colAction: 'Open',
      openRunBtn: 'Open',
      btnNewExperiment: '+ New experiment',
      btnLoadDemo: 'Load synthetic demo',
      btnOpenAnalysis: 'Open PAP-AUC analysis',
      btnViewQa: 'View QA flags',
      btnCompareRuns: 'Compare multiple runs',
      footerTip: 'Click the site logo in the header anytime to return to the public information page while staying logged in.',
    },
    footer: {
      quickLinks: 'Quick Links',
      accessibility: 'Accessibility',
      terms: 'Terms',
      privacy: 'Privacy',
      help: 'Help',
      lastUpdatedLine: 'Last updated: 15 Nov 2026 · Version 1.0 · Synthetic demo data (not for clinical use)',
      prototypeLine: 'Laboratory software prototype (not an official Government of India website).',
      dialogClose: 'Close',
      infoTexts: {
        accessibility: {
          title: 'Accessibility Statement',
          body: 'Use the utility strip A- / A / A+ buttons or Settings to adjust text size, toggle High-Contrast Mode, switch between English, Hindi, and Marathi, or navigate sections with keyboard Tab and Skip to Main Content.',
        },
        terms: {
          title: 'Terms of Prototype Use',
          body: 'This application is a demonstration prototype for laboratory PAP-AUC quality-assurance training. It is not approved as a clinical diagnostic medical device.',
        },
        privacy: {
          title: 'Privacy & Data Coding Policy',
          body: 'Do not enter real patient names, addresses, or personal identifiers. Use coded laboratory isolate IDs only. Face Lock saves only a numeric descriptor vector, never raw photos.',
        },
        help: {
          title: 'Help & Demo Credentials',
          body: 'Pre-seeded SQLite demo accounts: analyst, reviewer, or auditor (password: hvisa123; emails: analyst@hvisa-demo.org, reviewer@hvisa-demo.org, auditor@hvisa-demo.org). Use Settings to enable Face Lock or change language.',
        },
      },
    },
  },
  hi: {
    header: {
      skipToContent: 'मुख्य सामग्री पर जाएं',
      screenReaderAccess: 'स्क्रीन रीडर एक्सेस',
      screenReaderNotice:
        'स्क्रीन रीडर सहायता सक्रिय: लिंक के बीच जाने के लिए Tab दबाएं, टेक्स्ट आकार बदलने के लिए A-/A/A+ उपयोग करें और भाषा ड्रॉपडाउन से हिंदी, मराठी या अंग्रेज़ी चुनें।',
      emblemAlt: 'भारत का राजचिह्न',
      siteName: 'सूक्ष्मवेध',
      siteDescription:
        'विषम वैंकोमाइसिन-मध्यवर्ती स्टैफिलोकोकस ऑरियस (hVISA) के लिए प्रयोगशाला विश्लेषण पोर्टल',
      demoBannerTag: 'डेमो / सिंथेटिक डेटा',
      prototypeDisclaimer: 'प्रोटोटाइप (भारत सरकार की आधिकारिक वेबसाइट नहीं)',
      languageSelectLabel: 'भाषा',
      loginBtn: 'लॉगिन',
      registerBtn: 'पंजीकरण',
      profileMenuItem: 'सार्वजनिक जानकारी पृष्ठ',
      settingsMenuItem: 'सेटिंग्स',
      logoutMenuItem: 'लॉगआउट',
      backToWorkspaceBtn: 'सॉफ़्टवेयर कार्यक्षेत्र खोलें',
      publicNav: [
        { id: 'home', label: 'मुख्य पृष्ठ' },
        { id: 'about', label: 'परिचय' },
        { id: 'what-is-hvisa', label: 'hVISA क्या है' },
        { id: 'how-it-works', label: 'कार्यप्रणाली' },
        { id: 'who-can-use', label: 'उपयोगकर्ता' },
        { id: 'gallery', label: 'गैलरी' },
        { id: 'faq', label: 'सामान्य प्रश्न' },
        { id: 'contact', label: 'संपर्क' },
      ],
      authNav: {
        dashboard: 'डैशबोर्ड',
        experiments: 'प्रयोग',
        analysis: 'PAP-AUC विश्लेषण',
        qa: 'QA समीक्षा',
        reports: 'रिपोर्ट',
        outreach: 'ग्रामीण आउटरीच',
        settings: 'सेटिंग्स',
      },
    },
    publicHome: {
      heroTitle: 'hVISA विश्लेषण को सरल भाषा में समझें',
      heroDescription:
        'सूक्ष्मवेध प्रशिक्षित सूक्ष्मजीव विज्ञान प्रयोगशालाओं को यह मापने में मदद करता है कि बढ़ती वैंकोमाइसिन सांद्रता पर Staphylococcus aureus नमूना कैसे बढ़ता है, PAP वक्र बनाता है और Mu3 संदर्भ स्ट्रेन से AUC अनुपात निकालता है। यह केवल एक प्रयोगशाला गुणवत्ता उपकरण है, निदान उपकरण नहीं।',
      heroLoginBtn: 'पोर्टल में लॉगिन करें',
      heroRegisterBtn: 'पंजीकरण करें',
      heroHowItWorksBtn: 'कार्यप्रणाली देखें ↓',
      heroImageCaption: 'कल्चर प्लेट और PAP प्रोटोकॉल की जांच करती संदर्भ सूक्ष्मजीव विज्ञान प्रयोगशाला',
      heroImageAlt: 'क्लिनिकल प्रयोगशाला में बैक्टीरियल एगर कल्चर प्लेट की जांच करती सूक्ष्मजीव विज्ञानी',
      noticeBarText:
        'सूचना: यह केवल सिंथेटिक डेमो डेटा वाला प्रोटोटाइप है। यह कोई चिकित्सा उपकरण नहीं है और रोगी निदान या उपचार सलाह के लिए नहीं है।',
      quickOverviewCards: [
        {
          id: 'about',
          title: 'पोर्टल का परिचय',
          summary: 'पोर्टल क्या करता है, गणितीय नियम और प्रयोगशाला गुणवत्ता का दायरा।',
          linkText: 'और पढ़ें',
        },
        {
          id: 'what-is-hvisa',
          title: 'hVISA क्या है?',
          summary: 'सरल शब्दों में PAP वक्र, AUC गणना और Mu3 संदर्भ तुलना को समझें।',
          linkText: 'और पढ़ें',
        },
        {
          id: 'how-it-works',
          title: 'यह कैसे काम करता है',
          summary: 'कॉलोनी प्रविष्टि से प्रमाणित PDF/CSV रिपोर्ट तक 5 स्पष्ट चरण।',
          linkText: 'और पढ़ें',
        },
        {
          id: 'who-can-use',
          title: 'कौन उपयोग कर सकता है',
          summary: 'लैब विश्लेषक, वरिष्ठ सूक्ष्मजीव विज्ञानी समीक्षक और ऑडिटर के अधिकार।',
          linkText: 'और पढ़ें',
        },
      ],
      aboutSectionTitle: 'सूक्ष्मवेध पोर्टल के बारे में',
      aboutParagraphs: [
        'सूक्ष्मवेध विषम वैंकोमाइसिन-मध्यवर्ती स्टैफिलोकोकस ऑरियस (hVISA) का अध्ययन करने वाले प्रशिक्षित प्रयोगशाला कर्मियों के लिए एक संरचित सॉफ़्टवेयर कार्यक्षेत्र है।',
        'जब लैब कर्मचारी बढ़ती वैंकोमाइसिन सांद्रता वाली एगर प्लेटों पर कॉलोनी गिनती दर्ज करते हैं, तो पोर्टल उन्हें CFU/mL और log10(CFU/mL) में बदलता है, PAP वक्र बनाता है, ट्रेपेज़ॉइडल नियम से AUC निकालता है और Mu3 मानक से अनुपात की गणना करता है।',
        'सभी गणनाएं निश्चित गणितीय सूत्रों और 8-नियम QA जाँच पर आधारित हैं। गणना या वर्गीकरण के लिए AI का उपयोग कभी नहीं किया जाता और किसी भी रोगी का व्यक्तिगत नाम संग्रहीत नहीं होता।',
      ],
      whatIsTitle: 'hVISA क्या है? (प्रमुख शब्द सरल भाषा में)',
      whatIsIntro:
        'कुछ Staphylococcus aureus नमूने सामान्य जांच में संवेदनशील दिख सकते हैं, लेकिन उनमें उच्च वैंकोमाइसिन पर बढ़ने वाला एक छोटा उप-समूह होता है। PAP-AUC विश्लेषण प्रयोगशाला में इसकी जांच करता है:',
      whatIsTerms: [
        {
          term: 'PAP (जनसंख्या विश्लेषण प्रोफ़ाइल)',
          plainMeaning: 'बढ़ती एंटीबायोटिक सांद्रता पर वृद्धि वक्र',
          detail:
            'वैंकोमाइसिन सांद्रता (जैसे 0.5, 1.0, 2.0, 2.5, 4.0 mg/L) पर कॉलोनी गिनती मापकर log10 CFU/mL वक्र बनाया जाता है।',
        },
        {
          term: 'AUC (वक्र के नीचे का क्षेत्रफल)',
          plainMeaning: 'निश्चित गणित से निकाला गया कुल क्षेत्रफल',
          detail:
            'सांद्रता श्रृंखला पर log10 सर्वाइवल वक्र के नीचे का क्षेत्रफल ट्रेपेज़ॉइडल विधि से सटीक रूप से निकाला जाता है।',
        },
        {
          term: 'Mu3 संदर्भ अनुपात',
          plainMeaning: 'उसी रन का मानक स्ट्रेन (ATCC 700698)',
          detail:
            'प्रत्येक परीक्षण नमूने के AUC को उसी लैब रन में मापे गए Mu3 नियंत्रण AUC से विभाजित कर निर्धारित सीमा के साथ दिखाया जाता है।',
        },
      ],
      howItWorksTitle: 'लॉगिन के बाद पोर्टल में प्रयोगशाला विश्लेषण कैसे होता है',
      howItWorksSubtitle: 'प्रशिक्षित कर्मचारी इन 5 पारदर्शी और ऑडिटेड चरणों का पालन करते हैं:',
      howItWorksSteps: [
        {
          step: '1',
          title: 'प्रयोग बनाएं और प्रोटोकॉल चुनें',
          detail: 'Run ID, दिनांक, SOP प्रोफ़ाइल और Mu3 संदर्भ स्ट्रेन सेट करें।',
        },
        {
          step: '2',
          title: 'कॉलोनी अवलोकन जोड़ें',
          detail: 'तालिका में स्ट्रेन, सांद्रता, प्रतिकृति, तनुकरण, आयतन और कॉलोनी संख्या भरें या CSV अपलोड करें।',
        },
        {
          step: '3',
          title: 'सत्यापन और गुणवत्ता जाँच (QA)',
          detail: '8-नियम QA इंजन नकारात्मक गिनती, अधूरे Mu3 कंट्रोल, दोहराव या शून्य-कॉलोनी त्रुटि को रोकता है।',
        },
        {
          step: '4',
          title: 'PAP वक्र, AUC और Mu3 अनुपात निकालें',
          detail: 'सिस्टम log10(CFU/mL), ट्रेपेज़ॉइडल AUC और Mu3 के सापेक्ष अनुपात की गणना करता है।',
        },
        {
          step: '5',
          title: 'QA समीक्षा, रिपोर्ट और ऑडिट लॉग',
          detail: 'समीक्षक टिप्पणी जोड़कर अनुमोदन देते हैं और ग्राफ़ सहित PDF/CSV रिपोर्ट डाउनलोड की जाती है।',
        },
      ],
      whoCanUseTitle: 'इस पोर्टल का उपयोग कौन कर सकता है',
      whoCanUseSubtitle: 'डेटा की विश्वसनीयता बनाए रखने के लिए प्रत्येक भूमिका के अलग अधिकार हैं:',
      roles: [
        {
          title: 'लैब विश्लेषक (Lab Analyst)',
          badge: 'डेटा प्रविष्टि एवं गणना',
          summary: 'नए प्रयोग बनाते हैं, प्लेट कॉलोनी गिनती दर्ज करते हैं, PAP-AUC गणना चलाते हैं और फील्ड सैंपल लॉग करते हैं।',
          permissions: [
            'नए लैब रन बनाना व CSV डेटा आयात करना',
            'PAP-AUC गणना और QA सत्यापन चलाना',
            'PHC फील्ड सैंपल डिस्पैच प्रबंधित करना',
          ],
        },
        {
          title: 'समीक्षक / सूक्ष्मजीव विज्ञानी',
          badge: 'QA सत्यापन एवं अनुमोदन',
          summary: 'फ्लैग किए गए वक्रों की जांच करते हैं, चेतावनी स्वीकार करते हैं, SOP सीमाएं तय करते हैं और रन को अनुमोदित करते हैं।',
          permissions: [
            'QA चेकलिस्ट की समीक्षा और टिप्पणी जोड़ना',
            'अंतिम रिपोर्ट को Reviewed चिह्नित करना',
            'प्रोटोकॉल सीमाएं और ग्राम रिपोर्ट स्थिति बदलना',
          ],
        },
        {
          title: 'ऑडिटर (केवल पढ़ने के लिए)',
          badge: 'निरीक्षण एवं अनुपालन',
          summary: 'डेटा में बदलाव किए बिना गणनाओं, प्रोटोकॉल संस्करण, QA चेतावनी और ऑडिट लॉग का निरीक्षण करते हैं।',
          permissions: [
            'वैश्विक और रन-स्तरीय ऑडिट अंतर देखना',
            'प्रोटोकॉल इतिहास और QA फ्लैग जांचना',
            'निरीक्षण हेतु PDF / CSV प्रतियाँ निर्यात करना',
          ],
        },
      ],
      galleryTitle: 'प्रयोगशाला और क्षेत्रीय कार्य गैलरी',
      gallerySubtitle: 'एगर प्लेट कार्यप्रवाह, नमूना PAP वक्र, ग्रामीण स्वास्थ्य सेतु और लैब टीम की झलक (डेमो चित्रण)।',
      galleryItems: [
        {
          key: 'petri',
          caption: 'एंटीबायोटिक प्लेटों पर बैक्टीरियल कॉलोनियों वाली पेट्री डिश',
          alt: 'सूक्ष्मजीव विज्ञान प्रयोगशाला में बैक्टीरियल कॉलोनियों के साथ पेट्री डिश',
        },
        {
          key: 'pap_svg',
          caption: 'नमूना PAP-AUC वक्र (परीक्षण नमूना गहरे हरे रंग में और Mu3 केसरिया में)',
          alt: 'Mu3 मानक स्ट्रेन के साथ परीक्षण नमूने की तुलना करने वाला PAP वक्र ग्राफ',
        },
        {
          key: 'rural',
          caption: 'प्राथमिक स्वास्थ्य केंद्र पर ग्रामीण सैंपल संग्रह और स्वास्थ्य संवाद',
          alt: 'प्राथमिक स्वास्थ्य केंद्र के बाहर ग्रामीणों के साथ स्वास्थ्य कार्यकर्ता',
        },
        {
          key: 'team',
          caption: 'कॉलोनी गिनती और प्रोटोकॉल की जांच करती प्रयोगशाला टीम',
          alt: 'प्रयोगशाला कार्यक्षेत्र पर एगर प्लेटों की जांच करते दो तकनीशियन',
        },
      ],
      faqTitle: 'अक्सर पूछे जाने वाले प्रश्न (FAQ)',
      faqs: [
        {
          q: 'क्या सूक्ष्मवेध कोई चिकित्सा निदान उपकरण है?',
          a: 'नहीं। यह केवल सिंथेटिक डेमो डेटा पर आधारित एक प्रयोगशाला गुणवत्ता-आश्वासन और प्रशिक्षण प्रोटोटाइप है। यह रोगी का निदान या उपचार सलाह नहीं देता।',
        },
        {
          q: 'लॉगिन से पहले डैशबोर्ड और प्रयोग टैब क्यों नहीं दिखते?',
          a: 'लैब रिकॉर्ड और QA फ्लैग सुरक्षित कार्यक्षेत्र का हिस्सा हैं। सार्वजनिक होम पेज केवल जानकारी और छवियाँ दिखाता है।',
        },
        {
          q: 'क्या PAP-AUC की गणना AI से होती है?',
          a: 'बिल्कुल नहीं। CFU/mL, log10 परिवर्तन, ट्रेपेज़ॉइडल AUC और Mu3 अनुपात की पूरी गणना शुद्ध गणितीय कोड से होती है।',
        },
        {
          q: 'यदि किसी प्लेट पर 0 कॉलोनी हों तो क्या होता है?',
          a: 'शून्य के लिए कभी log10(0) नहीं निकाला जाता। चयनित SOP नीति (Detection Limit, Pseudocount या Exclude Point) के अनुसार प्रक्रिया होती है।',
        },
        {
          q: 'क्या पोर्टल में रोगियों के नाम सहेजे जाते हैं?',
          a: 'नहीं। केवल गुमनाम सैंपल कोड (जैसे DEMO-ISO-01) और PHC ब्लॉक कोड उपयोग किए जाते हैं।',
        },
        {
          q: 'फेस लॉक कैसे काम करता है और न होने पर क्या करें?',
          a: 'फेस लॉक वैकल्पिक है और केवल संख्यात्मक वेक्टर सहेजता है, फोटो नहीं। यदि सेट न हो तो पोर्टल स्वतः पासवर्ड लॉगिन पर वापस चला जाता है।',
        },
        {
          q: '5 बार गलत पासवर्ड डालने पर क्या होता है?',
          a: 'सुरक्षा के लिए खाता 15 मिनट के लिए लॉक हो जाता है, या आप Forgot Password OTP से नया पासवर्ड सेट कर सकते हैं।',
        },
        {
          q: 'पोर्टल में कौन-सी भाषाएं उपलब्ध हैं?',
          a: 'अंग्रेज़ी (English), हिंदी (हिन्दी) और मराठी (मराठी)। ड्रॉपडाउन से चुनी गई भाषा पूरे पोर्टल और रिपोर्ट में लागू होती है।',
        },
      ],
      contactTitle: 'सहायता डेस्क और संपर्क',
      contactCards: [
        {
          label: 'प्रयोगशाला QA सहायता डेस्क',
          value: 'qa-support@hvisa-demo.org',
          note: 'सोम–शुक्र, 09:30–17:30 IST (प्रोटोटाइप सहायता)',
        },
        {
          label: 'ग्रामीण PHC आउटरीच डेस्क',
          value: 'field-bridge@hvisa-demo.org',
          note: 'कोल्ड-चेन डिस्पैच व ऑडियो कार्ड सहायता',
        },
        {
          label: 'डेमो लॉगिन विवरण',
          value: 'analyst / reviewer / auditor',
          note: 'डिफ़ॉल्ट पासवर्ड: hvisa123 (ईमेल: <role>@hvisa-demo.org)',
        },
      ],
      disclaimerTitle: 'महत्वपूर्ण अस्वीकरण',
      disclaimerPoints: [
        'इस प्रोटोटाइप में पहले से मौजूद सभी रन और डेटा सिंथेटिक डेमो डेटा हैं।',
        'व्याख्या सीमाएं (< 0.90, 0.90–1.30, > 1.30) केवल विन्यास योग्य प्रयोगशाला सेटिंग्स हैं, नैदानिक सत्य नहीं।',
        'प्रोटोटाइप (यह भारत सरकार की आधिकारिक वेबसाइट नहीं है)।',
      ],
    },
    login: {
      whyLoginTitle: 'लॉगिन क्यों करें?',
      whyLoginBullets: [
        'नए प्रयोगशाला रन बनाएं और कॉलोनी डेटा दर्ज करें',
        'PAP-AUC गणना और 8-नियम QA जाँच चलाएं',
        'ग्राफ़ के साथ PDF और CSV रिपोर्ट डाउनलोड करें',
        'सेटिंग्स में भाषा बदलें, पासवर्ड अपडेट करें और फेस लॉक प्रबंधित करें',
      ],
      noAccountPrompt: 'क्या आपका खाता नहीं है?',
      registerHereLink: 'यहाँ पंजीकरण करें',
      imageCaption: 'अधिकृत सूक्ष्मजीव विज्ञान प्रयोगशाला कार्यक्षेत्र प्रवेश',
      imageAlt: 'प्रयोगशाला में संस्कृति प्लेटों की जांच करती वैज्ञानिक',
      loginHeading: 'सूक्ष्मवेध में लॉगिन करें',
      usernameLabel: 'यूज़रनेम / कर्मचारी आईडी',
      usernamePlaceholder: 'जैसे analyst',
      chooseMethodLabel: 'लॉगिन का तरीका चुनें',
      passwordMethodLabel: 'पासवर्ड (डिफ़ॉल्ट)',
      faceMethodLabel: 'फेस लॉक',
      passwordLabel: 'पासवर्ड',
      showPasswordBtn: 'दिखाएं',
      hidePasswordBtn: 'छिपाएं',
      forgotPasswordLink: 'पासवर्ड भूल गए?',
      loginSubmitBtn: 'लॉगिन',
      loggingInBtn: 'लॉगिन हो रहा है...',
      scanFaceHeading: 'फेस लॉक से साइन इन करें',
      scanFaceHint: 'लॉगिन करने के लिए चेहरा स्कैन करें।',
      scanFaceBtn: 'चेहरा स्कैन करें',
      usePasswordInstead: 'इसके बजाय पासवर्ड उपयोग करें',
      newUserPrompt: 'नए उपयोगकर्ता?',
      registerLink: 'पंजीकरण करें',
      backToHomeLink: 'मुख्य पृष्ठ पर वापस',
      oneMethodNote: 'एक समय में केवल एक तरीका दिखाई देता है। पासवर्ड लॉगिन हमेशा उपलब्ध रहता है।',
      registerHeading: 'नया खाता पंजीकृत करें',
      displayNameLabel: 'पूरा नाम / पद',
      emailLabel: 'पंजीकृत ईमेल',
      roleLabel: 'भूमिका',
      confirmPasswordLabel: 'पासवर्ड की पुष्टि करें',
      passwordRuleHint: 'कम से कम 8 अक्षर, जिसमें कम से कम एक अक्षर और एक अंक हो।',
      optionalFaceEnroll: 'वैकल्पिक: अभी फेस लॉक सेट करें (या बाद में सेटिंग्स से करें)',
      createAccountBtn: 'खाता बनाएं',
      creatingAccountBtn: 'खाता बन रहा है...',
      accountCreatedSuccess: 'खाता सफलतापूर्वक बन गया है। कृपया नीचे लॉगिन करें।',
      alreadyHaveAccount: 'पहले से खाता है? लॉगिन पर वापस जाएं',
      forgotHeading: 'भूला हुआ पासवर्ड रीसेट करें',
      forgotStep1Desc: '10 मिनट के लिए मान्य 6-अंकीय OTP प्राप्त करने हेतु यूज़रनेम और पंजीकृत ईमेल दर्ज करें।',
      registeredEmailLabel: 'पंजीकृत ईमेल',
      sendOtpBtn: 'OTP भेजें',
      sendingOtpBtn: 'OTP भेजा जा रहा है...',
      demoOtpBoxLabel: 'डेमो (वास्तविक उपयोग में यह ईमेल/SMS द्वारा भेजा जाता है)',
      demoOtpValidNote: '10 मिनट के लिए मान्य। नीचे यह 6-अंकीय कोड दर्ज करें।',
      otpInputLabel: '6-अंकीय OTP दर्ज करें',
      newPasswordLabel: 'नया पासवर्ड',
      confirmNewPasswordLabel: 'नए पासवर्ड की पुष्टि करें',
      resetPasswordBtn: 'OTP सत्यापित करें और पासवर्ड बदलें',
      resendOtpBtn: 'OTP पुनः भेजें',
      resendLimitNote: 'अधिकतम 3 बार पुनः भेजने की अनुमति है।',
      backToLoginLink: 'लॉगिन (पासवर्ड) पर वापस जाएं',
      passwordMismatchError: 'दोनों पासवर्ड मेल नहीं खाते।',
    },
    settings: {
      title: 'सेटिंग्स',
      breadcrumbHome: 'मुख्य पृष्ठ',
      breadcrumbSettings: 'सेटिंग्स',
      menu: {
        general: 'सामान्य / भाषा',
        password: 'पासवर्ड बदलें',
        faceLock: 'फेस लॉक',
        accessibility: 'टेक्स्ट आकार एवं सुगम्यता',
        session: 'सत्र / लॉगआउट',
        demoRole: 'डेमो भूमिका (प्रोटोटाइप)',
      },
      generalHeading: 'सामान्य - भाषा',
      portalLangLabel: 'पोर्टल भाषा',
      langSavedToAccountNote: 'आपकी उपयोगकर्ता प्रोफ़ाइल और ब्राउज़र में सहेजा गया।',
      saveLangBtn: 'सहेजें',
      savedSuccess: 'आपकी प्रोफ़ाइल में सहेजा गया।',
      changePasswordHeading: 'पासवर्ड बदलें',
      currentPasswordLabel: 'वर्तमान पासवर्ड',
      newPasswordLabel: 'नया पासवर्ड (कम से कम 8 अक्षर, अक्षर + अंक)',
      confirmPasswordLabel: 'नए पासवर्ड की पुष्टि करें',
      updatePasswordBtn: 'पासवर्ड अपडेट करें',
      faceLockHeading: 'फेस लॉक',
      faceStatusLabel: 'स्थिति:',
      faceStatusSet: 'सेट है',
      faceStatusNotSet: 'सेट नहीं है',
      faceDesc: 'पासवर्ड के बजाय चेहरे से साइन इन करने के लिए सक्षम करें।',
      enableFaceBtn: 'फेस लॉक सक्षम करें',
      disableFaceBtn: 'अक्षम करें',
      faceFallbackNote: 'पासवर्ड लॉगिन हमेशा उपलब्ध रहता है।',
      privacyTemplateNote: 'चेहरे की फोटो कभी सहेजी नहीं जाती, केवल एन्क्रिप्टेड संख्यात्मक टेम्पलेट सहेजा जाता है।',
      accessibilityHeading: 'टेक्स्ट आकार और सुगम्यता',
      textSizeLabel: 'टेक्स्ट आकार (A- / A / A+)',
      highContrastLabel: 'उच्च-कंट्रास्ट मोड',
      highContrastDesc: 'तालिकाओं और फ़ॉर्म के किनारों तथा अक्षरों का कंट्रास्ट बढ़ाता है।',
      enableContrastBtn: 'उच्च कंट्रास्ट चालू करें',
      disableContrastBtn: 'सामान्य कंट्रास्ट',
      sessionHeading: 'सत्र और साइन आउट',
      signedInAsLabel: 'वर्तमान लॉगिन:',
      logoutBtn: 'लॉगआउट',
      logoutDeviceBtn: 'इस डिवाइस से लॉगआउट करें',
      demoRoleHeading: 'डेमो भूमिका स्विचर (केवल प्रोटोटाइप)',
      demoRoleBanner: 'केवल प्रोटोटाइप परीक्षण के लिए: सक्रिय कार्यक्षेत्र भूमिका बदलें।',
      demoRoleSelectLabel: 'सक्रिय डेमो भूमिका',
    },
    dashboard: {
      welcomePrefix: 'स्वागत है,',
      roleLabel: 'भूमिका:',
      lastLoginLabel: 'अंतिम लॉगिन:',
      firstLoginLabel: 'पहला सत्र',
      demoTag: 'डेमो डेटा - सिंथेटिक, नैदानिक उपयोग के लिए नहीं',
      kpiTotal: 'कुल रन',
      kpiAwaiting: 'समीक्षा लंबित',
      kpiBlocking: 'QA अवरोध त्रुटियाँ',
      kpiReviewed: 'समीक्षित (Reviewed)',
      recentHeading: 'नवीनतम प्रयोग',
      quickActionsHeading: 'त्वरित क्रियाएँ',
      colRunId: 'रन आईडी',
      colDate: 'दिनांक',
      colProtocol: 'प्रोटोकॉल',
      colStatus: 'स्थिति',
      colAction: 'खोलें',
      openRunBtn: 'खोलें',
      btnNewExperiment: '+ नया प्रयोग',
      btnLoadDemo: 'सिंथेटिक डेमो लोड करें',
      btnOpenAnalysis: 'PAP-AUC विश्लेषण खोलें',
      btnViewQa: 'QA फ्लैग देखें',
      btnCompareRuns: 'एकाधिक रन तुलना करें',
      footerTip: 'लॉग इन रहते हुए सार्वजनिक जानकारी पृष्ठ देखने के लिए हेडर में पोर्टल लोगो पर क्लिक करें।',
    },
    footer: {
      quickLinks: 'त्वरित लिंक',
      accessibility: 'सुगम्यता',
      terms: 'नियम एवं शर्तें',
      privacy: 'गोपनीयता नीति',
      help: 'सहायता',
      lastUpdatedLine: 'अंतिम अद्यतन: 15 नवम्बर 2026 · संस्करण 1.0 · सिंथेटिक डेमो डेटा (नैदानिक उपयोग के लिए नहीं)',
      prototypeLine: 'प्रयोगशाला सॉफ़्टवेयर प्रोटोटाइप (भारत सरकार की आधिकारिक वेबसाइट नहीं)।',
      dialogClose: 'बंद करें',
      infoTexts: {
        accessibility: {
          title: 'सुगम्यता विवरण',
          body: 'टेक्स्ट आकार बदलने के लिए A- / A / A+ बटन या सेटिंग्स उपयोग करें, उच्च-कंट्रास्ट मोड चुनें या भाषा ड्रॉपडाउन से हिंदी, मराठी व अंग्रेज़ी चुनें।',
        },
        terms: {
          title: 'प्रोटोटाइप उपयोग शर्तें',
          body: 'यह अनुप्रयोग प्रयोगशाला PAP-AUC गुणवत्ता आश्वासन प्रशिक्षण के लिए एक डेमो प्रोटोटाइप है। यह नैदानिक चिकित्सा उपकरण नहीं है।',
        },
        privacy: {
          title: 'गोपनीयता एवं डेटा नीति',
          body: 'कभी भी वास्तविक रोगी का नाम या व्यक्तिगत पहचान न भरें। केवल कोडित सैंपल आईडी उपयोग करें। फेस लॉक केवल संख्यात्मक वेक्टर सहेजता है।',
        },
        help: {
          title: 'सहायता और डेमो खाते',
          body: 'डेमो खाते: analyst, reviewer, या auditor (पासवर्ड: hvisa123; ईमेल: analyst@hvisa-demo.org)। फेस लॉक व भाषा के लिए सेटिंग्स देखें।',
        },
      },
    },
  },
  mr: {
    header: {
      skipToContent: 'मुख्य मजकुराकडे जा',
      screenReaderAccess: 'स्क्रीन रीडर प्रवेश',
      screenReaderNotice:
        'स्क्रीन रीडर मोड सक्रिय: लिंक्सवरून जाण्यासाठी Tab वापरा, अक्षरांचा आकार बदलण्यासाठी A-/A/A+ दाबा आणि भाषा ड्रॉपडाऊनमधून मराठी, हिंदी किंवा इंग्रजी निवडा.',
      emblemAlt: 'भारताचे राजचिन्ह',
      siteName: 'सूक्ष्मवेध',
      siteDescription:
        'विषम व्हँकोमायसिन-मध्यम स्टॅफिलोकोकस ऑरियस (hVISA) साठी प्रयोगशाळा विश्लेषण पोर्टल',
      demoBannerTag: 'डेमो / कृत्रिम डेटा',
      prototypeDisclaimer: 'प्रोटोटाइप (भारत सरकारची अधिकृत वेबसाइट नाही)',
      languageSelectLabel: 'भाषा',
      loginBtn: 'लॉगिन',
      registerBtn: 'नोंदणी',
      profileMenuItem: 'सार्वजनिक माहिती पृष्ठ',
      settingsMenuItem: 'सेटिंग्ज',
      logoutMenuItem: 'लॉगआउट',
      backToWorkspaceBtn: 'सॉफ्टवेअर कार्यक्षेत्र उघडा',
      publicNav: [
        { id: 'home', label: 'मुख्यपृष्ठ' },
        { id: 'about', label: 'माहिती' },
        { id: 'what-is-hvisa', label: 'hVISA म्हणजे काय' },
        { id: 'how-it-works', label: 'कार्यपद्धती' },
        { id: 'who-can-use', label: 'कोण वापरू शकते' },
        { id: 'gallery', label: 'दालन' },
        { id: 'faq', label: 'नेहमीचे प्रश्न' },
        { id: 'contact', label: 'संपर्क' },
      ],
      authNav: {
        dashboard: 'डॅशबोर्ड',
        experiments: 'प्रयोग',
        analysis: 'PAP-AUC विश्लेषण',
        qa: 'QA तपासणी',
        reports: 'अहवाल',
        outreach: 'ग्रामीण संपर्क',
        settings: 'सेटिंग्ज',
      },
    },
    publicHome: {
      heroTitle: 'hVISA विश्लेषण सोप्या भाषेत समजून घ्या',
      heroDescription:
        'सूक्ष्मवेध प्रशिक्षित सूक्ष्मजीवशास्त्र प्रयोगशाळांना वाढत्या व्हँकोमायसिन पातळीवर Staphylococcus aureus नमुना कसा वाढतो हे मोजण्यास, PAP वक्र तयार करण्यास आणि Mu3 संदर्भ स्ट्रेनसोबत AUC गुणोत्तर काढण्यास मदत करते. हे केवळ प्रयोगशाळा गुणवत्ता साधन आहे, निदान यंत्र नाही.',
      heroLoginBtn: 'पोर्टलवर लॉगिन करा',
      heroRegisterBtn: 'नोंदणी करा',
      heroHowItWorksBtn: 'कार्यपद्धती पहा ↓',
      heroImageCaption: 'कल्चर प्लेट्स आणि PAP प्रोटोकॉलची तपासणी करणारी प्रयोगशाळा',
      heroImageAlt: 'प्रयोगशाळेत जिवाणू कल्चर प्लेट्स तपासणारी सूक्ष्मजीवशास्त्रज्ञ',
      noticeBarText:
        'सूचना: हा केवळ कृत्रिम डेमो डेटासह तयार केलेला प्रोटोटाइप आहे. हे वैद्यकीय यंत्र नाही व रुग्ण निदानासाठी किंवा उपचारासाठी वापरू नये.',
      quickOverviewCards: [
        {
          id: 'about',
          title: 'पोर्टल विषयी',
          summary: 'पोर्टलचे कार्य, गणितीय नियम आणि प्रयोगशाळा गुणवत्ता मर्यादा.',
          linkText: 'अधिक वाचा',
        },
        {
          id: 'what-is-hvisa',
          title: 'hVISA म्हणजे काय?',
          summary: 'सोप्या शब्दांत PAP वक्र, AUC गणना आणि Mu3 संदर्भ तुलना.',
          linkText: 'अधिक वाचा',
        },
        {
          id: 'how-it-works',
          title: 'कार्यपद्धती',
          summary: 'कॉलनी नोंदीपासून स्वाक्षरीकृत PDF/CSV अहवालापर्यंत ५ टप्पे.',
          linkText: 'अधिक वाचा',
        },
        {
          id: 'who-can-use',
          title: 'कोण वापरू शकते',
          summary: 'लॅब विश्लेषक, तज्ज्ञ सूक्ष्मजीवशास्त्रज्ञ आणि ऑडिटर यांचे अधिकार.',
          linkText: 'अधिक वाचा',
        },
      ],
      aboutSectionTitle: 'सूक्ष्मवेध पोर्टल विषयी माहिती',
      aboutParagraphs: [
        'सूक्ष्मवेध हे विषम व्हँकोमायसिन-मध्यम स्टॅफिलोकोकस ऑरियस (hVISA) चा अभ्यास करणाऱ्या प्रशिक्षित प्रयोगशाळा कर्मचाऱ्यांसाठी तयार केलेले कार्यक्षेत्र आहे.',
        'वाढत्या व्हँकोमायसिन सांद्रतेच्या प्लेट्सवरील कॉलनी मोजणी भरल्यावर प्रणाली CFU/mL आणि log10(CFU/mL) काढते, PAP वक्र तयार करते, ट्रेपेझॉइडल नियमाने AUC मोजते आणि Mu3 मानकाशी गुणोत्तर काढते.',
        'सर्व गणना गणितीय सूत्रे व ८-नियम गुणवत्ता तपासणीद्वारे होतात. यासाठी AI वापरले जात नाही आणि रुग्णांची वैयक्तिक नावे कुठेही साठवली जात नाहीत.',
      ],
      whatIsTitle: 'hVISA म्हणजे काय? (सोप्या शब्दांत मुख्य संकल्पना)',
      whatIsIntro:
        'काही Staphylococcus aureus नमुने नेहमीच्या चाचणीत संवेदनशील दिसू शकतात, परंतु त्यात उच्च व्हँकोमायसिनमध्ये वाढणारा छोटा उप-गट असू शकतो. PAP-AUC तपासणी प्रयोगशाळेत हे मोजते:',
      whatIsTerms: [
        {
          term: 'PAP (लोकसंख्या विश्लेषण प्रोफाइल)',
          plainMeaning: 'वाढत्या प्रतिजैविक सांद्रतेवरील वाढ वक्र',
          detail:
            '०.५, १.०, २.०, २.५, ४.० mg/L व्हँकोमायसिन प्लेट्सवरील कॉलनी मोजणी करून log10 CFU/mL वक्र तयार केला जातो.',
        },
        {
          term: 'AUC (वक्राखालील क्षेत्रफळ)',
          plainMeaning: 'निश्चित गणिताने काढलेले एकूण क्षेत्रफळ',
          detail:
            'सांद्रता श्रेणीवर log10 वक्राखालील क्षेत्रफळ ट्रेपेझॉइडल पद्धतीने अचूकपणे मोजले जाते.',
        },
        {
          term: 'Mu3 संदर्भ गुणोत्तर',
          plainMeaning: 'त्याच चाचणीतील मानक स्ट्रेन (ATCC 700698)',
          detail:
            'चाचणी नमुन्याचा AUC त्याच प्रयोगशाळा चाचणीतील Mu3 नियंत्रण AUC ने भागून निश्चित मर्यादेसह दाखवला जातो.',
        },
      ],
      howItWorksTitle: 'लॉगिननंतर प्रयोगशाळा विश्लेषण कसे चालते',
      howItWorksSubtitle: 'अधिकृत कर्मचारी या ५ पारदर्शक व ऑडिटेड टप्प्यांचे पालन करतात:',
      howItWorksSteps: [
        {
          step: '1',
          title: 'प्रयोग तयार करा व प्रोटोकॉल निवडा',
          detail: 'Run ID, दिनांक, SOP प्रोफाइल आणि Mu3 संदर्भ स्ट्रेन निश्चित करा.',
        },
        {
          step: '2',
          title: 'कॉलनी मोजणी भरा',
          detail: 'स्ट्रेन, सांद्रता, प्रतिकृती, सौम्यीकरण, आकारमान व कॉलनी संख्या भरा किंवा CSV आयात करा.',
        },
        {
          step: '3',
          title: 'तपासणी आणि गुणवत्ता नियंत्रण (QA)',
          detail: '८-नियम QA प्रणाली ऋण संख्या, अपूर्ण Mu3 कंट्रोल, दुहेरी नोंदी किंवा शून्य-कॉलनी त्रुटी रोखते.',
        },
        {
          step: '4',
          title: 'PAP वक्र, AUC व Mu3 गुणोत्तर काढा',
          detail: 'प्रणाली log10(CFU/mL), ट्रेपेझॉइडल AUC आणि Mu3 गुणोत्तर मर्यादेसह मोजते.',
        },
        {
          step: '5',
          title: 'QA पुनरावलोकन, अहवाल व ऑडिट नोंद',
          detail: 'समीक्षक टिप्पणी देऊन मान्यता देतात आणि आलेखांसह PDF/CSV अहवाल डाउनलोड होतो.',
        },
      ],
      whoCanUseTitle: 'हे पोर्टल कोण वापरू शकते',
      whoCanUseSubtitle: 'प्रयोगशाळा नोंदी सुरक्षित ठेवण्यासाठी प्रत्येक भूमिकेला स्वतंत्र अधिकार आहेत:',
      roles: [
        {
          title: 'लॅब विश्लेषक (Lab Analyst)',
          badge: 'डेटा नोंदणी आणि गणना',
          summary: 'नवीन प्रयोग तयार करतात, प्लेट कॉलनी संख्या भरतात, PAP-AUC गणना चालवतात व ग्रामीण नमुने नोंदवतात.',
          permissions: [
            'नवीन प्रयोग सुरू करणे व CSV आयात करणे',
            'PAP-AUC गणना व QA तपासणी चालवणे',
            'PHC ग्रामीण नमुना पाठवणी व्यवस्थापित करणे',
          ],
        },
        {
          title: 'समीक्षक / सूक्ष्मजीवशास्त्रज्ञ',
          badge: 'QA पडताळणी आणि मान्यता',
          summary: 'चेतावणी असलेल्या वक्रांची तपासणी करतात, SOP मर्यादा ठरवतात आणि अहवालांना मान्यता देतात.',
          permissions: [
            'QA यादी तपासून टिप्पणी नोंदवणे',
            'चाचणीस Reviewed मान्यता देणे',
            'SOP मर्यादा व ग्राम अहवाल स्थिती अद्यतनित करणे',
          ],
        },
        {
          title: 'ऑडिटर (केवळ पाहण्यासाठी)',
          badge: 'निरीक्षण आणि अनुपालन',
          summary: 'डेटा न बदलता सर्व गणना, प्रोटोकॉल आवृत्त्या, QA इशारे आणि ऑडिट नोंदी तपासतात.',
          permissions: [
            'सर्व ऑडिट इतिहास व बदल तपासणे',
            'प्रोटोकॉल व QA नोंदी पडताळणे',
            'निरीक्षणासाठी PDF / CSV प्रती काढणे',
          ],
        },
      ],
      galleryTitle: 'प्रयोगशाळा व क्षेत्रीय कार्य दालन',
      gallerySubtitle: 'एगर प्लेट कार्यपद्धती, नमुना PAP वक्र, ग्रामीण आरोग्य केंद्र संपर्क आणि लॅब टीम (डेमो चित्रे).',
      galleryItems: [
        {
          key: 'petri',
          caption: 'प्रतिजैविक प्लेट्सवर जिवाणू कॉलनी असलेली पेट्री डिश',
          alt: 'प्रयोगशाळेत जिवाणू कॉलनी दिसणारी पेट्री डिश',
        },
        {
          key: 'pap_svg',
          caption: 'नमुना PAP-AUC वक्र (चाचणी नमुना गडद हिरव्या रंगात व Mu3 केशरी रंगात)',
          alt: 'Mu3 संदर्भासह चाचणी नमुन्याचा PAP-AUC तुलना वक्र',
        },
        {
          key: 'rural',
          caption: 'प्राथमिक आरोग्य केंद्रावर ग्रामीण नमुना संकलन व आरोग्य संवाद',
          alt: 'प्राथमिक आरोग्य केंद्राबाहेर ग्रामस्थांशी संवाद साधणारी आरोग्य सेविका',
        },
        {
          key: 'team',
          caption: 'कॉलनी मोजणी व प्रोटोकॉल तपासणारी प्रयोगशाळा टीम',
          alt: 'प्रयोगशाळेत एगर प्लेट्स व नोंदपत्रक तपासणारे दोन तंत्रज्ञ',
        },
      ],
      faqTitle: 'नेहमी विचारले जाणारे प्रश्न (FAQ)',
      faqs: [
        {
          q: 'सूक्ष्मवेध हे वैद्यकीय निदान यंत्र आहे का?',
          a: 'नाही. हा केवळ कृत्रिम डेमो डेटासह प्रयोगशाळा गुणवत्ता-तपासणी आणि प्रशिक्षणासाठी तयार केलेला प्रोटोटाइप आहे. यात रुग्ण निदान किंवा उपचार सल्ला दिला जात नाही.',
        },
        {
          q: 'लॉगिनपूर्वी डॅशबोर्ड व प्रयोग टॅब का दिसत नाहीत?',
          a: 'प्रयोगशाळेतील नोंदी आणि QA तपासणी सुरक्षित कार्यक्षेत्रातच असतात. सार्वजनिक मुख्यपृष्ठावर केवळ माहिती व चित्रे दाखवली जातात.',
        },
        {
          q: 'PAP-AUC मोजण्यासाठी AI वापरले जाते का?',
          a: 'नाही. सर्व CFU/mL रूपांतरण, log10 मूल्य, ट्रेपेझॉइडल AUC व Mu3 गुणोत्तर शुद्ध गणितीय कोडद्वारे मोजले जाते.',
        },
        {
          q: 'प्लेटवर शून्य (0) कॉलनी असल्यास काय होते?',
          a: 'शून्यासाठी कधीही log10(0) काढले जात नाही. निवडलेल्या SOP धोरणानुसार (Detection Limit, Pseudocount किंवा Exclude Point) प्रक्रिया केली जाते.',
        },
        {
          q: 'पोर्टलमध्ये रुग्णांची नावे साठवली जातात का?',
          a: 'नाही. केवळ निनावी नमुना कोड (उदा. DEMO-ISO-01) आणि PHC गट कोड वापरले जातात.',
        },
        {
          q: 'फेस लॉक कसे काम करते आणि ते नसल्यास काय करावे?',
          a: 'फेस लॉक ऐच्छिक असून त्यात केवळ संख्यात्मक वेक्टर साठवला जातो, फोटो नाही. फेस लॉक सेट नसल्यास प्रणाली आपोआप पासवर्ड लॉगिनवर परत जाते.',
        },
        {
          q: '५ वेळा चुकीचा पासवर्ड टाकल्यास काय होते?',
          a: 'सुरक्षेसाठी खाते १५ मिनिटे लॉक होते, किंवा तुम्ही Forgot Password OTP द्वारे नवीन पासवर्ड सेट करू शकता.',
        },
        {
          q: 'पोर्टलमध्ये कोणत्या भाषा उपलब्ध आहेत?',
          a: 'इंग्रजी (English), हिंदी (हिन्दी) आणि मराठी (मराठी). ड्रॉपडाऊनमधून निवडलेली भाषा संपूर्ण पोर्टल व अहवालांमध्ये लागू होते.',
        },
      ],
      contactTitle: 'पोर्टल मदत केंद्र व संपर्क',
      contactCards: [
        {
          label: 'प्रयोगशाळा QA मदत केंद्र',
          value: 'qa-support@hvisa-demo.org',
          note: 'सोम–शुक्र, 09:30–17:30 IST (प्रोटोटाइप सहाय्य)',
        },
        {
          label: 'ग्रामीण PHC संपर्क कक्ष',
          value: 'field-bridge@hvisa-demo.org',
          note: 'कोल्ड-चेन नोंद व ऑडिओ मार्गदर्शक सहाय्य',
        },
        {
          label: 'डेमो लॉगिन तपशील',
          value: 'analyst / reviewer / auditor',
          note: 'डीफॉल्ट पासवर्ड: hvisa123 (ईमेल: <role>@hvisa-demo.org)',
        },
      ],
      disclaimerTitle: 'महत्त्वाची सूचना व मर्यादा',
      disclaimerPoints: [
        'या प्रोटोटाइपमध्ये दिलेले सर्व प्रयोग व डेटा कृत्रिम डेमो नोंदी आहेत.',
        'वर्गीकरण मर्यादा (< 0.90, 0.90–1.30, > 1.30) या बदलता येणाऱ्या प्रयोगशाळा सेटिंग्ज आहेत, अंतिम वैद्यकीय निर्णय नव्हे.',
        'प्रोटोटाइप (ही भारत सरकारची अधिकृत वेबसाइट नाही).',
      ],
    },
    login: {
      whyLoginTitle: 'लॉगिन का करावे?',
      whyLoginBullets: [
        'नवीन प्रयोगशाळा चाचण्या तयार करा व कॉलनी नोंदी भरा',
        'PAP-AUC गणना आणि ८-नियम गुणवत्ता तपासणी (QA) चालवा',
        'आलेखांसह PDF आणि CSV अहवाल डाउनलोड करा',
        'सेटिंग्जमध्ये भाषा बदला, पासवर्ड अपडेट करा व फेस लॉक व्यवस्थापित करा',
      ],
      noAccountPrompt: 'खाते नाही का?',
      registerHereLink: 'येथे नोंदणी करा',
      imageCaption: 'अधिकृत सूक्ष्मजीवशास्त्र प्रयोगशाळा कार्यक्षेत्र प्रवेश',
      imageAlt: 'प्रयोगशाळेत जिवाणू प्लेट्सची तपासणी करणारी शास्त्रज्ञ',
      loginHeading: 'सूक्ष्मवेध मध्ये लॉगिन करा',
      usernameLabel: 'युजरनेम / कर्मचारी आयडी',
      usernamePlaceholder: 'उदा. analyst',
      chooseMethodLabel: 'लॉगिन पद्धत निवडा',
      passwordMethodLabel: 'पासवर्ड (डीफॉल्ट)',
      faceMethodLabel: 'फेस लॉक',
      passwordLabel: 'पासवर्ड',
      showPasswordBtn: 'दाखवा',
      hidePasswordBtn: 'लपवा',
      forgotPasswordLink: 'पासवर्ड विसरलात?',
      loginSubmitBtn: 'लॉगिन',
      loggingInBtn: 'लॉगिन होत आहे...',
      scanFaceHeading: 'फेस लॉकद्वारे प्रवेश करा',
      scanFaceHint: 'लॉगिन करण्यासाठी चेहरा स्कॅन करा.',
      scanFaceBtn: 'चेहरा स्कॅन करा',
      usePasswordInstead: 'त्याऐवजी पासवर्ड वापरा',
      newUserPrompt: 'नवीन वापरकर्ता?',
      registerLink: 'नोंदणी करा',
      backToHomeLink: 'मुख्यपृष्ठावर जा',
      oneMethodNote: 'एका वेळी फक्त एकच पद्धत दिसते. पासवर्ड लॉगिन नेहमी उपलब्ध राहते.',
      registerHeading: 'नवीन खाते नोंदणी',
      displayNameLabel: 'पूर्ण नाव / पद',
      emailLabel: 'नोंदणीकृत ईमेल',
      roleLabel: 'भूमिका',
      confirmPasswordLabel: 'पासवर्डची पुष्टी करा',
      passwordRuleHint: 'किमान ८ अक्षरे, त्यामध्ये किमान एक अक्षर आणि एक अंक असावा.',
      optionalFaceEnroll: 'ऐच्छिक: आत्ताच फेस लॉक सेट करा (किंवा नंतर सेटिंग्जमध्ये करा)',
      createAccountBtn: 'खाते तयार करा',
      creatingAccountBtn: 'खाते तयार होत आहे...',
      accountCreatedSuccess: 'खाते यशस्वीरित्या तयार झाले. कृपया खाली लॉगिन करा.',
      alreadyHaveAccount: 'आधीच खाते आहे? लॉगिनवर परत जा',
      forgotHeading: 'विसरलेला पासवर्ड बदला',
      forgotStep1Desc: '१० मिनिटे वैध असलेला ६-अंकी OTP मिळवण्यासाठी युजरनेम आणि नोंदणीकृत ईमेल भरा.',
      registeredEmailLabel: 'नोंदणीकृत ईमेल',
      sendOtpBtn: 'OTP पाठवा',
      sendingOtpBtn: 'OTP पाठवत आहे...',
      demoOtpBoxLabel: 'डेमो (प्रत्यक्ष प्रणालीत हा OTP ईमेल/SMS द्वारे पाठवला जातो)',
      demoOtpValidNote: '१० मिनिटांसाठी वैध. खाली हा ६-अंकी कोड टाका.',
      otpInputLabel: '६-अंकी OTP भरा',
      newPasswordLabel: 'नवीन पासवर्ड',
      confirmNewPasswordLabel: 'नवीन पासवर्डची पुष्टी करा',
      resetPasswordBtn: 'OTP तपासा व पासवर्ड बदला',
      resendOtpBtn: 'OTP पुन्हा पाठवा',
      resendLimitNote: 'जास्तीत जास्त ३ वेळा पुन्हा पाठवता येईल.',
      backToLoginLink: 'लॉगिन (पासवर्ड) कडे परत जा',
      passwordMismatchError: 'दोन्ही पासवर्ड जुळत नाहीत.',
    },
    settings: {
      title: 'सेटिंग्ज',
      breadcrumbHome: 'मुख्यपृष्ठ',
      breadcrumbSettings: 'सेटिंग्ज',
      menu: {
        general: 'सामान्य / भाषा',
        password: 'पासवर्ड बदला',
        faceLock: 'फेस लॉक',
        accessibility: 'अक्षर आकार व सुगम्यता',
        session: 'सत्र / लॉगआउट',
        demoRole: 'डेमो भूमिका (प्रोटोटाइप)',
      },
      generalHeading: 'सामान्य - भाषा',
      portalLangLabel: 'पोर्टल भाषा',
      langSavedToAccountNote: 'तुमच्या खात्यात आणि ब्राउझरमध्ये जतन केले.',
      saveLangBtn: 'जतन करा',
      savedSuccess: 'तुमच्या प्रोफाइलमध्ये जतन केले.',
      changePasswordHeading: 'पासवर्ड बदला',
      currentPasswordLabel: 'सध्याचा पासवर्ड',
      newPasswordLabel: 'नवीन पासवर्ड (किमान ८ अक्षरे, अक्षर + अंक)',
      confirmPasswordLabel: 'नवीन पासवर्डची पुष्टी करा',
      updatePasswordBtn: 'पासवर्ड अद्यतनित करा',
      faceLockHeading: 'फेस लॉक',
      faceStatusLabel: 'स्थिती:',
      faceStatusSet: 'सेट आहे',
      faceStatusNotSet: 'सेट नाही',
      faceDesc: 'पासवर्डऐवजी चेहऱ्याने लॉगिन करण्यासाठी सक्षम करा.',
      enableFaceBtn: 'फेस लॉक सुरू करा',
      disableFaceBtn: 'बंद करा',
      faceFallbackNote: 'पासवर्ड लॉगिन नेहमी उपलब्ध राहते.',
      privacyTemplateNote: 'चेहऱ्याचा फोटो कधीही जतन केला जात नाही, केवळ संख्यात्मक टेम्पलेट जतन होतो.',
      accessibilityHeading: 'अक्षर आकार आणि सुगम्यता',
      textSizeLabel: 'अक्षर आकार (A- / A / A+)',
      highContrastLabel: 'उच्च-कंट्रास्ट मोड',
      highContrastDesc: 'तक्ते आणि फॉर्मच्या कडा व अक्षरांचा कंट्रास्ट वाढवतो.',
      enableContrastBtn: 'उच्च कंट्रास्ट सुरू करा',
      disableContrastBtn: 'सामान्य कंट्रास्ट',
      sessionHeading: 'सत्र आणि बाहेर पडा',
      signedInAsLabel: 'सध्याचे लॉगिन:',
      logoutBtn: 'लॉगआउट',
      logoutDeviceBtn: 'या उपकरणातून लॉगआउट करा',
      demoRoleHeading: 'डेमो भूमिका स्विचर (केवळ प्रोटोटाइप)',
      demoRoleBanner: 'केवळ प्रोटोटाइप तपासणीसाठी: सक्रिय कार्यक्षेत्र भूमिका बदला.',
      demoRoleSelectLabel: 'सक्रिय डेमो भूमिका',
    },
    dashboard: {
      welcomePrefix: 'स्वागत आहे,',
      roleLabel: 'भूमिका:',
      lastLoginLabel: 'शेवटचे लॉगिन:',
      firstLoginLabel: 'पहिले सत्र',
      demoTag: 'डेमो डेटा - कृत्रिम, वैद्यकीय वापरासाठी नाही',
      kpiTotal: 'एकूण चाचण्या',
      kpiAwaiting: 'प्रतीक्षेत (Pending)',
      kpiBlocking: 'QA अवरोध त्रुटी',
      kpiReviewed: 'तपासलेले (Reviewed)',
      recentHeading: 'अलीकडील प्रयोग',
      quickActionsHeading: 'त्वरित कृती',
      colRunId: 'रन आयडी',
      colDate: 'दिनांक',
      colProtocol: 'प्रोटोकॉल',
      colStatus: 'स्थिती',
      colAction: 'उघडा',
      openRunBtn: 'उघडा',
      btnNewExperiment: '+ नवीन प्रयोग',
      btnLoadDemo: 'कृत्रिम डेमो लोड करा',
      btnOpenAnalysis: 'PAP-AUC विश्लेषण उघडा',
      btnViewQa: 'QA त्रुटी पहा',
      btnCompareRuns: 'अनेक चाचण्यांची तुलना',
      footerTip: 'लॉगिन राहून सार्वजनिक माहिती पृष्ठ पाहण्यासाठी वरील लोगोवर क्लिक करा.',
    },
    footer: {
      quickLinks: 'महत्त्वाचे दुवे',
      accessibility: 'सुगम्यता',
      terms: 'अटी व शर्ती',
      privacy: 'गोपनीयता धोरण',
      help: 'मदत',
      lastUpdatedLine: 'शेवटचे अद्यतन: १५ नोव्हेंबर २०२६ · आवृत्ती १.० · कृत्रिम डेमो डेटा (वैद्यकीय वापरासाठी नाही)',
      prototypeLine: 'प्रयोगशाळा सॉफ्टवेअर प्रोटोटाइप (भारत सरकारची अधिकृत वेबसाइट नाही).',
      dialogClose: 'बंद करा',
      infoTexts: {
        accessibility: {
          title: 'सुगम्यता माहिती',
          body: 'अक्षर आकार बदलण्यासाठी A- / A / A+ किंवा सेटिंग्ज वापरा, उच्च-कंट्रास्ट निवडा किंवा भाषा ड्रॉपडाऊनमधून मराठी, हिंदी व इंग्रजी निवडा.',
        },
        terms: {
          title: 'प्रोटोटाइप वापराच्या अटी',
          body: 'हा प्रकल्प प्रयोगशाळेतील PAP-AUC गुणवत्ता प्रशिक्षणासाठी डेमो प्रोटोटाइप आहे. हे वैद्यकीय निदान साधन नाही.',
        },
        privacy: {
          title: 'गोपनीयता व डेटा धोरण',
          body: 'कधीही प्रत्यक्ष रुग्णाचे नाव किंवा वैयक्तिक माहिती भरू नका. केवळ नमुना कोड वापरा. फेस लॉकमध्ये फोटो साठवला जात नाही.',
        },
        help: {
          title: 'मदत आणि डेमो खाती',
          body: 'डेमो खाती: analyst, reviewer, किंवा auditor (पासवर्ड: hvisa123; ईमेल: analyst@hvisa-demo.org). फेस लॉक व भाषेसाठी सेटिंग्ज पहा.',
        },
      },
    },
  },
};

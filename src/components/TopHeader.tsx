import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Home, LogOut, Settings, User } from 'lucide-react';
import { TRIBAL_LANGUAGES } from '../lib/communityHealthContent.ts';
import { useI18n } from '../lib/i18n.tsx';
import { PORTAL_CONTENT } from '../lib/portalContent.ts';
import type { AuthUser, TribalLanguageCode } from '../types/hvisa.ts';

export type AppScreen =
  | 'home'
  | 'dashboard'
  | 'experiments'
  | 'analysis'
  | 'qa'
  | 'reports'
  | 'outreach'
  | 'settings';

interface TopHeaderProps {
  viewMode: 'public' | 'workspace';
  activeScreen: AppScreen;
  activePublicSection?: string;
  currentUser: AuthUser | null;
  onNavigate: (screen: AppScreen) => void;
  onOpenPublicHome: (sectionId?: string) => void;
  onOpenWorkspace: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onLanguageChange?: (nextLang: TribalLanguageCode) => void;
}

export function TopHeader({
  viewMode,
  activeScreen,
  activePublicSection = 'home',
  currentUser,
  onNavigate,
  onOpenPublicHome,
  onOpenWorkspace,
  onOpenAuth,
  onOpenSettings,
  onLogout,
  onLanguageChange,
}: TopHeaderProps) {
  const {
    lang,
    setLang,
    fontScale,
    increaseFont,
    decreaseFont,
    resetFont,
    t,
    translateRoleShort,
  } = useI18n();

  const content = PORTAL_CONTENT[lang] ?? PORTAL_CONTENT.en;
  const h = content.header;

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelectLanguage = (nextLang: TribalLanguageCode) => {
    setLang(nextLang);
    if (onLanguageChange) {
      onLanguageChange(nextLang);
    }
  };

  const authTabs: Array<{ id: AppScreen; label: string }> = [
    { id: 'dashboard', label: h.authNav.dashboard },
    { id: 'experiments', label: h.authNav.experiments },
    { id: 'analysis', label: h.authNav.analysis },
    { id: 'qa', label: h.authNav.qa },
    { id: 'reports', label: h.authNav.reports },
    { id: 'outreach', label: h.authNav.outreach },
    { id: 'settings', label: h.authNav.settings },
  ];

  const showPublicNav = !currentUser || viewMode === 'public';

  return (
    <div className="no-print">
      <div className="bg-[#F7F8F9] border-b border-[#DCE1E6] text-[#1F2933] text-xs">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 min-h-10 py-1.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#main-content"
              className="text-xs font-medium text-[#1F2933] hover:text-[#0B5D1E] underline-offset-2 hover:underline focus:outline-2 focus:outline-[#FF9933] whitespace-nowrap"
            >
              {h.skipToContent}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1" role="group" aria-label="Text size">
              <button
                type="button"
                onClick={decreaseFont}
                disabled={fontScale <= 87.5}
                title={t('fontDecreaseTitle')}
                aria-label={t('fontDecreaseTitle')}
                className="px-2 py-0.5 text-xs font-bold border border-[#DCE1E6] bg-white hover:bg-[#F7F8F9] disabled:opacity-40 text-[#1F2933] rounded-[4px] cursor-pointer"
              >
                A-
              </button>
              <button
                type="button"
                onClick={resetFont}
                title={t('fontResetTitle')}
                aria-label={t('fontResetTitle')}
                className={`px-2 py-0.5 text-xs font-bold border rounded-[4px] cursor-pointer ${
                  fontScale === 100
                    ? 'border-[#1F2933] bg-[#1F2933] text-white'
                    : 'border-[#DCE1E6] bg-white hover:bg-[#F7F8F9] text-[#1F2933]'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={increaseFont}
                disabled={fontScale >= 125}
                title={t('fontIncreaseTitle')}
                aria-label={t('fontIncreaseTitle')}
                className="px-2 py-0.5 text-xs font-bold border border-[#DCE1E6] bg-white hover:bg-[#F7F8F9] disabled:opacity-40 text-[#1F2933] rounded-[4px] cursor-pointer"
              >
                A+
              </button>
            </div>

            <div className="inline-flex items-center gap-1.5">
              <label htmlFor="header-lang-select" className="sr-only">
                {h.languageSelectLabel}
              </label>
              <select
                id="header-lang-select"
                value={lang}
                onChange={(e) => handleSelectLanguage(e.target.value as TribalLanguageCode)}
                aria-label={h.languageSelectLabel}
                className="text-xs font-semibold text-[#1F2933] bg-white border border-[#DCE1E6] rounded-[4px] px-2.5 py-1 focus:outline-2 focus:outline-[#FF9933] cursor-pointer"
              >
                {TRIBAL_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {h.languageSelectLabel}: {l.nativeLabel}
                  </option>
                ))}
              </select>
            </div>

            {currentUser ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-[#DCE1E6] bg-white hover:bg-[#F7F8F9] text-[#1F2933] rounded-[4px] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <User className="w-3.5 h-3.5 text-[#0B5D1E] shrink-0" />
                  <span>
                    {currentUser.displayName} · {translateRoleShort(currentUser.role)}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#1F2933]/70 shrink-0" />
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1 w-56 bg-white border border-[#DCE1E6] rounded-[4px] z-50 py-1 shadow-sm"
                  >
                    <div className="px-3 py-2 border-b border-[#DCE1E6] text-[11px] text-[#1F2933]/70 font-mono">
                      @{currentUser.username}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenPublicHome('home');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-[#1F2933] hover:bg-[#F7F8F9] flex items-center gap-2 cursor-pointer"
                    >
                      <Home className="w-3.5 h-3.5 text-[#0B5D1E]" />
                      <span>{h.profileMenuItem}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-[#1F2933] hover:bg-[#F7F8F9] flex items-center gap-2 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#0B5D1E]" />
                      <span>{h.settingsMenuItem}</span>
                    </button>
                    <div className="border-t border-[#DCE1E6] my-1" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-[#B3261E] hover:bg-[#F7F8F9] flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{h.logoutMenuItem}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1 text-xs font-semibold border border-[#0B5D1E] bg-white hover:bg-[#F7F8F9] text-[#0B5D1E] rounded-[4px] cursor-pointer whitespace-nowrap shrink-0"
                >
                  {h.loginBtn}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1 text-xs font-semibold bg-[#0B5D1E] hover:bg-[#094a17] text-white rounded-[4px] cursor-pointer whitespace-nowrap shrink-0"
                >
                  {h.registerBtn}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <header className="bg-white border-b border-[#DCE1E6]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onOpenPublicHome('home')}
            className="flex items-center gap-3.5 text-left cursor-pointer group"
          >
            <img
              src="/assets/aistudio/emblem_6736c1b3.png"
              alt={h.emblemAlt}
              referrerPolicy="no-referrer"
              className="h-14 w-auto object-contain shrink-0"
            />

            <div>
              <div className="text-[22px] font-bold tracking-tight text-[#1F2933] group-hover:text-[#0B5D1E] transition-colors leading-snug">
                {h.siteName}
              </div>
              <div className="text-xs sm:text-sm text-[#1F2933]/75">{h.siteDescription}</div>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            {currentUser && viewMode === 'public' && (
              <button
                type="button"
                onClick={onOpenWorkspace}
                className="px-3.5 py-2 text-xs font-bold bg-[#0B5D1E] hover:bg-[#094a17] text-white rounded-[4px] cursor-pointer whitespace-nowrap shrink-0"
              >
                {h.backToWorkspaceBtn}
              </button>
            )}
            <div className="text-right">
              <div className="text-xs font-bold tracking-wide text-[#B26A00]">
                {h.demoBannerTag}
              </div>
              <div className="text-[11px] text-[#1F2933]/70">{h.prototypeDisclaimer}</div>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-[#1F2933] text-white" aria-label="Primary portal navigation">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 flex items-stretch overflow-x-auto">
          {showPublicNav ? (
            h.publicNav.map((item) => {
              const isActive = activePublicSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenPublicHome(item.id);
                  }}
                  className={`px-4 py-3 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#FF9933] text-[#1F2933]'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </a>
              );
            })
          ) : (
            authTabs.map((tab) => {
              const isActive = activeScreen === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onNavigate(tab.id)}
                  className={`px-4 py-3 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#FF9933] text-[#1F2933]'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })
          )}
        </div>
      </nav>
    </div>
  );
}

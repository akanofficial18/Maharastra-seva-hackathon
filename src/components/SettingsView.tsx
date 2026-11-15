import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  LogOut,
  ScanFace,
  ShieldCheck,
  Sliders,
  Trash2,
} from 'lucide-react';
import { TRIBAL_LANGUAGES } from '../lib/communityHealthContent.ts';
import { api } from '../lib/api.ts';
import { useI18n } from '../lib/i18n.tsx';
import { DEMO_ROLES } from '../lib/permissions.ts';
import { PORTAL_CONTENT } from '../lib/portalContent.ts';
import type { AuthUser, TribalLanguageCode, UserRole } from '../types/hvisa.ts';
import { FaceCapturePanel } from './FaceCapturePanel.tsx';

type SettingsSection =
  | 'general'
  | 'password'
  | 'faceLock'
  | 'accessibility'
  | 'session'
  | 'demoRole';

interface SettingsViewProps {
  currentUser: AuthUser;
  role: UserRole;
  onRoleChange: (nextRole: UserRole) => void;
  onUserUpdated: (nextUser: AuthUser) => void;
  onGoHome: () => void;
  onLogout: (allDevices?: boolean) => void;
}

export function SettingsView({
  currentUser,
  role,
  onRoleChange,
  onUserUpdated,
  onGoHome,
  onLogout,
}: SettingsViewProps) {
  const {
    lang,
    setLang,
    fontScale,
    increaseFont,
    decreaseFont,
    resetFont,
    highContrast,
    setHighContrast,
    translateRoleShort,
  } = useI18n();

  const content = PORTAL_CONTENT[lang] ?? PORTAL_CONTENT.en;
  const s = content.settings;

  const [section, setSection] = useState<SettingsSection>('general');

  // Language panel state
  const [selectedLang, setSelectedLang] = useState<TribalLanguageCode>(lang);

  // Change password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPwFields, setShowPwFields] = useState(false);

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const menuItems: Array<{ id: SettingsSection; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: s.menu.general, icon: <Globe className="w-4 h-4 shrink-0" /> },
    { id: 'password', label: s.menu.password, icon: <KeyRound className="w-4 h-4 shrink-0" /> },
    { id: 'faceLock', label: s.menu.faceLock, icon: <ScanFace className="w-4 h-4 shrink-0" /> },
    { id: 'accessibility', label: s.menu.accessibility, icon: <Sliders className="w-4 h-4 shrink-0" /> },
    { id: 'session', label: s.menu.session, icon: <LogOut className="w-4 h-4 shrink-0" /> },
    { id: 'demoRole', label: s.menu.demoRole, icon: <ShieldCheck className="w-4 h-4 shrink-0" /> },
  ];

  const handleSaveLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      setLang(selectedLang);
      const res = await api.updateUserPreferences(role, { preferredLanguage: selectedLang });
      onUserUpdated(res.user);
      setFeedback({ type: 'success', text: PORTAL_CONTENT[selectedLang].settings.savedSuccess });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save language preference.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (newPw !== confirmPw) {
      setFeedback({ type: 'error', text: content.login.passwordMismatchError });
      return;
    }
    setBusy(true);
    try {
      const res = await api.changePassword(role, currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setFeedback({ type: 'success', text: res.message });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update password.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleEnrollFace = async (descriptor: number[]) => {
    setFeedback(null);
    setBusy(true);
    try {
      const res = await api.enrollFaceLock(role, descriptor);
      onUserUpdated(res.user);
      setFeedback({ type: 'success', text: s.savedSuccess });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Face Lock enrollment failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDisableFace = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      const res = await api.disableFaceLock(role);
      onUserUpdated(res.user);
      setFeedback({ type: 'success', text: s.savedSuccess });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to disable Face Lock.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleHighContrast = async () => {
    const nextVal = !highContrast;
    setFeedback(null);
    setHighContrast(nextVal);
    setBusy(true);
    try {
      const res = await api.updateUserPreferences(role, { highContrast: nextVal });
      onUserUpdated(res.user);
      setFeedback({ type: 'success', text: s.savedSuccess });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save accessibility setting.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#222B33]">{s.title}</h1>
        <div className="text-xs text-[#222B33]/75 mt-1 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onGoHome}
            className="text-[#0B5D1E] hover:underline font-medium cursor-pointer"
          >
            {s.breadcrumbHome}
          </button>
          <span aria-hidden="true">›</span>
          <span>{s.breadcrumbSettings}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 bg-white border border-[#DCE1E6] rounded-[4px] overflow-hidden gov-card">
          <nav aria-label={s.title} className="divide-y divide-[#DCE1E6]">
            {menuItems.map((item) => {
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setSection(item.id);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2.5 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#EEF5EE] font-bold text-[#0B5D1E]'
                      : 'bg-white text-[#1F2933]/85 hover:bg-[#F7F8F9]'
                  }`}
                >
                  <span className={isActive ? 'text-[#0B5D1E]' : 'text-[#1F2933]/70'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="lg:col-span-9 space-y-5">
          {feedback && (
            <div
              role="status"
              className={`px-4 py-3 rounded-[4px] border text-sm flex items-center gap-2 ${
                feedback.type === 'error'
                  ? 'bg-[#FDF2F2] border-[#B3261E] text-[#B3261E]'
                  : 'bg-[#F1F9F1] border-[#138808] text-[#0B5D1E]'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {section === 'general' && (
            <section className="bg-white border border-[#DCE1E6] rounded-[4px] p-6 space-y-4 gov-card">
              <h2 className="text-lg font-bold text-[#222B33]">{s.generalHeading}</h2>
              <form onSubmit={handleSaveLanguage} className="space-y-4 max-w-lg">
                <div>
                  <label
                    htmlFor="settings-language-select"
                    className="block text-sm font-semibold text-[#222B33] mb-1.5"
                  >
                    {s.portalLangLabel}
                  </label>
                  <select
                    id="settings-language-select"
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value as TribalLanguageCode)}
                    className="w-full text-sm font-semibold border border-[#222B33]/40 rounded-[4px] px-3 py-2.5 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  >
                    {TRIBAL_LANGUAGES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.nativeLabel} ({item.label})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[#222B33]/75 mt-1.5">{s.langSavedToAccountNote}</p>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-2 text-sm font-bold bg-[#0B5D1E] hover:bg-[#094a17] disabled:opacity-50 text-white rounded-[4px] cursor-pointer"
                >
                  {s.saveLangBtn}
                </button>
              </form>
            </section>
          )}

          {section === 'password' && (
            <section className="bg-white border border-[#DCE1E6] rounded-[4px] p-6 space-y-4 gov-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[#222B33]">{s.changePasswordHeading}</h2>
                <button
                  type="button"
                  onClick={() => setShowPwFields((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-[#E6E2D8] rounded-[4px] text-[#222B33] hover:bg-[#FAF8F3] cursor-pointer"
                >
                  {showPwFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>
                    {showPwFields ? content.login.hidePasswordBtn : content.login.showPasswordBtn}
                  </span>
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3.5 max-w-lg">
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {s.currentPasswordLabel}
                  </label>
                  <input
                    type={showPwFields ? 'text' : 'password'}
                    required
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {s.newPasswordLabel}
                  </label>
                  <input
                    type={showPwFields ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {s.confirmPasswordLabel}
                  </label>
                  <input
                    type={showPwFields ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2.5 text-sm font-bold bg-[#0B5D1E] hover:bg-[#094a17] disabled:opacity-50 text-white rounded-[4px] cursor-pointer"
                >
                  {s.updatePasswordBtn}
                </button>
              </form>
            </section>
          )}

          {section === 'faceLock' && (
            <section className="bg-white border border-[#DCE1E6] rounded-[4px] p-6 space-y-4 gov-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[#1F2933]">{s.faceLockHeading}</h2>
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span>{s.faceStatusLabel}</span>
                  {currentUser.faceLockEnabled ? (
                    <span className="inline-flex items-center gap-1.5 text-[#0B5D1E] font-bold">
                      <CheckCircle2 className="w-4 h-4 text-[#138808]" />
                      <span>{s.faceStatusSet}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#B26A00] font-bold">
                      <AlertTriangle className="w-4 h-4 text-[#B26A00]" />
                      <span>{s.faceStatusNotSet}</span>
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-[#222B33]/85">{s.faceDesc}</p>

              <FaceCapturePanel
                actionLabel={s.enableFaceBtn}
                busy={busy}
                onCapture={(res) => handleEnrollFace(res.descriptor)}
              />

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-[#E6E2D8]">
                <button
                  type="button"
                  disabled={busy || !currentUser.faceLockEnabled}
                  onClick={handleDisableFace}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-[#222B33]/40 text-[#B3261E] bg-white hover:bg-[#FDF2F2] disabled:opacity-40 rounded-[4px] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{s.disableFaceBtn}</span>
                </button>
              </div>
            </section>
          )}

          {section === 'accessibility' && (
            <section className="bg-white border border-[#DCE1E6] rounded-[4px] p-6 space-y-5 gov-card">
              <h2 className="text-lg font-bold text-[#222B33]">{s.accessibilityHeading}</h2>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-[#222B33]">{s.textSizeLabel}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={decreaseFont}
                    disabled={fontScale <= 87.5}
                    className="px-4 py-2 text-sm font-bold border border-[#222B33]/40 bg-white hover:bg-[#FAF8F3] disabled:opacity-40 rounded-[4px] cursor-pointer"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={resetFont}
                    className={`px-4 py-2 text-sm font-bold border rounded-[4px] cursor-pointer ${
                      fontScale === 100
                        ? 'bg-[#222B33] border-[#222B33] text-white'
                        : 'bg-white border-[#222B33]/40 text-[#222B33]'
                    }`}
                  >
                    A (100%)
                  </button>
                  <button
                    type="button"
                    onClick={increaseFont}
                    disabled={fontScale >= 125}
                    className="px-4 py-2 text-sm font-bold border border-[#222B33]/40 bg-white hover:bg-[#FAF8F3] disabled:opacity-40 rounded-[4px] cursor-pointer"
                  >
                    A+
                  </button>
                  <span className="ml-2 font-mono text-xs text-[#222B33]/75">{fontScale}%</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E6E2D8] space-y-2">
                <div className="text-sm font-semibold text-[#222B33]">{s.highContrastLabel}</div>
                <p className="text-xs text-[#222B33]/80">{s.highContrastDesc}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleToggleHighContrast}
                  className={`px-5 py-2 text-sm font-bold rounded-[4px] border cursor-pointer ${
                    highContrast
                      ? 'bg-[#222B33] border-[#222B33] text-white'
                      : 'bg-white border-[#0B5D1E] text-[#0B5D1E] hover:bg-[#FAF8F3]'
                  }`}
                >
                  {highContrast ? s.disableContrastBtn : s.enableContrastBtn}
                </button>
              </div>
            </section>
          )}

          {section === 'session' && (
            <section className="bg-white border border-[#DCE1E6] rounded-[4px] p-6 space-y-4 gov-card">
              <h2 className="text-lg font-bold text-[#222B33]">{s.sessionHeading}</h2>
              <div className="bg-[#FAF8F3] border border-[#E6E2D8] rounded-[4px] p-4 text-sm space-y-1">
                <div className="text-xs font-semibold text-[#222B33]/70">{s.signedInAsLabel}</div>
                <div className="font-bold text-[#222B33]">
                  {currentUser.displayName} ({currentUser.username})
                </div>
                <div className="text-xs text-[#222B33]/80 font-mono">
                  {translateRoleShort(role)} · {currentUser.email || '—'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onLogout(false)}
                  className="px-5 py-2.5 text-sm font-bold bg-[#B3261E] hover:bg-[#911e17] text-white rounded-[4px] inline-flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{s.logoutBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onLogout(true)}
                  className="px-5 py-2.5 text-sm font-bold border border-[#B3261E] text-[#B3261E] bg-white hover:bg-[#FDF2F2] rounded-[4px] cursor-pointer"
                >
                  {s.logoutDeviceBtn}
                </button>
              </div>
            </section>
          )}

          {section === 'demoRole' && (
            <section className="bg-white border border-[#DCE1E6] rounded-[4px] p-6 space-y-4 gov-card">
              <h2 className="text-lg font-bold text-[#222B33]">{s.demoRoleHeading}</h2>
              <p className="text-sm text-[#222B33]/85">{s.demoRoleBanner}</p>
              <div className="max-w-md">
                <label
                  htmlFor="settings-demo-role"
                  className="block text-sm font-semibold text-[#222B33] mb-1.5"
                >
                  {s.demoRoleSelectLabel}
                </label>
                <select
                  id="settings-demo-role"
                  value={role}
                  onChange={(e) => {
                    onRoleChange(e.target.value as UserRole);
                    setFeedback({ type: 'success', text: s.savedSuccess });
                  }}
                  className="w-full text-sm font-semibold border border-[#222B33]/40 rounded-[4px] px-3 py-2.5 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                >
                  {(Object.keys(DEMO_ROLES) as UserRole[]).map((rKey) => (
                    <option key={rKey} value={rKey}>
                      {translateRoleShort(rKey)}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}

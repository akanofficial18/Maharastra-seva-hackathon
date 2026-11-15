import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  ScanFace,
  UserPlus,
} from 'lucide-react';
import labPhotoImg from '../assets/images/division_microbiology_lab_1794750571817.jpg';
import { api } from '../lib/api.ts';
import { useI18n } from '../lib/i18n.tsx';
import { DEMO_ROLES } from '../lib/permissions.ts';
import { PORTAL_CONTENT } from '../lib/portalContent.ts';
import type { AuthSessionResponse, UserRole } from '../types/hvisa.ts';
import { FaceCapturePanel } from './FaceCapturePanel.tsx';

type AuthScreenMode = 'login' | 'register' | 'forgot';
type LoginMethod = 'password' | 'face';

interface LoginViewProps {
  onAuthenticated: (session: AuthSessionResponse) => void;
  initialScreen?: AuthScreenMode;
  pendingScreenLabel?: string | null;
  onBackToHome: () => void;
}

export function LoginView({
  onAuthenticated,
  initialScreen = 'login',
  pendingScreenLabel = null,
  onBackToHome,
}: LoginViewProps) {
  const { lang, translateRoleShort } = useI18n();
  const content = PORTAL_CONTENT[lang] ?? PORTAL_CONTENT.en;
  const l = content.login;

  const [screen, setScreen] = useState<AuthScreenMode>(initialScreen);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');

  // Shared / Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [faceFailCount, setFaceFailCount] = useState(0);

  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('LAB_ANALYST');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Forgot password state
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [resendCount, setResendCount] = useState(0);

  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{
    type: 'error' | 'success' | 'info';
    text: string;
  } | null>(null);
  const [imgError, setImgError] = useState(false);

  const clearFeedback = () => setBanner(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!username.trim() || !password) {
      setBanner({ type: 'error', text: `${l.usernameLabel} & ${l.passwordLabel}` });
      return;
    }
    setBusy(true);
    try {
      const session = await api.loginWithPassword(username.trim(), password);
      onAuthenticated(session);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Login failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFaceLoginScan = async (descriptor: number[]) => {
    clearFeedback();
    setBusy(true);
    try {
      const session = await api.loginWithFace(
        descriptor,
        username.trim() ? username.trim() : undefined
      );
      setFaceFailCount(0);
      onAuthenticated(session);
    } catch (err) {
      const errData = (err as Error & { data?: { code?: string } })?.data;
      const msg = err instanceof Error ? err.message : 'Face verification failed.';

      // Flow B: If Face Lock not set up for this user -> friendly message + switch back to Password
      if (errData?.code === 'FACE_NOT_ENROLLED') {
        setLoginMethod('password');
        setBanner({ type: 'info', text: msg });
        return;
      }

      const nextFails = faceFailCount + 1;
      setFaceFailCount(nextFails);
      if (nextFails >= 3) {
        setLoginMethod('password');
        setFaceFailCount(0);
        setBanner({
          type: 'error',
          text: `${msg} (3 attempts reached. Please sign in with Password.)`,
        });
      } else {
        setBanner({ type: 'error', text: `${msg} (${nextFails}/3)` });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (regPassword !== regConfirmPassword) {
      setBanner({ type: 'error', text: l.passwordMismatchError });
      return;
    }
    setBusy(true);
    try {
      await api.registerUser({
        username: regUsername.trim(),
        displayName: regDisplayName.trim(),
        email: regEmail.trim(),
        role: regRole,
        password: regPassword,
        preferredLanguage: lang,
      });
      // Flow A: Account created -> go to Login (Password)
      setUsername(regUsername.trim());
      setPassword('');
      setRegPassword('');
      setRegConfirmPassword('');
      setLoginMethod('password');
      setScreen('login');
      setBanner({ type: 'success', text: l.accountCreatedSuccess });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Registration failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (isResend = false) => {
    clearFeedback();
    if (!forgotUsername.trim() || !forgotEmail.trim()) {
      setBanner({ type: 'error', text: l.forgotStep1Desc });
      return;
    }
    setBusy(true);
    try {
      const res = await api.requestPasswordResetOtp(forgotUsername.trim(), forgotEmail.trim());
      setOtpSent(true);
      setDemoOtp(res.demoOtp ?? null);
      if (typeof res.resendCount === 'number') {
        setResendCount(res.resendCount);
      } else if (isResend) {
        setResendCount((prev) => prev + 1);
      }
      setBanner({ type: 'info', text: res.message });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not send OTP.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (forgotNewPassword !== forgotConfirmPassword) {
      setBanner({ type: 'error', text: l.passwordMismatchError });
      return;
    }
    setBusy(true);
    try {
      const res = await api.resetPasswordWithOtp({
        username: forgotUsername.trim(),
        email: forgotEmail.trim(),
        otp: otpInput.trim(),
        newPassword: forgotNewPassword,
      });
      // Flow B: Success -> return to Login (Password)
      setUsername(forgotUsername.trim());
      setPassword('');
      setOtpSent(false);
      setDemoOtp(null);
      setOtpInput('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setResendCount(0);
      setLoginMethod('password');
      setScreen('login');
      setBanner({ type: 'success', text: res.message });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not reset password.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1160px] mx-auto space-y-5">
      {pendingScreenLabel && (
        <div className="bg-[#FDF8EE] border border-[#E5D5B5] rounded-[4px] px-4 py-3 text-sm text-[#1F2933] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#B26A00] shrink-0" />
          <span>
            {l.loginHeading} ({pendingScreenLabel})
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <aside className="lg:col-span-5 bg-white border border-[#DCE1E6] rounded-[4px] p-6 flex flex-col justify-between gap-5 gov-card">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1F2933]">{l.whyLoginTitle}</h2>
            <ul className="space-y-2.5 text-sm sm:text-base text-[#1F2933]/85 list-disc pl-5 leading-relaxed">
              {l.whyLoginBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            {screen !== 'register' && (
              <div className="pt-2 text-sm text-[#1F2933]">
                {l.noAccountPrompt}{' '}
                <button
                  type="button"
                  onClick={() => {
                    clearFeedback();
                    setScreen('register');
                  }}
                  className="font-bold text-[#0B5D1E] hover:underline cursor-pointer"
                >
                  {l.registerHereLink}
                </button>
              </div>
            )}
          </div>

          <figure className="border border-[#DCE1E6] rounded-[4px] overflow-hidden bg-[#F7F8F9]">
            {!imgError ? (
              <img
                src={labPhotoImg}
                alt={l.imageAlt}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-[#1F2933]/75 px-4 text-center">
                {l.imageCaption}
              </div>
            )}
            <figcaption className="bg-[#1F2933] text-white px-3 py-2 text-xs">
              {l.imageCaption}
            </figcaption>
          </figure>
        </aside>

        <section className="lg:col-span-7 bg-white border border-[#DCE1E6] rounded-[4px] p-6 space-y-5 gov-card">
          {banner && (
            <div
              role="alert"
              className={`px-4 py-3 rounded-[4px] border text-sm flex items-start gap-2 ${
                banner.type === 'error'
                  ? 'bg-[#FDF2F2] border-[#B3261E] text-[#B3261E]'
                  : banner.type === 'success'
                  ? 'bg-[#F1F9F1] border-[#138808] text-[#0B5D1E]'
                  : 'bg-[#FFF9ED] border-[#FF9933] text-[#222B33]'
              }`}
            >
              {banner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{banner.text}</span>
            </div>
          )}

          {screen === 'login' && (
            <div className="space-y-5">
              <h1 className="text-2xl font-bold text-[#222B33]">{l.loginHeading}</h1>

              <div>
                <label
                  htmlFor="login-username"
                  className="block text-sm font-semibold text-[#222B33] mb-1.5"
                >
                  {l.usernameLabel}
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={l.usernamePlaceholder}
                  className="w-full text-base border border-[#222B33]/40 rounded-[4px] px-3.5 py-2.5 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                />
              </div>

              {/* 2-Option Method Selector */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-[#222B33]">{l.chooseMethodLabel}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={l.chooseMethodLabel}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={loginMethod === 'password'}
                    onClick={() => {
                      clearFeedback();
                      setLoginMethod('password');
                    }}
                    className={`px-4 py-2.5 rounded-[4px] border text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      loginMethod === 'password'
                        ? 'bg-[#0B5D1E] border-[#0B5D1E] text-white'
                        : 'bg-white border-[#DCE1E6] text-[#1F2933] hover:bg-[#F7F8F9]'
                    }`}
                  >
                    <KeyRound className="w-4 h-4 shrink-0" />
                    <span>{l.passwordMethodLabel}</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={loginMethod === 'face'}
                    onClick={() => {
                      clearFeedback();
                      setFaceFailCount(0);
                      setLoginMethod('face');
                    }}
                    className={`px-4 py-2.5 rounded-[4px] border text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      loginMethod === 'face'
                        ? 'bg-[#0B5D1E] border-[#0B5D1E] text-white'
                        : 'bg-white border-[#DCE1E6] text-[#1F2933] hover:bg-[#F7F8F9]'
                    }`}
                  >
                    <ScanFace className="w-4 h-4 shrink-0" />
                    <span>{l.faceMethodLabel}</span>
                  </button>
                </div>
              </div>

              {/* Visible Method A: Password ONLY */}
              {loginMethod === 'password' ? (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password"
                        className="block text-sm font-semibold text-[#222B33]"
                      >
                        {l.passwordLabel}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          clearFeedback();
                          setForgotUsername(username.trim());
                          setScreen('forgot');
                        }}
                        className="text-xs font-bold text-[#0B5D1E] hover:underline cursor-pointer"
                      >
                        {l.forgotPasswordLink}
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-base border border-[#222B33]/40 rounded-[4px] pl-3.5 pr-24 py-2.5 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 px-2.5 py-1 text-xs font-semibold text-[#222B33] hover:bg-[#FAF8F3] border border-[#E6E2D8] rounded-[4px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        {showPassword ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>{l.hidePasswordBtn}</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>{l.showPasswordBtn}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3 text-base font-bold bg-[#0B5D1E] hover:bg-[#094a17] disabled:opacity-50 text-white rounded-[4px] inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{busy ? l.loggingInBtn : l.loginSubmitBtn}</span>
                  </button>
                </form>
              ) : (
                /* Visible Method B: Face Lock ONLY */
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-[#222B33] flex items-center gap-2">
                      <ScanFace className="w-4 h-4 text-[#0B5D1E]" />
                      <span>{l.scanFaceHeading}</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        clearFeedback();
                        setLoginMethod('password');
                      }}
                      className="text-xs font-bold text-[#0B5D1E] hover:underline cursor-pointer"
                    >
                      {l.usePasswordInstead}
                    </button>
                  </div>
                  <p className="text-xs text-[#222B33]/80">{l.scanFaceHint}</p>
                  <FaceCapturePanel
                    actionLabel={l.scanFaceBtn}
                    busy={busy}
                    onCapture={(res) => handleFaceLoginScan(res.descriptor)}
                  />
                </div>
              )}

              <div className="pt-2 border-t border-[#E6E2D8] flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <span className="text-[#222B33]/80">{l.newUserPrompt} </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearFeedback();
                      setScreen('register');
                    }}
                    className="font-bold text-[#0B5D1E] hover:underline cursor-pointer"
                  >
                    {l.registerLink}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="inline-flex items-center gap-1 font-bold text-[#0B5D1E] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{l.backToHomeLink}</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: REGISTER */}
          {screen === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-[#222B33]">{l.registerHeading}</h1>
                <button
                  type="button"
                  onClick={() => {
                    clearFeedback();
                    setScreen('login');
                  }}
                  className="text-xs font-bold text-[#0B5D1E] hover:underline cursor-pointer"
                >
                  {l.alreadyHaveAccount}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {l.usernameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="analyst02"
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {l.displayNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    placeholder="Dr. Meera Deshmukh"
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {l.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@lab-demo.org"
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {l.roleLabel}
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  >
                    {(Object.keys(DEMO_ROLES) as UserRole[]).map((rKey) => (
                      <option key={rKey} value={rKey}>
                        {translateRoleShort(rKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {l.passwordLabel}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {l.confirmPasswordLabel}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
              </div>
              <div className="text-xs text-[#222B33]/75">{l.passwordRuleHint}</div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="inline-flex items-center gap-1 text-sm font-bold text-[#0B5D1E] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{l.backToHomeLink}</span>
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-2.5 text-sm font-bold bg-[#138808] hover:bg-[#0B5D1E] disabled:opacity-50 text-white rounded-[4px] inline-flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{busy ? l.creatingAccountBtn : l.createAccountBtn}</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD (OTP + DEMO Box) */}
          {screen === 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-[#222B33]">{l.forgotHeading}</h1>
                <button
                  type="button"
                  onClick={() => {
                    clearFeedback();
                    setOtpSent(false);
                    setDemoOtp(null);
                    setScreen('login');
                  }}
                  className="text-xs font-bold text-[#0B5D1E] hover:underline cursor-pointer"
                >
                  {l.backToLoginLink}
                </button>
              </div>

              <p className="text-sm text-[#222B33]/85">{l.forgotStep1Desc}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {l.usernameLabel}
                  </label>
                  <input
                    type="text"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder={l.usernamePlaceholder}
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#222B33] mb-1">
                    {l.registeredEmailLabel}
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="analyst@hvisa-demo.org"
                    className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                  />
                </div>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSendOtp(false)}
                  className="px-5 py-2.5 text-sm font-bold bg-[#0B5D1E] hover:bg-[#094a17] disabled:opacity-50 text-white rounded-[4px] inline-flex items-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{busy ? l.sendingOtpBtn : l.sendOtpBtn}</span>
                </button>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-2 border-t border-[#E6E2D8]">
                  {demoOtp && (
                    <div className="bg-[#FFF9ED] border-2 border-[#FF9933] rounded-[4px] p-4 space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wide text-[#B26A00]">
                        {l.demoOtpBoxLabel}
                      </div>
                      <div className="text-2xl font-mono font-bold tracking-[0.25em] text-[#222B33]">
                        {demoOtp}
                      </div>
                      <div className="text-xs text-[#222B33]/80">{l.demoOtpValidNote}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-[#222B33] mb-1">
                        {l.otpInputLabel}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="000000"
                        className="w-full font-mono text-base tracking-widest border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        disabled={busy || resendCount >= 3}
                        onClick={() => handleSendOtp(true)}
                        className="w-full px-3 py-2.5 text-xs font-bold border border-[#0B5D1E] text-[#0B5D1E] bg-white hover:bg-[#FAF8F3] disabled:opacity-40 rounded-[4px] cursor-pointer"
                      >
                        {l.resendOtpBtn} ({resendCount}/3)
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-[#222B33]/75">{l.resendLimitNote}</div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-sm font-semibold text-[#222B33] mb-1">
                        {l.newPasswordLabel}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#222B33] mb-1">
                        {l.confirmNewPasswordLabel}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        className="w-full text-sm border border-[#222B33]/40 rounded-[4px] px-3 py-2 bg-white text-[#222B33] focus:outline-2 focus:outline-[#FF9933]"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-[#222B33]/75">{l.passwordRuleHint}</div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 text-sm font-bold bg-[#0B5D1E] hover:bg-[#094a17] disabled:opacity-50 text-white rounded-[4px] cursor-pointer"
                  >
                    {l.resetPasswordBtn}
                  </button>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

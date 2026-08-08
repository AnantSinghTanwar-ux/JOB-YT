'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { ROUTES, APP_NAME } from '@/constants';
import { AuthTokens, AuthUser } from '@/types';
import { FaArrowRight, FaEnvelopeCircleCheck } from 'react-icons/fa6';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth.store';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { GitHubLoginButton } from '@/components/auth/GitHubLoginButton';
import { LinkedInLoginButton } from '@/components/auth/LinkedInLoginButton';
import { PasswordInput } from '@/components/PasswordInput';

const weakPasswords = new Set([
  '123456',
  '12345678',
  '123456789',
  'password',
  'password123',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'welcome123',
  'letmein123',
]);

const validatePassword = (value: string, email?: string): string | null => {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter';
  if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter';
  if (!/[0-9]/.test(value)) return 'Password must include at least one number';
  
  const lowerPassword = value.toLowerCase();
  if (weakPasswords.has(lowerPassword)) return 'Password is too weak. Please choose a stronger password';
  
  const commonPatterns = ['abc123', '123abc', 'qwerty', 'asdfgh'];
  if (commonPatterns.some(pattern => lowerPassword.includes(pattern))) {
    return 'Password contains a common easily guessable pattern';
  }

  if (email) {
    const prefix = email.split('@')[0];
    if (prefix.length >= 4 && lowerPassword.includes(prefix.toLowerCase())) {
      return 'Password cannot contain your email or username';
    }
  }

  return null;
};

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const isEmployerSignup = pathname.includes('employer-signup');
  const roleFromRoute = isEmployerSignup ? 'recruiter' : 'applicant';
  const loginBaseRoute = isEmployerSignup ? ROUTES.employerLogin : ROUTES.login;
  const loginRoute = redirectTarget 
    ? `${loginBaseRoute}?redirect=${encodeURIComponent(redirectTarget)}` 
    : loginBaseRoute;

  // DEBUG: Log the pathname and role detection
  console.log('[RegisterPage] pathname:', pathname, 'isEmployerSignup:', isEmployerSignup, 'roleFromRoute:', roleFromRoute);
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({ email: '', password: '', referralCode: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(true);

  type RegisterResponse = {
    id: string;
    email: string;
    role: 'applicant' | 'recruiter' | 'admin';
    emailVerificationRequired?: boolean;
  };

  const routeByRole = (user: AuthUser) =>
    user.role === 'recruiter'
      ? ROUTES.recruiterDashboard
      : user.role === 'admin'
        ? ROUTES.adminDashboard
        : ROUTES.dashboard;

  const handleAuthSuccess = (tokens: AuthTokens, user: AuthUser) => {
    setSession(tokens.accessToken, tokens.refreshToken, user);
    if (!user.email) {
      router.push(ROUTES.addEmail);
      return;
    }
    router.push(redirectTarget || routeByRole(user));
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const passwordError = validatePassword(form.password, form.email);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setIsLoading(true);
    try {
      // Need to extract the payload from the wrapper since API returns { success, message, data }
      const response = await api.post<any>('/auth/register', {
        ...form,
        role: roleFromRoute,
      });

      const verificationRequired = response.data?.data?.emailVerificationRequired ?? response.data?.emailVerificationRequired ?? true;
      if (verificationRequired) {
        router.push(`/verify-email?pending=1&email=${encodeURIComponent(form.email)}`);
      } else {
        router.push(loginRoute);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const RightVisualSection = () => (
    <div className="hidden lg:block lg:w-1/2 relative overflow-hidden h-full bg-black">
      <Image
        src="/jobyt-hero.png"
        alt="Jobyt — Your career in the spotlight"
        fill
        className="object-cover object-center"
        unoptimized
        priority
      />

      {/* ── HIRAV CARD ── adjust top/bottom/left/right/rotate below */}
      <div
        className="absolute z-10"
        style={{
          top:    '12%',    /* move up/down  */
          bottom: 'auto',   /* set % or px to pin from bottom instead */
          left:   '6%',     /* move left/right from left edge */
          right:  'auto',   /* set % or px to pin from right edge instead */
          rotate: '-6deg',  /* tilt angle, negative = counter-clockwise */
        }}
      >
        <div className="flex items-center gap-3 bg-white rounded-full pl-1 pr-5 py-1 shadow-xl">
          <Image src="/hirav.jpg" alt="Hirav" width={44} height={44} className="w-11 h-11 rounded-full object-cover shrink-0" unoptimized />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Hired Recently</p>
            <p className="text-sm font-bold text-slate-900 leading-tight">Hirav Kadikar</p>
            <p className="text-xs text-slate-500 font-medium">SDE Intern at Google</p>
          </div>
        </div>
      </div>

      {/* ── ANKUSH CARD ── adjust top/bottom/left/right/rotate below */}
      <div
        className="absolute z-10"
        style={{
          top:    'calc(30% - 4px)',  /* move up/down  */
          bottom: 'auto',             /* set % or px to pin from bottom instead */
          left:   '70%',              /* move left/right from left edge */
          right:  'auto',             /* set % or px to pin from right edge instead */
          rotate: '-9deg',             /* tilt angle */
        }}
      >
        <div className="flex items-center gap-3 bg-white rounded-full pl-1 pr-5 py-1 shadow-xl">
          <Image src="/ankush.jpg" alt="Ankush" width={44} height={44} className="w-11 h-11 rounded-full object-cover shrink-0" unoptimized />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Hired Recently</p>
            <p className="text-sm font-bold text-slate-900 leading-tight">Ankush Wadehra</p>
            <p className="text-xs text-slate-500 font-medium">Product Intern at Microsoft</p>
          </div>
        </div>
      </div>

      {/* ── VIVAN CARD ── adjust top/bottom/left/right/rotate below */}
      <div
        className="absolute z-10"
        style={{
          top:    'calc(35% - 8px)',  /* move up/down  */
          bottom: 'auto',             /* set % or px to pin from bottom instead */
          left:   '10%',               /* move left/right from left edge */
          right:  'auto',             /* set % or px to pin from right edge instead */
          rotate: '6deg',             /* tilt angle */
        }}
      >
        <div className="flex items-center gap-3 bg-white rounded-full pl-1 pr-5 py-1 shadow-xl">
          <Image src="/viavan.jpg" alt="Vivan" width={44} height={44} className="w-11 h-11 rounded-full object-cover shrink-0" unoptimized />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Hired Recently</p>
            <p className="text-sm font-bold text-slate-900 leading-tight">Vivan Sanghvi</p>
            <p className="text-xs text-slate-500 font-medium">Backend Intern at Amazon</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen lg:h-screen bg-[#fcfcfc] flex flex-col lg:flex-row lg:overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-6 md:p-8 z-10 py-8 lg:py-0 lg:overflow-y-auto h-full">
          <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden text-center my-auto">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary to-brand-coral" />
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaEnvelopeCircleCheck className="text-4xl text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
              {requiresEmailVerification ? 'Check your email' : 'Account created'}
            </h2>
            {requiresEmailVerification ? (
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                We&apos;ve sent a secure verification link to <strong className="text-slate-800">{form.email}</strong>. Click it to activate your account.
              </p>
            ) : (
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                Your account has been created and email is already verified. Please sign in to continue.
              </p>
            )}
            <button
              onClick={() => router.push(loginRoute)}
              className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 font-bold text-base hover:bg-slate-800 transition-all shadow-md group flex items-center justify-center gap-2"
            >
              Back to sign in <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
        <RightVisualSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-[#fcfcfc] flex flex-col lg:flex-row lg:overflow-hidden">
      {/* Left Form Section */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 z-10 py-8 lg:py-0 lg:overflow-y-auto h-full">
        <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden my-auto">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary to-brand-coral" />

          <div className="mb-6 text-center">
            <Link href={ROUTES.home} className="inline-flex items-center gap-2 mb-3">
              <Image src="/logo.png" alt="Jobyt" width={26} height={26} className="object-contain" unoptimized />
              <span className="text-2xl md:text-3xl font-extrabold tracking-tight pt-[5px]">
                Joby<span className="text-brand-primary">t</span>
              </span>
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Create an account</h1>
            <p className="text-slate-500 mt-1.5 font-medium text-sm">Join {APP_NAME} today. 50 free credits on sign-up!</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <Link
              href={ROUTES.userSignup}
              className={`text-center rounded-xl px-3 py-2 text-xs font-semibold border transition-colors ${
                !isEmployerSignup
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              User Sign Up
            </Link>
            <Link
              href={ROUTES.employerSignup}
              className={`text-center rounded-xl px-3 py-2 text-xs font-semibold border transition-colors ${
                isEmployerSignup
                  ? 'border-lime-400 bg-lime-300 text-slate-900'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              Employer Sign Up
            </Link>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50/80 border border-red-100 p-3 text-sm text-red-600 font-medium flex items-start gap-3">
              <span className="text-lg leading-none">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                placeholder="you@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1">Password</label>
              <PasswordInput
                value={form.password}
                onChange={set('password')}
                required
                placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/40 cursor-pointer"
              />
              <span className="relative translate-y-[1px] inline-block group-hover:text-slate-900 transition-colors">Remember me</span>
            </label>


            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1 text-slate-500">Referral Code (optional)</label>
              <input
                type="text"
                value={form.referralCode}
                onChange={set('referralCode')}
                placeholder="e.g. A3F9C2"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || oauthPending}
              className="w-full mt-2 bg-slate-900 text-brand-primary rounded-xl px-4 py-4 font-bold text-base hover:bg-slate-800 transition-all shadow-[0_8px_20px_rgba(15,23,42,0.25)] hover:shadow-[0_12px_25px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:transform-none flex items-center justify-center gap-2 group"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
              {!isLoading && <FaArrowRight className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          {oauthPending && (
            <div className="mt-5 mb-4 rounded-xl border border-lime-200 bg-lime-50 px-3 py-2 text-xs font-semibold text-lime-800 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-lime-700 border-t-transparent animate-spin" />
              Creating your profile, please wait...
            </div>
          )}

          <div className="relative flex items-center py-1 my-5">
            <div className="flex-1 border-t border-slate-200" />
            <span className="shrink-0 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white">
              Or continue with social
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GoogleLoginButton
              referralCode={form.referralCode}
              role={roleFromRoute}
              disabled={oauthPending}
              onStart={() => setOauthPending(true)}
              onComplete={() => setOauthPending(false)}
              onSuccess={handleAuthSuccess}
              onRequiresEmail={() => router.push(ROUTES.addEmail)}
              onRequiresVerification={() => router.push(`${ROUTES.verifyEmail}?pending=1`)}
              onError={setError}
              redirectTarget={redirectTarget}
            />
            <GitHubLoginButton
              referralCode={form.referralCode}
              role={roleFromRoute}
              disabled={oauthPending}
              onStart={() => setOauthPending(true)}
              onComplete={() => setOauthPending(false)}
              onError={setError}
              redirectTarget={redirectTarget}
            />
            <LinkedInLoginButton
              referralCode={form.referralCode}
              role={roleFromRoute}
              disabled={oauthPending}
              onStart={() => setOauthPending(true)}
              onComplete={() => setOauthPending(false)}
              onError={setError}
              redirectTarget={redirectTarget}
              className="sm:col-span-2 flex items-center justify-center gap-2 bg-[#0a66c2] border border-[#0a66c2] text-white px-4 py-2 rounded-xl hover:bg-[#08549d] transition-all font-semibold shadow-sm text-sm"
            />
          </div>

          <p className="mt-5 text-center text-[13px] font-medium text-slate-500">
            Already have an account?{' '}
            <Link href={loginRoute} className="font-semibold text-brand-blue underline underline-offset-2 hover:text-blue-700 transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      <RightVisualSection />
    </div>
  );
}

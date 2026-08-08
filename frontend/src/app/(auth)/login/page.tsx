'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/constants';
import { ApiError } from '@/lib/api';
import { FaArrowRight } from 'react-icons/fa6';
import Image from 'next/image';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { GitHubLoginButton } from '@/components/auth/GitHubLoginButton';
import { LinkedInLoginButton } from '@/components/auth/LinkedInLoginButton';
import { PasswordInput } from '@/components/PasswordInput';
import { AuthTokens, AuthUser } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const isEmployerLogin = pathname.includes('employer-login');
  const roleFromRoute = isEmployerLogin ? 'recruiter' : 'applicant';
  const signupBaseRoute = isEmployerLogin ? ROUTES.employerSignup : ROUTES.userSignup;
  const signupRoute = redirectTarget 
    ? `${signupBaseRoute}?redirect=${encodeURIComponent(redirectTarget)}` 
    : signupBaseRoute;
  const login = useAuthStore((s) => s.login);
  const setSession = useAuthStore((s) => s.setSession);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [oauthPending, setOauthPending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      router.push(redirectTarget || routeByRole(user));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#fcfcfc] flex flex-col lg:flex-row lg:overflow-hidden">
      {/* Left Form Section */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 z-10 py-8 lg:py-0 lg:overflow-y-auto h-full">
        <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden my-auto">
          {/* Subtle top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary to-brand-coral" />

          <div className="mb-8 text-center">
            <Link href={ROUTES.home} className="inline-flex items-center gap-2 mb-4">
              <Image src="/logo.png" alt="Jobyt" width={28} height={28} className="object-contain" unoptimized />
              <span className="text-3xl font-extrabold tracking-tight pt-[5px]">
                Joby<span className="text-brand-primary">t</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 mt-2 font-medium">Log in to your account to continue</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <Link
              href={ROUTES.login}
              className={`text-center rounded-xl px-3 py-2 text-xs font-semibold border transition-colors ${
                !isEmployerLogin
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              User Login
            </Link>
            <Link
              href={ROUTES.employerLogin}
              className={`text-center rounded-xl px-3 py-2 text-xs font-semibold border transition-colors ${
                isEmployerLogin
                  ? 'border-lime-400 bg-lime-300 text-slate-900'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              Employer Login
            </Link>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50/80 border border-red-100 p-3 text-sm text-red-600 font-medium flex items-start gap-3">
              <span className="text-lg leading-none">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1">Password</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-brand-primary focus:ring-2 focus:ring-brand-primary/30 cursor-pointer"
                />
                <span className="relative translate-y-[1px] inline-block group-hover:text-slate-900 transition-colors">Remember me</span>
              </label>
              <Link href={ROUTES.forgotPassword} className="text-[13px] font-bold text-brand-blue hover:text-blue-700 transition-colors relative translate-y-[1px]">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading || oauthPending}
              className="w-full bg-slate-900 text-brand-primary rounded-xl px-4 py-4 font-bold text-base hover:bg-slate-800 transition-all shadow-[0_8px_20px_rgba(15,23,42,0.25)] hover:shadow-[0_12px_25px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:transform-none flex items-center justify-center gap-2 group"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <FaArrowRight className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          {oauthPending && (
            <div className="mt-6 mb-4 rounded-xl border border-lime-200 bg-lime-50 px-3 py-2 text-xs font-semibold text-lime-800 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-lime-700 border-t-transparent animate-spin" />
              Signing you in, please wait...
            </div>
          )}

          <div className="relative flex items-center py-1 my-5">
            <div className="flex-1 border-t border-slate-200" />
            <span className="shrink-0 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white">
              Or continue with social
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GoogleLoginButton
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
              role={roleFromRoute}
              disabled={oauthPending}
              onStart={() => setOauthPending(true)}
              onComplete={() => setOauthPending(false)}
              onError={setError}
              redirectTarget={redirectTarget}
            />
            <div className="sm:col-span-2">
              <LinkedInLoginButton
                role={roleFromRoute}
                disabled={oauthPending}
                onStart={() => setOauthPending(true)}
                onComplete={() => setOauthPending(false)}
                onError={setError}
                redirectTarget={redirectTarget}
              />
            </div>
          </div>

          <p className="mt-5 text-center text-[13px] font-medium text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href={signupRoute} className="font-semibold text-brand-blue underline underline-offset-2 hover:text-blue-700 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right Visual Section (Hidden on Mobile) */}
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
    </div>
  );
}

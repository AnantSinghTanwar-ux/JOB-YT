'use client';

export function DesktopOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="hidden lg:block">{children}</div>
      <div className="lg:hidden flex items-center justify-center min-h-[60vh] p-8 text-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Desktop Required</h2>
          <p className="text-slate-600">The coding IDE works best on desktop. Please open this page on a larger screen.</p>
        </div>
      </div>
    </>
  );
}

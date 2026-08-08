import Link from 'next/link';
import { DocsSidebar } from '@/components/docs/DocsSidebar';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
          <Link href="/docs" className="font-display text-xl font-bold text-slate-900 tracking-tight">
            Jobyt <span className="text-lime-500">API</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/docs" className="text-slate-500 hover:text-slate-900 transition-colors">Docs</Link>
            <Link href="/docs/api-reference" className="text-slate-500 hover:text-slate-900 transition-colors">API Reference</Link>
            <Link href="/" className="text-slate-400 hover:text-slate-700 transition-colors">← Back to Jobyt</Link>
          </div>
        </div>
      </header>
      <div className="max-w-[90rem] mx-auto px-6 py-8 flex gap-8">
        <DocsSidebar />
        <main className="flex-1 min-w-0 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}

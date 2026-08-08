'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const sidebarItems = [
  {
    label: 'Overview',
    href: '/docs',
    items: [] as { label: string; href: string }[],
  },
  {
    label: 'Getting Started',
    href: '/docs/getting-started',
    items: [] as { label: string; href: string }[],
  },
  {
    label: 'API Reference',
    href: '/docs/api-reference',
    items: [
      { label: 'Authentication', href: '/docs/api-reference/authentication' },
      { label: 'Jobs', href: '/docs/api-reference/jobs' },
      { label: 'Applications', href: '/docs/api-reference/applications' },
      { label: 'Webhooks', href: '/docs/api-reference/webhooks' },
      { label: 'API Keys', href: '/docs/api-reference/api-keys' },
      { label: 'Calendar', href: '/docs/api-reference/calendar' },
    ],
  },
  {
    label: 'Webhooks Guide',
    href: '/docs/webhooks',
    items: [] as { label: string; href: string }[],
  },
  {
    label: 'SDK Examples',
    href: '/docs/sdks',
    items: [] as { label: string; href: string }[],
  },
  {
    label: 'Tutorials',
    href: '/docs/tutorials',
    items: [] as { label: string; href: string }[],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 hidden lg:block">
      <nav className="sticky top-8 space-y-1">
        {sidebarItems.map((section) => (
          <div key={section.href}>
            <Link
              href={section.href}
              className={cn(
                'block px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname === section.href
                  ? 'text-lime-700 bg-lime-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
              )}
            >
              {section.label}
            </Link>
            {section.items.length > 0 && (pathname.startsWith(section.href) || pathname === section.href) && (
              <div className="ml-3 mt-1 space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'block px-3 py-1 rounded-lg text-xs transition-colors',
                      pathname === item.href
                        ? 'text-lime-600 bg-lime-50 font-medium'
                        : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

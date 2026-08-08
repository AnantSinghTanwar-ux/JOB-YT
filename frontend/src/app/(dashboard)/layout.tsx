'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [searchActive, setSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchSubmit = (query: string) => {
        router.push(`/dashboard?keyword=${encodeURIComponent(query)}`);
        setSearchActive(false);
        setSearchQuery('');
    };

    return (
        <AuthGuard allowedRoles={['applicant']}>
            <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-[#f9fbf4] to-[#eef7d8]">
                <DashboardHeader
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchActive={searchActive}
                    onSearchToggle={setSearchActive}
                    onSearchSubmit={handleSearchSubmit}
                />

                <DashboardSidebar />

                {/* Main content area — offset for floating sidebar on desktop, bottom bar on mobile */}
                <main className="pt-28 sm:pt-24 lg:pt-24 lg:pl-24 xl:pl-28 pb-24 lg:pb-8 px-4 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}

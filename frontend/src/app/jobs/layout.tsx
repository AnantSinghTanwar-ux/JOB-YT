'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Navbar, Footer } from '@/components/landing';

export default function JobsLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user } = useAuthStore();
    const router = useRouter();
    const [searchActive, setSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchSubmit = (query: string) => {
        router.push(`/jobs?keyword=${encodeURIComponent(query)}`);
        setSearchActive(false);
        setSearchQuery('');
    };

    // If authenticated as applicant, show dashboard layout (header + sidebar)
    if (isAuthenticated && user?.role === 'applicant') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-[#f9fbf4] to-[#eef7d8]">
                <DashboardHeader
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchActive={searchActive}
                    onSearchToggle={setSearchActive}
                    onSearchSubmit={handleSearchSubmit}
                />
                <DashboardSidebar />
                <main className="pt-28 sm:pt-24 lg:pt-24 lg:pl-24 xl:pl-28 pb-24 lg:pb-8 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-[1600px] mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        );
    }

    // Otherwise show landing page layout (Navbar + Footer)
    return (
        <div className="min-h-screen flex flex-col bg-[#fcfcfc]">
            <Navbar />
            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-28 pb-20">
                {children}
            </main>
            <Footer />
        </div>
    );
}

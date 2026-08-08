'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoadmapApi, RoadmapMetadata, PaginatedRoadmaps } from '@/lib/api/roadmaps.api';
import { ROUTES } from '@/constants';
import { FaMapLocationDot, FaArrowRight, FaClockRotateLeft } from 'react-icons/fa6';
import { toast } from 'react-hot-toast';

export default function RoadmapsPage() {
  const [data, setData] = useState<PaginatedRoadmaps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await RoadmapApi.list(1, 100); // Load up to 100 for now
        setData(result);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to load roadmaps';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Developer Roadmaps</h1>
        <p className="text-slate-500">
          Step-by-step guides and paths to learn different tools, technologies, and roles.
        </p>
      </div>

      {!data || data.data.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
          <FaMapLocationDot className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No Roadmaps Found</h3>
          <p className="text-slate-500 mt-2">
            The roadmap ingestion pipeline hasn&apos;t run yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.data.map((roadmap) => (
            <Link
              key={roadmap.id}
              href={ROUTES.roadmapDetail(roadmap.slug)}
              className="group flex flex-col bg-white border border-slate-200 rounded-2xl p-5 hover:border-brand-primary/50 hover:shadow-lg hover:shadow-brand-primary/5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <div className="mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-brand-primary/10 group-hover:text-brand-primary group-hover:border-brand-primary/20 transition-all text-slate-400">
                  <FaMapLocationDot size={20} />
                </div>
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-brand-primary transition-colors line-clamp-1">
                  {roadmap.title}
                </h3>
              </div>
              
              <p className="text-sm text-slate-500 line-clamp-2 flex-grow mb-6">
                {roadmap.description || `Comprehensive learning path for ${roadmap.title}`}
              </p>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <span className="bg-slate-100 px-2 py-1 rounded-md">
                    {roadmap.node_count} topics
                  </span>
                </div>
                <div className="flex items-center text-sm font-semibold text-slate-400 group-hover:text-brand-primary transition-colors">
                  View Path
                  <FaArrowRight className="ml-1.5 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

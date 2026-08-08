'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { isSpazorlabsCompany } from '@/lib/companyFlags';
import { SelectionProbabilityBadge } from '@/components/jobs/SelectionProbability';

export interface BackendJob {
    id: string;
    title: string;
    companyName?: string | null;
    company_logo?: string | null;
    location: string | null;
    type: 'full-time' | 'part-time' | 'contract' | 'remote' | 'internship';
    salary_min: number | null;
    salary_max: number | null;
    skills: string[];
    status: string;
    is_boosted: boolean;
    created_at: string;
    /** Selection Probability: 0–100 (present only for authenticated applicants) */
    selectionProbability?: number;
    has_ai_interview?: boolean;
}

type JobLike = Partial<BackendJob> & { _id?: string };

// Normalize job data to ensure it has an id field and uses companyName
export function normalizeJob(job: JobLike): BackendJob {
    const rawName = (
        job.companyName ||
        (job as any).company_name ||
        (job as any).company?.name ||
        (job as any).recruiter?.companyName ||
        ''
    ).toString().trim();
    const companyLogo = job.company_logo ?? null;

    return {
        id: job.id || job._id || '',
        title: job.title || '',
        companyName: rawName || null,
        company_logo: companyLogo,
        location: job.location ?? null,
        type: job.type || 'full-time',
        salary_min: job.salary_min ?? null,
        salary_max: job.salary_max ?? null,
        skills: job.skills || [],
        status: job.status || 'active',
        is_boosted: job.is_boosted || false,
        created_at: job.created_at || new Date().toISOString(),
        selectionProbability: (job as any).selectionProbability ?? undefined,
        has_ai_interview: (job as any).has_ai_interview || false,
    };
}

import { formatSalaryRange } from '@/lib/salary';

export function getBadgeText(job: BackendJob): string | null {
    if (job.is_boosted) return 'Actively Hiring';
    switch (job.type) {
        case 'internship': return 'Internship';
        case 'remote': return 'Remote';
        case 'contract': return 'Contract';
        default: return null;
    }
}

export function getJobTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('-', '-');
}

export const AVATAR_COLORS = [
    '#5B6AF0', '#1D9E75', '#E05C3A', '#9B59B6',
    '#E67E22', '#2980B9', '#16A085', '#C0392B',
];
export function avatarColor(name: string): string {
    return AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
}
export function avatarInitials(name: string): string {
    return (name || '?')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

const CARD_W = 303;
export const BASE_CARD_H = 266;
export const FOOTER_H = 88;
export const TOP_CONTENT_H = 96;
export const TAGS_PAD_TOP = 14;
export const TAGS_PAD_BOT = 16;
const WHITE_LEFT = 6;
const TAGS_AREA_W = 262;
const TAGS_GAP = 6;
const PLUS_PILL_W = 26;

const BEIGE_PATH_BASE = `M205.108 0C215.406 0 223.754 8.34817 223.754 18.6462V60.5999C223.754 70.8979 232.102 79.2461 242.4 79.2461H284.354C294.652 79.2461 303 87.5943 303 97.8923V247.062C303 257.36 294.652 265.708 284.354 265.708H18.6462C8.34817 265.708 0 257.36 0 247.062V18.6462C0 8.34817 8.34817 0 18.6462 0H205.108Z`;
const WHITE_PATH_BASE = `M211.302 58.6204C211.302 68.9184 219.65 77.2666 229.948 77.2666H271.301C281.599 77.2666 289.947 85.6148 289.947 95.9128V157.56C289.947 167.858 281.599 176.206 271.301 176.206H18.6462C8.34816 176.206 0 167.858 0 157.56V18.6461C0 8.34816 8.34817 0 18.6462 0H192.656C202.954 0 211.302 8.34817 211.302 18.6462V58.6204Z`;

const BEIGE_BASE_H = 266;
const WHITE_BASE_H = 177;

export function estimateTagPillWidth(tag: string): number {
    const textWidth = Math.ceil(tag.length * 6.4);
    return Math.max(48, textWidth + 28);
}

export function getTwoRowVisibleTags(tags: string[]): { visibleTags: string[]; remainingTagsCount: number } {
    const visibleTags: string[] = [];
    let row = 1;
    let rowUsedWidth = 0;
    let i = 0;
    while (i < tags.length) {
        const tagWidth = estimateTagPillWidth(tags[i]);
        const remainingAfterThis = tags.length - (i + 1);
        const reservePlus = remainingAfterThis > 0 ? TAGS_GAP + PLUS_PILL_W : 0;
        const nextUsedWidth = rowUsedWidth === 0
            ? tagWidth
            : rowUsedWidth + TAGS_GAP + tagWidth;

        if (nextUsedWidth + reservePlus <= TAGS_AREA_W) {
            visibleTags.push(tags[i]);
            rowUsedWidth = nextUsedWidth;
            i += 1;
            continue;
        }
        if (row < 2) {
            row += 1;
            rowUsedWidth = 0;
            continue;
        }
        break;
    }
    return { visibleTags, remainingTagsCount: tags.length - visibleTags.length };
}

export function buildBeigePath(h: number): string {
    if (h === BEIGE_BASE_H) return BEIGE_PATH_BASE;
    const r = 18.6462;
    return [
        `M205.108 0`,
        `C215.406 0 223.754 8.34817 223.754 ${r}`,
        `V60.5999`,
        `C223.754 70.8979 232.102 79.2461 242.4 79.2461`,
        `H284.354`,
        `C294.652 79.2461 303 87.5943 303 97.8923`,
        `V${h - r}`,
        `C303 ${h - 8.34817} 294.652 ${h} 284.354 ${h}`,
        `H${r}`,
        `C8.34817 ${h} 0 ${h - 8.34817} 0 ${h - r}`,
        `V${r}`,
        `C0 8.34817 8.34817 0 ${r} 0`,
        `H205.108Z`,
    ].join(' ');
}

export function buildWhitePath(h: number): string {
    const r = 18.646;
    return [
        `M18.6462 0`,
        `H192.656`,
        `C202.954 0 211.302 8.34817 211.302 18.6462`,
        `V58.6204`,
        `C211.302 68.9184 219.65 77.2666 229.948 77.2666`,
        `H271.301`,
        `C281.599 77.2666 289.947 85.6148 289.947 95.9128`,
        `V${h - r}`,
        `C289.947 ${h - 8.34817} 281.599 ${h} 271.301 ${h}`,
        `H${r}`,
        `C8.34817 ${h} 0 ${h - 8.34817} 0 ${h - r}`,
        `V${r}`,
        `C0 8.34817 8.34817 0 ${r} 0`,
        `Z`,
    ].join(' ');
}

export function JobCard({
    job,
    index,
    cardH,
    onTagsHeight,
}: {
    job: BackendJob;
    index: number;
    cardH: number;
    onTagsHeight: (h: number) => void;
}) {
    const tagsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!tagsRef.current) return;
        const measure = () => onTagsHeight(tagsRef.current?.offsetHeight ?? 0);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(tagsRef.current);
        return () => ro.disconnect();
    }, [onTagsHeight]);

    const isRemote = job.type === 'remote' || (job.location?.toLowerCase().includes('remote') ?? false);
    const badgeText = getBadgeText(job);
    const isVerifiedCompany = isSpazorlabsCompany(job.companyName);
    const name = job.companyName || job.title;
    const companyLogo = resolveAssetUrl(job.company_logo || null);
    const salaryLabel = formatSalaryRange(job.salary_min, job.salary_max, job.type);
    const locationLabel = job.location || 'Remote';

    const tags = [
        getJobTypeLabel(job.type),
        isRemote ? 'Remote' : 'On site',
        ...job.skills.slice(0, 4),
    ];
    const { visibleTags, remainingTagsCount } = getTwoRowVisibleTags(tags);

    const whiteH = cardH - FOOTER_H;
    const beigePath = buildBeigePath(cardH);
    const whitePath = buildWhitePath(whiteH);
    const tagsTop = TOP_CONTENT_H + TAGS_PAD_TOP;

    return (
        <div
            className="justify-self-center hover:-translate-y-1 transition-transform duration-300"
            style={{
                position: 'relative',
                width: CARD_W,
                height: cardH,
                animation: `fadeInUp 0.5s ease-out ${(index % 4) * 0.08}s both`,
            }}
        >
            <svg
                width={CARD_W} height={cardH}
                viewBox={`0 0 ${CARD_W} ${cardH}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', left: 0, top: 0, zIndex: 1 }}
                className="drop-shadow-sm"
            >
                <path d={beigePath} fill="#F4F1EA" />
            </svg>

            <Link
                href={`/jobs/${job.id}`}
                aria-label={`Open ${job.title}`}
                style={{
                    position: 'absolute',
                    left: 233, top: 4,
                    width: 60, height: 60,
                    background: '#0B0B0B',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10, flexShrink: 0,
                }}
            >
                <svg
                    width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="white"
                    strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
                >
                    <line x1="6" y1="18" x2="18" y2="6" />
                    <polyline points="6 6 18 6 18 18" />
                </svg>
            </Link>

            <svg
                width={290} height={whiteH}
                viewBox={`0 0 290 ${whiteH}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', left: WHITE_LEFT, top: 6, zIndex: 4 }}
            >
                <path d={whitePath} fill="white" />
            </svg>

            <div
                style={{
                    position: 'absolute', left: 16, top: 14,
                    width: 192, zIndex: 6,
                    display: 'flex', alignItems: 'flex-start', gap: 11,
                }}
            >
                <div
                    style={{
                        width: 42, height: 42, borderRadius: 50,
                        background: avatarColor(name),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, overflow: 'hidden',
                    }}
                >
                    {companyLogo ? (
                        <img
                            src={companyLogo}
                            alt={`${name} logo`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                            {avatarInitials(name)}
                        </span>
                    )}
                </div>

                <div style={{ flex: 1, paddingTop: 1 }}>
                    <h3
                        style={{
                            fontSize: 14, fontWeight: 800, color: '#0B0B0B',
                            lineHeight: 1.15, letterSpacing: -0.3, marginBottom: 5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}
                    >
                        {job.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        {job.companyName && (
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#444' }}>
                                {job.companyName}
                            </span>
                        )}
                        {isVerifiedCompany && (
                            <span
                                style={{
                                    background: '#D9FBE6', color: '#0E6B3A',
                                    fontSize: 8, fontWeight: 700,
                                    padding: '3px 6px', letterSpacing: '0.07em',
                                    textTransform: 'uppercase', lineHeight: 1.3,
                                    borderRadius: 2, whiteSpace: 'nowrap',
                                }}
                            >
                                Verified
                            </span>
                        )}
                        {badgeText && (
                            <span
                                style={{
                                    background: '#A6EBF8', color: '#0a4050',
                                    fontSize: 8, fontWeight: 700,
                                    padding: '3px 6px', letterSpacing: '0.07em',
                                    textTransform: 'uppercase', lineHeight: 1.3,
                                    borderRadius: 2, whiteSpace: 'nowrap',
                                }}
                            >
                                {badgeText}
                            </span>
                        )}
                        {job.has_ai_interview && (
                            <span
                                style={{
                                    background: '#F3E8FF', color: '#6B21A8',
                                    fontSize: 8, fontWeight: 700,
                                    padding: '3px 6px', letterSpacing: '0.07em',
                                    textTransform: 'uppercase', lineHeight: 1.3,
                                    borderRadius: 2, whiteSpace: 'nowrap',
                                    display: 'flex', alignItems: 'center', gap: '3px'
                                }}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                                </svg>
                                AI Interview
                            </span>
                        )}
                    </div>
                    {/* Selection Probability badge — only shown to authenticated applicants */}
                    {job.selectionProbability !== undefined && (
                        <div style={{ marginTop: 5 }}>
                            <SelectionProbabilityBadge score={job.selectionProbability} />
                        </div>
                    )}
                </div>
            </div>

            <div
                ref={tagsRef}
                style={{
                    position: 'absolute',
                    left: 16, top: tagsTop,
                    width: TAGS_AREA_W, zIndex: 6,
                    display: 'flex', flexWrap: 'wrap', gap: TAGS_GAP,
                }}
            >
                {visibleTags.map((tag, tagIndex) => (
                    <span
                        key={`${tag}-${tagIndex}`}
                        style={{
                            border: '1.4px solid #C0BAB0',
                            borderRadius: 100,
                            padding: '5px 13px',
                            fontSize: 11, fontWeight: 500,
                            color: '#222', lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {tag}
                    </span>
                ))}
                {remainingTagsCount > 0 && (
                    <span
                        style={{
                            border: '1.4px solid #C0BAB0',
                            borderRadius: 100,
                            width: 26,
                            height: 26,
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#222',
                            lineHeight: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        +{remainingTagsCount}
                    </span>
                )}
            </div>

            <div
                style={{
                    position: 'absolute',
                    left: 0, bottom: -10,
                    width: CARD_W, height: FOOTER_H,
                    zIndex: 6,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 20px 14px 20px',
                }}
            >
                <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#0B0B0B', letterSpacing: -0.8, lineHeight: 1 }}>
                            {salaryLabel}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                        <svg width="10" height="12" viewBox="0 0 10 12" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M5 0C2.24 0 0 2.24 0 5C0 8.75 5 12 5 12C5 12 10 8.75 10 5C10 2.24 7.76 0 5 0ZM5 6.5C4.17 6.5 3.5 5.83 3.5 5C3.5 4.17 4.17 3.5 5 3.5C5.83 3.5 6.5 4.17 6.5 5C6.5 5.83 5.83 6.5 5 6.5Z" fill="#888" />
                        </svg>
                        <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{locationLabel}</span>
                    </div>
                </div>

                <Link
                    href={`/jobs/${job.id}`}
                    style={{
                        background: '#0B0B0B', color: '#ffffff',
                        fontSize: 16, fontWeight: 700,
                        padding: '14px 30px', borderRadius: 100,
                        border: 'none', cursor: 'pointer',
                        letterSpacing: '0.01em', lineHeight: 1,
                        whiteSpace: 'nowrap', textDecoration: 'none',
                        display: 'inline-block',
                    }}
                >
                    Apply
                </Link>
            </div>
        </div>
    );
}

export function SkeletonCard({ index }: { index: number }) {
    return (
        <div
            className="justify-self-center"
            style={{ position: 'relative', width: CARD_W, height: BASE_CARD_H }}
        >
            <svg width={CARD_W} height={BASE_CARD_H} viewBox={`0 0 303 266`} fill="none"
                style={{ position: 'absolute', left: 0, top: 0, zIndex: 1 }}>
                <path d={BEIGE_PATH_BASE} fill="#F4F1EA" />
            </svg>

            <div className="animate-pulse" style={{
                position: 'absolute', left: 233, top: 4,
                width: 60, height: 60, background: '#D8D4CD',
                borderRadius: '50%', zIndex: 10,
            }} />

            <svg width={290} height={WHITE_BASE_H} viewBox={`0 0 290 177`} fill="none"
                style={{ position: 'absolute', left: WHITE_LEFT, top: 0, zIndex: 4 }}>
                <path d={WHITE_PATH_BASE} fill="white" />
            </svg>

            <div className="animate-pulse" style={{
                position: 'absolute', left: 16, top: 14,
                width: 42, height: 42, background: '#E8E4DC', borderRadius: 12, zIndex: 6,
            }} />

            <div style={{ position: 'absolute', left: 69, top: 16, width: 130, zIndex: 6 }}>
                <div className="animate-pulse" style={{ height: 16, background: '#E8E4DC', borderRadius: 4, marginBottom: 8 }} />
                <div className="animate-pulse" style={{ height: 12, background: '#EDE9E2', borderRadius: 4, width: '70%' }} />
            </div>

            <div style={{ position: 'absolute', left: 16, top: 110, zIndex: 6, display: 'flex', gap: 7 }}>
                {[60, 52, 68, 48].map((w, i) => (
                    <div key={i} className="animate-pulse"
                        style={{ height: 26, width: w, background: '#EDE9E2', borderRadius: 100 }} />
                ))}
            </div>

            <div style={{
                position: 'absolute', left: 20, bottom: 14, width: 263, zIndex: 6,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            }}>
                <div>
                    <div className="animate-pulse" style={{ height: 28, width: 80, background: '#D8D4CD', borderRadius: 4, marginBottom: 6 }} />
                    <div className="animate-pulse" style={{ height: 12, width: 100, background: '#E8E4DC', borderRadius: 4 }} />
                </div>
                <div className="animate-pulse" style={{ height: 48, width: 100, background: '#D8D4CD', borderRadius: 100 }} />
            </div>
        </div>
    );
}

export function JobCardGrid({ jobs, gridClass }: { jobs: BackendJob[], gridClass?: string }) {
    const [tagsHeights, setTagsHeights] = useState<Record<string, number>>({});
    const handleTagsHeight = useCallback((id: string, h: number) => {
        setTagsHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
    }, []);

    const uniformCardH = Math.max(
        BASE_CARD_H,
        ...Object.values(tagsHeights).map(
            (h) => TOP_CONTENT_H + TAGS_PAD_TOP + h + TAGS_PAD_BOT + FOOTER_H
        )
    );

    return (
        <div className={`mx-auto grid w-fit gap-5 lg:gap-6 ${gridClass || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {jobs.map((job, i) => (
                <JobCard
                    key={job.id}
                    job={job}
                    index={i}
                    cardH={uniformCardH}
                    onTagsHeight={(h) => handleTagsHeight(job.id, h)}
                />
            ))}
        </div>
    );
}

export function SkeletonGrid({ count = 8, gridClass }: { count?: number, gridClass?: string }) {
    return (
        <div className={`mx-auto grid w-fit gap-5 lg:gap-6 ${gridClass || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} index={i} />
            ))}
        </div>
    );
}

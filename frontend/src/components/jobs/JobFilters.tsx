'use client';

import { useState, useEffect } from 'react';
import { FaFilter, FaChevronDown, FaXmark } from 'react-icons/fa6';

interface Filters {
    keyword?: string;
    location?: string;
    wfh?: boolean;
    partTime?: boolean;
    salary_min?: number;
    type?: string;
}

interface JobFiltersProps {
    onApply: (filters: Filters) => void;
    initialKeyword?: string;
    initialType?: string;
}

export const JobFilters = ({ onApply, initialKeyword = '', initialType = '' }: JobFiltersProps) => {
    const [filters, setFilters] = useState<Filters>({
        keyword: initialKeyword || undefined,
        type: initialType || undefined,
        wfh: false,
        partTime: false,
        salary_min: 0,
    });
    const [preferencesChecked, setPreferencesChecked] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [locationInput, setLocationInput] = useState('');

    const set = (key: keyof Filters, value: any) =>
        setFilters((f) => ({ ...f, [key]: value }));

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            onApply(filters);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [filters, onApply]);

    const clearAll = () => {
        setFilters({ keyword: undefined, location: undefined, wfh: false, partTime: false, salary_min: 0, type: undefined });
        setPreferencesChecked(false);
        setLocationInput('');
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm font-sans w-full max-w-[320px]">
            <div className="p-4 flex items-center justify-center gap-2 text-[#008bdc]">
                <FaFilter className="text-xl" />
                <h3 className="font-semibold text-lg text-slate-800">Filters</h3>
            </div>
            
            <div className="px-5 pb-5 flex flex-col gap-5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-[#008bdc] focus:ring-[#008bdc]"
                        checked={preferencesChecked}
                        onChange={(e) => setPreferencesChecked(e.target.checked)}
                    />
                    <span>As per my <span className="text-[#008bdc]">preferences</span></span>
                </label>

                <div>
                    <label className="block text-[15px] font-medium text-slate-700 mb-1.5">Profile</label>
                    <input
                        type="text"
                        placeholder="e.g. Marketing"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-[#008bdc] focus:outline-none focus:ring-1 focus:ring-[#008bdc]"
                        value={filters.keyword || ''}
                        onChange={(e) => set('keyword', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-[15px] font-medium text-slate-700 mb-1.5">Location</label>
                    <div className="w-full rounded border border-slate-300 px-2 py-1.5 min-h-[38px] flex flex-wrap gap-1.5 items-center focus-within:border-[#008bdc] focus-within:ring-1 focus-within:ring-[#008bdc]">
                        {filters.location ? (
                            <div className="bg-[#008bdc] text-white text-sm px-2 py-1 rounded flex items-center gap-1.5">
                                {filters.location}
                                <FaXmark 
                                    className="cursor-pointer hover:text-slate-200" 
                                    onClick={() => set('location', undefined)}
                                />
                            </div>
                        ) : null}
                        <input
                            type="text"
                            placeholder={filters.location ? "" : "e.g. Bangalore"}
                            className="flex-1 min-w-[100px] text-sm border-none focus:ring-0 p-1 outline-none bg-transparent"
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && locationInput) {
                                    set('location', locationInput);
                                    setLocationInput('');
                                }
                            }}
                            onBlur={() => {
                                if (locationInput) {
                                    set('location', locationInput);
                                    setLocationInput('');
                                }
                            }}
                        />
                    </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 mt-1">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-[#008bdc] focus:ring-[#008bdc]"
                        checked={filters.wfh || false}
                        onChange={(e) => set('wfh', e.target.checked)}
                    />
                    <span className="text-[15px]">Include work from home also</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 mt-[-4px]">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-[#008bdc] focus:ring-[#008bdc]"
                        checked={filters.partTime || false}
                        onChange={(e) => set('partTime', e.target.checked)}
                    />
                    <span className="text-[15px]">Part-time</span>
                </label>

                <div className="mt-2">
                    <label className="block text-[15px] font-medium text-slate-700 mb-4">
                        Desired minimum monthly stipend (₹)
                    </label>
                    <div className="relative pt-1">
                        <input 
                            type="range" 
                            min="0" 
                            max="10000" 
                            step="2000"
                            value={filters.salary_min || 0}
                            onChange={(e) => set('salary_min', Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer outline-none slider-thumb-[#008bdc]"
                            style={{
                                background: `linear-gradient(to right, #008bdc 0%, #008bdc ${(filters.salary_min || 0) / 100}%, #e2e8f0 ${(filters.salary_min || 0) / 100}%, #e2e8f0 100%)`
                            }}
                        />
                        <div className="flex justify-between text-slate-500 text-sm mt-3 -mx-1">
                            <span>0</span>
                            <span>2K</span>
                            <span>4K</span>
                            <span>6K</span>
                            <span>8K</span>
                            <span>10K</span>
                        </div>
                    </div>
                </div>

                <div className="mt-2">
                    <button 
                        onClick={() => setShowMore(!showMore)}
                        className="text-[#008bdc] font-medium text-[15px] flex items-center gap-1.5 hover:underline"
                    >
                        View more filters <FaChevronDown className={`text-xs transition-transform ${showMore ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                <div className="mt-4 flex justify-end">
                    <button 
                        onClick={clearAll}
                        className="text-[#008bdc] font-medium text-[15px] hover:underline"
                    >
                        Clear all
                    </button>
                </div>
            </div>
            
            <style jsx>{`
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #fff;
                    border: 4px solid #008bdc;
                    cursor: pointer;
                }
                input[type=range]::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #fff;
                    border: 4px solid #008bdc;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

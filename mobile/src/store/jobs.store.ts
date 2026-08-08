import { create } from 'zustand';
import { jobService } from '../services/job.service';
import { Job } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface JobsState {
  jobs: Job[];
  savedJobs: Job[];
  recommendedJobs: Job[];
  currentJob: Job | null;
  loading: boolean;
  total: number;
  page: number;

  fetchJobs: (params?: any, append?: boolean) => Promise<void>;
  fetchJobDetails: (id: string) => Promise<void>;
  fetchSavedJobs: () => Promise<void>;
  toggleSaveJob: (jobId: string) => Promise<void>;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  savedJobs: [],
  recommendedJobs: [],
  currentJob: null,
  loading: false,
  total: 0,
  page: 1,

  fetchJobs: async (params = {}, append = false) => {
    set({ loading: true });
    try {
      const res = await jobService.getJobs(params) as any;
      const jobsArray = Array.isArray(res.data) ? res.data : (res.data?.jobs || []);
      const total = res.pagination?.total || res.data?.total || 0;
      const page = res.pagination?.page || res.data?.page || 1;

      const jobsWithSavedState = jobsArray.map((job: any) => ({
        ...job,
        is_saved: get().savedJobs.some((sj) => sj.id === job.id),
      }));

      // Cache it for offline access
      if (!append) {
        await AsyncStorage.setItem(
          'jobyt_cached_jobs',
          JSON.stringify({
            jobs: jobsWithSavedState,
            total,
            page,
          })
        );
      }

      set((state) => ({
        jobs: append ? [...state.jobs, ...jobsWithSavedState] : jobsWithSavedState,
        total,
        page,
      }));
    } catch (err) {
      console.error('Failed to fetch jobs, attempting to load cache', err);
      // Offline fallback
      if (!append) {
        const cached = await AsyncStorage.getItem('jobyt_cached_jobs');
        if (cached) {
          const parsed = JSON.parse(cached);
          set({
            jobs: parsed.jobs || [],
            total: parsed.total || 0,
            page: parsed.page || 1,
          });
        }
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchJobDetails: async (id) => {
    set({ loading: true, currentJob: null });
    try {
      const res = await jobService.getJobById(id);
      const job = 'job' in res.data ? res.data.job : res.data;
      
      const enrichedJob = {
        ...job,
        is_saved: get().savedJobs.some((sj) => sj.id === job.id),
      };
      
      set({ currentJob: enrichedJob });
    } catch (err) {
      console.error('Failed to fetch job details, checking local list', err);
      // Fallback: search locally cached jobs/savedJobs
      const found = get().jobs.find((j) => j.id === id) || get().savedJobs.find((sj) => sj.id === id);
      if (found) {
        set({ currentJob: found });
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchSavedJobs: async () => {
    try {
      const res = await jobService.getSavedJobs();
      const list = Array.isArray(res.data) ? res.data : (res.data as any).jobs || [];
      const mapped = list.map((job: any) => ({ ...job, is_saved: true }));

      // Cache it for offline access
      await AsyncStorage.setItem('jobyt_cached_saved_jobs', JSON.stringify(mapped));

      set({ savedJobs: mapped });
      
      set((state) => ({
        jobs: state.jobs.map((j) => ({
          ...j,
          is_saved: mapped.some((sj: any) => sj.id === j.id),
        })),
      }));
    } catch (err) {
      console.error('Failed to fetch saved jobs, attempting to load cache', err);
      // Offline fallback
      const cached = await AsyncStorage.getItem('jobyt_cached_saved_jobs');
      if (cached) {
        const parsed = JSON.parse(cached);
        set({ savedJobs: parsed });
        set((state) => ({
          jobs: state.jobs.map((j) => ({
            ...j,
            is_saved: parsed.some((sj: any) => sj.id === j.id),
          })),
        }));
      }
    }
  },

  toggleSaveJob: async (jobId) => {
    const { jobs, savedJobs } = get();
    const isCurrentlySaved = savedJobs.some((sj) => sj.id === jobId);

    // Optimistic UI updates
    let updatedJobs = jobs.map((j) => (j.id === jobId ? { ...j, is_saved: !isCurrentlySaved } : j));
    let updatedSaved: Job[];
    
    if (isCurrentlySaved) {
      updatedSaved = savedJobs.filter((sj) => sj.id !== jobId);
    } else {
      const targetJob = jobs.find((j) => j.id === jobId);
      updatedSaved = targetJob ? [...savedJobs, { ...targetJob, is_saved: true }] : savedJobs;
    }

    set({ jobs: updatedJobs, savedJobs: updatedSaved });
    if (get().currentJob?.id === jobId) {
      set((state) => ({
        currentJob: state.currentJob ? { ...state.currentJob, is_saved: !isCurrentlySaved } : null,
      }));
    }

    // Cache updated list locally as well
    await AsyncStorage.setItem('jobyt_cached_saved_jobs', JSON.stringify(updatedSaved));

    try {
      if (isCurrentlySaved) {
        await jobService.unsaveJob(jobId);
      } else {
        await jobService.saveJob(jobId);
      }
    } catch (err) {
      console.error('Failed to toggle save job on server, reverting state', err);
      // Revert state
      set({ jobs, savedJobs });
      await AsyncStorage.setItem('jobyt_cached_saved_jobs', JSON.stringify(savedJobs));
    }
  },
}));
export default useJobsStore;

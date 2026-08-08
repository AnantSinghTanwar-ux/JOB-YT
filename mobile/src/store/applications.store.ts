import { create } from 'zustand';
import { applicationService } from '../services/application.service';
import { Application } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApplicationsState {
  applications: Application[];
  stats: any;
  loading: boolean;

  fetchApplications: () => Promise<void>;
  fetchStats: () => Promise<void>;
  applyToJob: (
    jobId: string,
    payload: {
      resume_id: string;
      cover_letter?: string;
      answers?: { question_id: string; answer: string }[];
    }
  ) => Promise<Application>;
}

export const useApplicationsStore = create<ApplicationsState>((set) => ({
  applications: [],
  stats: null,
  loading: false,

  fetchApplications: async () => {
    set({ loading: true });
    try {
      const res = await applicationService.getMyApplications();
      const list = res.data || [];
      await AsyncStorage.setItem('jobyt_cached_applications', JSON.stringify(list));
      set({ applications: list });
    } catch (err) {
      console.error('Failed to fetch applications, loading offline cache', err);
      const cached = await AsyncStorage.getItem('jobyt_cached_applications');
      if (cached) {
        set({ applications: JSON.parse(cached) });
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const res = await applicationService.getApplicationStats();
      await AsyncStorage.setItem('jobyt_cached_stats', JSON.stringify(res.data));
      set({ stats: res.data });
    } catch (err) {
      console.error('Failed to fetch application stats, loading offline cache', err);
      const cached = await AsyncStorage.getItem('jobyt_cached_stats');
      if (cached) {
        set({ stats: JSON.parse(cached) });
      }
    }
  },

  applyToJob: async (jobId, payload) => {
    set({ loading: true });
    try {
      const res = await applicationService.applyToJob(jobId, payload);
      const app = res.data;
      set((state) => {
        const updated = [app, ...state.applications];
        AsyncStorage.setItem('jobyt_cached_applications', JSON.stringify(updated)).catch((err) =>
          console.error('Failed to update local applications cache', err)
        );
        return { applications: updated };
      });
      return app;
    } catch (err) {
      console.error('Failed to apply to job', err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
export default useApplicationsStore;

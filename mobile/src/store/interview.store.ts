import { create } from 'zustand';
import { interviewService } from '../services/interview.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InterviewState {
  sessions: any[];
  readinessScore: any;
  readinessHistory: any[];
  loading: boolean;

  fetchSessions: () => Promise<void>;
  fetchReadiness: () => Promise<void>;
  startInterview: (payload: { roleTitle: string; jobDescription?: string; questionCount?: number }) => Promise<any>;
  submitAnswer: (sessionId: string, questionId: string, responseText: string) => Promise<any>;
  completeInterview: (sessionId: string) => Promise<any>;
  fetchReport: (sessionId: string) => Promise<any>;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  sessions: [],
  readinessScore: null,
  readinessHistory: [],
  loading: false,

  fetchSessions: async () => {
    set({ loading: true });
    try {
      const res = await interviewService.listSessions();
      const list = res.data || [];
      await AsyncStorage.setItem('jobyt_cached_interview_sessions', JSON.stringify(list));
      set({ sessions: list });
    } catch (err) {
      console.error('Failed to fetch interview sessions, trying local cache', err);
      const cached = await AsyncStorage.getItem('jobyt_cached_interview_sessions');
      if (cached) {
        set({ sessions: JSON.parse(cached) });
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchReadiness: async () => {
    try {
      const res = await interviewService.getReadiness();
      const readiness = res.data?.readiness || null;
      const history = res.data?.history || [];
      await AsyncStorage.setItem('jobyt_cached_readiness', JSON.stringify({ readiness, history }));
      set({ readinessScore: readiness, readinessHistory: history });
    } catch (err) {
      console.error('Failed to fetch readiness score, trying local cache', err);
      const cached = await AsyncStorage.getItem('jobyt_cached_readiness');
      if (cached) {
        const parsed = JSON.parse(cached);
        set({ readinessScore: parsed.readiness, readinessHistory: parsed.history || [] });
      }
    }
  },

  startInterview: async (payload) => {
    set({ loading: true });
    try {
      const res = await interviewService.startSession(payload);
      return res.data;
    } catch (err) {
      console.error('Failed to start interview session', err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  submitAnswer: async (sessionId, questionId, responseText) => {
    set({ loading: true });
    try {
      const res = await interviewService.submitResponse(sessionId, { questionId, responseText });
      return res.data;
    } catch (err) {
      console.error('Failed to submit response', err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  completeInterview: async (sessionId) => {
    set({ loading: true });
    try {
      const res = await interviewService.completeSession(sessionId);
      return res.data;
    } catch (err) {
      console.error('Failed to complete interview session', err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchReport: async (sessionId) => {
    set({ loading: true });
    try {
      const res = await interviewService.getReport(sessionId);
      return res.data;
    } catch (err) {
      console.error('Failed to fetch report', err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
export default useInterviewStore;

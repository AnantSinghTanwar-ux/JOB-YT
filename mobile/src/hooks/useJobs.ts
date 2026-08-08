import { useJobsStore } from '../store/jobs.store';

export const useJobs = () => {
  const jobs = useJobsStore((state) => state.jobs);
  const savedJobs = useJobsStore((state) => state.savedJobs);
  const recommendedJobs = useJobsStore((state) => state.recommendedJobs);
  const currentJob = useJobsStore((state) => state.currentJob);
  const loading = useJobsStore((state) => state.loading);
  const total = useJobsStore((state) => state.total);
  const page = useJobsStore((state) => state.page);

  const fetchJobs = useJobsStore((state) => state.fetchJobs);
  const fetchJobDetails = useJobsStore((state) => state.fetchJobDetails);
  const fetchSavedJobs = useJobsStore((state) => state.fetchSavedJobs);
  const toggleSaveJob = useJobsStore((state) => state.toggleSaveJob);

  return {
    jobs,
    savedJobs,
    recommendedJobs,
    currentJob,
    loading,
    total,
    page,
    fetchJobs,
    fetchJobDetails,
    fetchSavedJobs,
    toggleSaveJob,
  };
};

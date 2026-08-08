import { useApplicationsStore } from '../store/applications.store';

export const useApplications = () => {
  const applications = useApplicationsStore((state) => state.applications);
  const stats = useApplicationsStore((state) => state.stats);
  const loading = useApplicationsStore((state) => state.loading);

  const fetchApplications = useApplicationsStore((state) => state.fetchApplications);
  const fetchStats = useApplicationsStore((state) => state.fetchStats);
  const applyToJob = useApplicationsStore((state) => state.applyToJob);

  return {
    applications,
    stats,
    loading,
    fetchApplications,
    fetchStats,
    applyToJob,
  };
};
export default useApplications;

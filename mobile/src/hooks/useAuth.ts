import { useAuthStore } from '../store/auth.store';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const preferences = useAuthStore((state) => state.preferences);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  
  const initialize = useAuthStore((state) => state.initialize);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const logout = useAuthStore((state) => state.logout);
  const updatePreferences = useAuthStore((state) => state.updatePreferences);

  return {
    user,
    preferences,
    isAuthenticated,
    isLoading,
    error,
    initialize,
    login,
    register,
    googleLogin,
    logout,
    updatePreferences,
  };
};

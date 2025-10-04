import { useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/authService';
import { Loading } from '../common';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { setUser, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const user = await authService.getProfile();
        setUser(user);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('accessToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [setUser, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-bg">
        <Loading text="Завантаження..." size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;

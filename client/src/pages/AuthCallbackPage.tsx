import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { authService } from '../services/authService';
import { Loading } from '../components/common';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login?error=auth_failed');
        return;
      }

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Зберігаємо токен
        localStorage.setItem('accessToken', token);

        // Отримуємо дані користувача
        const user = await authService.getProfile();
        setUser(user);

        // Redirect на dashboard
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to get user profile:', error);
        navigate('/login?error=auth_failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center animated-bg">
      <Loading text="Завершення авторизації..." size="lg" />
    </div>
  );
};

export default AuthCallbackPage;

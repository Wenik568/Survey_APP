import { useNavigate } from 'react-router-dom';
import Button from './Button';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/useAuthStore';

interface NavbarProps {
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
  showDashboard?: boolean;
  hideLogout?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  showBackButton = false,
  backTo,
  backLabel = 'Назад',
  showDashboard = true,
  hideLogout = false,
}) => {
  const navigate = useNavigate();
  const { logout: storeLogout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authService.logout();
      storeLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-50 border-b-2 border-primary-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Система Опитувань
              </h1>
              <p className="text-xs text-gray-500 font-medium">Збирайте відгуки легко</p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            {showBackButton && backTo && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(backTo)}
              >
                ← {backLabel}
              </Button>
            )}
            {showDashboard && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                🏠 Головна
              </Button>
            )}
            {!hideLogout && (
              <Button variant="danger" size="sm" onClick={handleLogout}>
                🚪 Вийти
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

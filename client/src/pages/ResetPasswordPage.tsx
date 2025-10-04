import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Card } from '../components/common';
import { authService } from '../services/authService';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Токен відновлення пароля не знайдено');
    }
  }, [token]);

  useEffect(() => {
    if (password) {
      checkPasswordStrength(password);
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const checkPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength <= 2) setPasswordStrength('weak');
    else if (strength <= 4) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  };

  const isLengthValid = password.length >= 6;
  const isPasswordsMatch = password && confirmPassword && password === confirmPassword;
  const isFormValid = isLengthValid && isPasswordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isFormValid) {
      setError('Будь ласка, виправте помилки у формі');
      return;
    }

    if (!token) {
      setError('Токен відновлення пароля не знайдено');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, password, confirmPassword);
      setSuccess('Пароль успішно оновлено! Переадресація на сторінку входу...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Помилка при оновленні пароля');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center animate-fade-in">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Помилка</h2>
          <p className="text-gray-600 mb-6">Токен відновлення пароля не знайдено</p>
          <Button onClick={() => navigate('/login')}>На головну</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 animate-fade-in">
        {/* Header Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
          <span className="text-4xl">🔐</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
          Створення нового пароля
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Введіть новий пароль для вашого акаунту
        </p>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-xl animate-slide-down">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl animate-shake">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔒 Новий пароль
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введіть новий пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-600 transition-colors"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Password Strength Bar */}
              {password && (
                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordStrength === 'weak'
                        ? 'w-1/3 bg-red-500'
                        : passwordStrength === 'medium'
                        ? 'w-2/3 bg-yellow-500'
                        : 'w-full bg-green-500'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔒 Підтвердження пароля
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Підтвердіть новий пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-600 transition-colors"
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-gray-300">
              <div className="font-semibold text-gray-700 mb-2 text-sm">
                Вимоги до пароля:
              </div>
              <div className="space-y-1 text-sm">
                <div
                  className={`flex items-center gap-2 ${
                    isLengthValid ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  <span>{isLengthValid ? '✓' : '○'}</span>
                  <span>Мінімум 6 символів</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    isPasswordsMatch ? 'text-green-600' : confirmPassword ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  <span>{isPasswordsMatch ? '✓' : confirmPassword ? '✗' : '○'}</span>
                  <span>Паролі співпадають</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={!isFormValid || isLoading}
            >
              ✓ Оновити пароль
            </Button>
          </form>
        )}

        {/* Back Link */}
        <button
          onClick={() => navigate('/login')}
          className="w-full mt-6 text-primary-600 hover:text-primary-700 font-medium py-3 px-4 rounded-xl hover:bg-primary-50 transition-all"
        >
          ← Повернутися до входу
        </button>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;

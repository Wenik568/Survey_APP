import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/common';
import { authService } from '../services/authService';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Будь ласка, введіть email');
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      setSuccess('Посилання для відновлення пароля надіслано на ваш email');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Помилка при відправці запиту');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 animate-fade-in">
        {/* Header Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
          <span className="text-4xl">🔑</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
          Відновлення пароля
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Введіть ваш email і ми надішлемо вам посилання для відновлення пароля
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="email"
            label="📧 Email адреса"
            placeholder="ваш@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading || !email.trim()}
          >
            ✉️ Надіслати посилання
          </Button>
        </form>

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

export default ForgotPasswordPage;

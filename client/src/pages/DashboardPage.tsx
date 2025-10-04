import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Loading, Navbar } from '../components/common';
import { useAuthStore } from '../stores/useAuthStore';
import { surveyService } from '../services/surveyService';
import type { DashboardStats } from '../types';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout: storeLogout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await surveyService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  // Пріоритет відображення: 1) name (з OAuth), 2) username, 3) частина email до @
  const displayName = user?.name || user?.username || user?.email?.split('@')[0] || 'Користувач';

  return (
    <div className="min-h-screen animated-bg">
      <Navbar showDashboard={false} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <Card className="p-8 mb-8 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-2">
            Вітаємо, <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">{displayName}</span>!
          </h2>
          <p className="text-gray-600 text-lg">
            Це ваша особиста панель керування опитуваннями
          </p>
        </Card>

        {/* Stats Section */}
        {isLoading ? (
          <Loading text="Завантаження статистики..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 text-center hover:scale-105 transition-transform">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Активні опитування
              </h3>
              <div className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                {stats?.activeSurveys || 0}
              </div>
              <p className="text-gray-500 mt-2">Опитування, які проводяться зараз</p>
            </Card>

            <Card className="p-6 text-center hover:scale-105 transition-transform">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Всього відповідей
              </h3>
              <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {stats?.totalResponses || 0}
              </div>
              <p className="text-gray-500 mt-2">Загальна кількість отриманих відповідей</p>
            </Card>

            <Card className="p-6 text-center hover:scale-105 transition-transform">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Завершені опитування
              </h3>
              <div className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                {stats?.completedSurveys || 0}
              </div>
              <p className="text-gray-500 mt-2">Опитування, які вже завершено</p>
            </Card>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-8 text-center hover" onClick={() => navigate('/surveys/create')}>
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Створити нове опитування
            </h3>
            <p className="text-gray-600 mb-4">
              Створіть нове опитування з різними типами питань
            </p>
            <Button className="w-full">Створити опитування</Button>
          </Card>

          <Card className="p-8 text-center hover" onClick={() => navigate('/surveys')}>
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Мої опитування</h3>
            <p className="text-gray-600 mb-4">
              Переглянути та керувати вашими опитуваннями
            </p>
            <Button className="w-full">Переглянути опитування</Button>
          </Card>

          <Card className="p-8 text-center hover" onClick={() => navigate('/results-list')}>
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Результати та аналітика
            </h3>
            <p className="text-gray-600 mb-4">
              Перегляд результатів та статистики відповідей
            </p>
            <Button className="w-full">Переглянути результати</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

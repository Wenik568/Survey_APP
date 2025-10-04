import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Loading, Modal, Navbar } from '../components/common';
import { surveyService } from '../services/surveyService';
import type { Survey } from '../types';

const SurveysPage = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; surveyId: string | null }>({
    isOpen: false,
    surveyId: null,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'questions'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadSurveys();
  }, []);

  // Фільтрація та сортування
  useEffect(() => {
    let result = [...surveys];

    // Пошук за назвою
    if (searchQuery.trim()) {
      result = result.filter((survey) =>
        survey.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Фільтр за статусом
    if (statusFilter !== 'all') {
      result = result.filter((survey) =>
        statusFilter === 'active' ? survey.isActive : !survey.isActive
      );
    }

    // Сортування
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, 'uk-UA');
          break;
        case 'questions':
          comparison = a.questions.length - b.questions.length;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredSurveys(result);
  }, [surveys, searchQuery, sortBy, sortOrder, statusFilter]);

  const loadSurveys = async () => {
    try {
      const data = await surveyService.getSurveys();
      setSurveys(data);
    } catch (error) {
      console.error('Failed to load surveys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (surveyId: string, currentStatus: boolean) => {
    try {
      await surveyService.toggleStatus(surveyId, !currentStatus);
      loadSurveys();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.surveyId) return;

    try {
      await surveyService.deleteSurvey(deleteModal.surveyId);
      setDeleteModal({ isOpen: false, surveyId: null });
      loadSurveys();
    } catch (error) {
      console.error('Failed to delete survey:', error);
    }
  };

  const copySurveyLink = (uniqueLink: string) => {
    const url = `${window.location.origin}/survey/${uniqueLink}`;
    navigator.clipboard.writeText(url);
    alert('Посилання скопійовано!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <Loading text="Завантаження опитувань..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg">
      <Navbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-bold text-white">Мої опитування</h2>
          <Button onClick={() => navigate('/surveys/create')}>
            ➕ Створити опитування
          </Button>
        </div>

        {/* Search and Sort Controls */}
        {surveys.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔍 Пошук за назвою
                </label>
                <input
                  type="text"
                  placeholder="Введіть назву опитування..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎯 Статус
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                >
                  <option value="all">Усі</option>
                  <option value="active">Активні</option>
                  <option value="inactive">Неактивні</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📊 Сортувати за
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'questions')}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  >
                    <option value="date">Датою</option>
                    <option value="title">Назвою</option>
                    <option value="questions">Питаннями</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all font-medium text-lg"
                    title={sortOrder === 'asc' ? 'За зростанням' : 'За спаданням'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Results count and reset */}
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Знайдено: <span className="font-semibold">{filteredSurveys.length}</span> з {surveys.length} опитувань
              </div>
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  ✕ Скинути фільтри
                </button>
              )}
            </div>
          </Card>
        )}

        {surveys.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              У вас поки немає опитувань
            </h3>
            <p className="text-gray-600 mb-6">
              Створіть своє перше опитування, щоб почати збирати відповіді
            </p>
            <Button onClick={() => navigate('/surveys/create')}>
              Створити перше опитування
            </Button>
          </Card>
        ) : filteredSurveys.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Нічого не знайдено
            </h3>
            <p className="text-gray-600 mb-6">
              Спробуйте змінити параметри пошуку
            </p>
            <Button onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
              Скинути фільтри
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredSurveys.map((survey) => (
              <Card key={survey._id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {survey.title}
                    </h3>
                    {survey.description && (
                      <p className="text-gray-600 mb-3">{survey.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📝 {survey.questions.length} питань</span>
                      <span>
                        📅 {new Date(survey.createdAt).toLocaleDateString('uk-UA')}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full font-medium ${
                          survey.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {survey.isActive ? '🟢 Активне' : '⚫ Неактивне'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    onClick={() =>
                      copySurveyLink(survey.uniqueLink)
                    }
                  >
                    🔗 Копіювати посилання
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/surveys/${survey._id}/edit`)}
                  >
                    ✏️ Редагувати
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/results?id=${survey._id}`)}
                  >
                    📊 Результати
                  </Button>

                  <Button
                    size="sm"
                    variant={survey.isActive ? 'secondary' : 'success'}
                    onClick={() =>
                      handleToggleStatus(survey._id, survey.isActive)
                    }
                  >
                    {survey.isActive ? '⏸️ Зупинити' : '▶️ Активувати'}
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      setDeleteModal({ isOpen: true, surveyId: survey._id })
                    }
                  >
                    🗑️ Видалити
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, surveyId: null })}
        title="Видалення опитування"
      >
        <p className="text-gray-700 mb-6">
          Ви впевнені, що хочете видалити це опитування? Всі відповіді будуть втрачені!
          Цю дію неможливо скасувати.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ isOpen: false, surveyId: null })}
          >
            Скасувати
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Видалити
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SurveysPage;

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Input, Card, Loading, Navbar } from '../components/common';
import AIGeneratorModal from '../components/surveys/AIGeneratorModal';
import { surveyService } from '../services/surveyService';
import type { Question, AIGeneratedSurvey } from '../types';

const EditSurveyPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showAIModal, setShowAIModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'settings'>('edit');

  const [surveyData, setSurveyData] = useState({
    title: '',
    description: '',
    allowMultipleResponses: false,
    closingDate: '',
    participantLimit: null as number | null,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);

  const questionTypeLabels = {
    text: 'Коротка текстова відповідь',
    textarea: 'Довга текстова відповідь',
    radio: 'Один варіант відповіді',
    checkbox: 'Декілька варіантів відповіді',
    rating: 'Рейтинг (1-5)',
  };

  // Завантаження даних опитування
  useEffect(() => {
    if (!id) {
      setError('Не вказано ID опитування');
      setIsLoading(false);
      return;
    }
    loadSurvey();
  }, [id]);

  const loadSurvey = async () => {
    try {
      setIsLoading(true);
      const survey = await surveyService.getSurvey(id!);

      setSurveyData({
        title: survey.title,
        description: survey.description || '',
        allowMultipleResponses: survey.allowMultipleResponses || false,
        closingDate: survey.closingDate ? new Date(survey.closingDate).toISOString().slice(0, 16) : '',
        participantLimit: survey.participantLimit || null,
      });

      // Завантажуємо співавторів
      setCollaborators((survey as any).collaborators || []);

      // Конвертуємо питання з бази у формат для редагування
      const loadedQuestions = survey.questions.map((q, index) => ({
        id: q._id || String(index + 1),
        text: q.text,
        type: q.type,
        required: q.required,
        options: Array.isArray(q.options)
          ? q.options.map((opt) => {
              if (typeof opt === 'string') return opt;
              return opt.text || opt.value || String(opt);
            })
          : [],
        skipLogic: q.skipLogic, // Зберігаємо skip logic
      }));

      setQuestions(loadedQuestions);
    } catch (err: any) {
      setError(err.message || 'Помилка завантаження опитування');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIGenerate = (aiSurvey: AIGeneratedSurvey) => {
    setSurveyData({
      title: aiSurvey.title,
      description: aiSurvey.description,
    });

    const processedQuestions = aiSurvey.questions.map((q, index) => ({
      ...q,
      id: q.id || String(index + 1),
      options: Array.isArray(q.options)
        ? q.options.map((opt) => (typeof opt === 'string' ? opt : opt.text || opt.value || String(opt)))
        : [],
    }));

    setQuestions(processedQuestions as Question[]);
    setShowAIModal(false);
  };

  const addQuestion = () => {
    const newId = (Math.max(...questions.map((q) => parseInt(q.id))) + 1).toString();
    setQuestions([
      ...questions,
      {
        id: newId,
        text: '',
        type: 'text',
        required: true,
        options: [],
      },
    ]);
  };

  const removeQuestion = (questionId: string) => {
    if (questions.length === 1) {
      setError('Опитування має містити хоча б одне питання');
      return;
    }
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  const updateQuestion = (questionId: string, field: keyof Question, value: any) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const updated = { ...q, [field]: value };
          if (field === 'type' && (value === 'radio' || value === 'checkbox')) {
            if (!updated.options || updated.options.length === 0) {
              updated.options = ['Варіант 1', 'Варіант 2'];
            }
          }
          if (field === 'type' && value !== 'radio' && value !== 'checkbox') {
            updated.options = [];
          }
          return updated;
        }
        return q;
      })
    );
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptionNum = (q.options?.length || 0) + 1;
          return {
            ...q,
            options: [...(q.options || []), `Варіант ${newOptionNum}`],
          };
        }
        return q;
      })
    );
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...(q.options || [])];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = q.options?.filter((_, i) => i !== optionIndex) || [];
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    setQuestions(newQuestions);

    // Прокрутка до нової позиції з урахуванням header
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const element = document.querySelector(`[data-question-index="${newIndex}"]`) as HTMLElement;
        if (element) {
          const headerHeight = 80; // висота header
          const elementPosition = element.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementPosition - headerHeight - 20; // 20px відступ

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  };

  const validateSurvey = (): boolean => {
    if (!surveyData.title.trim()) {
      setError('Вкажіть назву опитування');
      return false;
    }

    if (questions.length === 0) {
      setError('Додайте хоча б одне питання');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Питання ${i + 1} не може бути порожнім`);
        return false;
      }
      if ((q.type === 'radio' || q.type === 'checkbox') && (!q.options || q.options.length < 2)) {
        setError(`Питання ${i + 1}: додайте мінімум 2 варіанти відповіді`);
        return false;
      }
    }

    return true;
  };

  const handleAddCollaborator = async () => {
    if (!newCollaboratorEmail.trim()) {
      setError('Введіть email співавтора');
      return;
    }

    setIsAddingCollaborator(true);
    setError('');

    try {
      const result = await surveyService.addCollaborator(id!, newCollaboratorEmail.trim());
      setCollaborators(result.collaborators);
      setNewCollaboratorEmail('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Помилка додавання співавтора');
    } finally {
      setIsAddingCollaborator(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Видалити цього співавтора?')) {
      return;
    }

    try {
      const result = await surveyService.removeCollaborator(id!, collaboratorId);
      setCollaborators(result.collaborators);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Помилка видалення співавтора');
    }
  };

  const handleSave = async () => {
    setError('');

    if (!validateSurvey()) {
      return;
    }

    setIsSaving(true);

    try {
      const questionsWithOrder = questions.map((q, index) => {
        const baseQuestion = {
          text: q.text,
          type: q.type,
          // Перетворюємо опції в формат {text, value}
          options: (q.options || []).map((opt) => {
            if (typeof opt === 'string') {
              return { text: opt, value: opt };
            }
            return opt;
          }),
          required: q.required,
          order: index,
        };

        // Додаємо skip logic якщо є
        if (q.skipLogic && q.skipLogic.enabled && q.skipLogic.condition) {
          // Знаходимо індекс питання-джерела для передачі на сервер
          const sourceQuestionIndex = questions.findIndex(
            (question) => question.id === q.skipLogic.condition.questionId
          );

          if (sourceQuestionIndex !== -1) {
            baseQuestion.skipLogic = {
              enabled: true,
              condition: {
                // Передаємо індекс замість ID, щоб сервер міг знайти правильне питання
                questionIndex: sourceQuestionIndex,
                operator: q.skipLogic.condition.operator,
                value: q.skipLogic.condition.value
              }
            };
          }
        }

        return baseQuestion;
      });

      const surveyPayload = {
        ...surveyData,
        questions: questionsWithOrder,
      };

      await surveyService.updateSurvey(id!, surveyPayload);
      navigate('/surveys');
    } catch (err: any) {
      setError(err.message || 'Помилка збереження змін');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <Loading text="Завантаження опитування..." />
      </div>
    );
  }

  if (error && !surveyData.title) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Помилка</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/surveys')}>Повернутися до списку</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 text-center drop-shadow-lg">
            Редагування опитування
          </h1>
          <p className="text-white/90 text-center text-lg">
            Внесіть зміни у ваше опитування
          </p>
        </div>

        {error && surveyData.title && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
            {error}
          </div>
        )}

        {/* AI Generator Button */}
        <Card className="mb-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">🤖 AI Генератор</h3>
              <p className="text-gray-600">
                Перегенеруйте опитування за допомогою AI (замінить поточний вміст)
              </p>
            </div>
            <Button onClick={() => setShowAIModal(true)}>✨ Згенерувати з AI</Button>
          </div>
        </Card>

        {/* Tabs */}
        <Card className="mb-6 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'edit'
                  ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📝 Редагування опитування
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ⚙️ Налаштування
            </button>
          </div>
        </Card>

        {/* Edit Tab - Basic Info + Questions */}
        {activeTab === 'edit' && (
          <>
          {/* Basic Info Section */}
          <Card className="mb-6 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Основна інформація</h3>
            <div className="space-y-4">
              <Input
                label="Назва опитування"
                placeholder="Наприклад: Задоволеність клієнтів 2024"
                value={surveyData.title}
                onChange={(e) => setSurveyData({ ...surveyData, title: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Опис (необов'язково)
                </label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all resize-none"
                  rows={3}
                  placeholder="Короткий опис опитування..."
                  value={surveyData.description}
                  onChange={(e) => setSurveyData({ ...surveyData, description: e.target.value })}
                />
              </div>
            </div>
          </Card>

        {/* Questions Section */}
        <div className="space-y-4 mb-6">
          {questions.map((question, index) => (
            <Card key={question.id} data-question-index={index} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">Питання {index + 1}</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveQuestion(index, 'up')}
                    disabled={index === 0}
                    className="p-2 text-gray-600 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Вгору"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveQuestion(index, 'down')}
                    disabled={index === questions.length - 1}
                    className="p-2 text-gray-600 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Вниз"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeQuestion(question.id)}
                    className="p-2 text-red-600 hover:text-red-700"
                    title="Видалити"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Текст питання"
                  placeholder="Введіть ваше питання..."
                  value={question.text}
                  onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Тип питання</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                    value={question.type}
                    onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                  >
                    {Object.entries(questionTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {(question.type === 'radio' || question.type === 'checkbox') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Варіанти відповідей
                    </label>
                    <div className="space-y-2">
                      {question.options?.map((option, optIndex) => {
                        const optionValue =
                          typeof option === 'string' ? option : option?.text || option?.value || '';
                        return (
                          <div key={optIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                              value={optionValue}
                              onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                              placeholder={`Варіант ${optIndex + 1}`}
                            />
                            <button
                              onClick={() => removeOption(question.id, optIndex)}
                              className="p-2 text-red-600 hover:text-red-700"
                              title="Видалити варіант"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => addOption(question.id)}
                        className="w-full"
                      >
                        + Додати варіант
                      </Button>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => updateQuestion(question.id, 'required', e.target.checked)}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Обов'язкове питання</span>
                </label>

                {/* Skip Logic - умовна логіка */}
                {index > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={question.skipLogic?.enabled || false}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          updateQuestion(question.id, 'skipLogic', {
                            enabled,
                            condition: enabled ? {
                              questionId: questions[0].id,
                              operator: 'equals' as const,
                              value: ''
                            } : undefined
                          });
                        }}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700">⚡ Умовна логіка (Skip Logic)</span>
                    </label>

                    {question.skipLogic?.enabled && (
                      <div className="ml-8 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">Показувати це питання тільки якщо:</p>

                        {/* Вибір питання */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Питання</label>
                          <select
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
                            value={question.skipLogic.condition?.questionId || ''}
                            onChange={(e) => {
                              const prevQuestion = questions.find(q => q.id === e.target.value);
                              updateQuestion(question.id, 'skipLogic', {
                                ...question.skipLogic,
                                condition: {
                                  questionId: e.target.value,
                                  operator: question.skipLogic?.condition?.operator || 'equals',
                                  value: prevQuestion?.type === 'radio' && prevQuestion.options?.[0]
                                    ? (typeof prevQuestion.options[0] === 'string'
                                      ? prevQuestion.options[0]
                                      : prevQuestion.options[0].text)
                                    : ''
                                }
                              });
                            }}
                          >
                            {questions.slice(0, index).map((q, i) => (
                              <option key={q.id} value={q.id}>
                                Питання {i + 1}: {q.text || '(порожнє)'}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Вибір оператора */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Умова</label>
                          <select
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
                            value={question.skipLogic.condition?.operator || 'equals'}
                            onChange={(e) => updateQuestion(question.id, 'skipLogic', {
                              ...question.skipLogic,
                              condition: {
                                ...question.skipLogic?.condition!,
                                operator: e.target.value as any
                              }
                            })}
                          >
                            <option value="equals">дорівнює</option>
                            <option value="not_equals">не дорівнює</option>
                            <option value="contains">містить</option>
                            <option value="not_contains">не містить</option>
                            <option value="is_answered">відповіли (будь-яке значення)</option>
                          </select>
                        </div>

                        {/* Вибір значення */}
                        {question.skipLogic.condition?.operator !== 'is_answered' && (() => {
                          const sourceQuestion = questions.find(q => q.id === question.skipLogic?.condition?.questionId);
                          if (sourceQuestion?.type === 'radio' || sourceQuestion?.type === 'checkbox') {
                            return (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Значення</label>
                                <select
                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
                                  value={question.skipLogic.condition?.value || ''}
                                  onChange={(e) => updateQuestion(question.id, 'skipLogic', {
                                    ...question.skipLogic,
                                    condition: {
                                      ...question.skipLogic?.condition!,
                                      value: e.target.value
                                    }
                                  })}
                                >
                                  <option value="">Оберіть варіант</option>
                                  {sourceQuestion.options?.map((opt, i) => {
                                    const optValue = typeof opt === 'string' ? opt : opt.text || opt.value;
                                    return (
                                      <option key={i} value={optValue}>
                                        {optValue}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            );
                          } else if (sourceQuestion?.type === 'rating') {
                            return (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Рейтинг</label>
                                <select
                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
                                  value={question.skipLogic.condition?.value || ''}
                                  onChange={(e) => updateQuestion(question.id, 'skipLogic', {
                                    ...question.skipLogic,
                                    condition: {
                                      ...question.skipLogic?.condition!,
                                      value: Number(e.target.value)
                                    }
                                  })}
                                >
                                  <option value="">Оберіть рейтинг</option>
                                  {[1, 2, 3, 4, 5].map(n => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Add Question Button */}
        <Button variant="secondary" onClick={addQuestion} className="w-full mb-6">
          ➕ Додати питання
        </Button>
        </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
          {/* Settings Section */}
          <Card className="mb-6 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">⚙️ Налаштування опитування</h3>
          <div className="space-y-4">
            {/* Multiple Responses */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allowMultipleResponses"
                checked={surveyData.allowMultipleResponses}
                onChange={(e) =>
                  setSurveyData({ ...surveyData, allowMultipleResponses: e.target.checked })
                }
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-200 cursor-pointer"
              />
              <label htmlFor="allowMultipleResponses" className="text-sm font-medium text-gray-700 cursor-pointer">
                Дозволити кілька відповідей від одного користувача
              </label>
            </div>

            {/* Closing Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата автоматичного завершення (необов'язково)
              </label>
              <input
                type="datetime-local"
                value={surveyData.closingDate}
                onChange={(e) => setSurveyData({ ...surveyData, closingDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
              />
            </div>

            {/* Participant Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Максимальна кількість учасників (необов'язково)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Залиште порожнім для необмеженої кількості"
                value={surveyData.participantLimit || ''}
                onChange={(e) => setSurveyData({ ...surveyData, participantLimit: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
              />
              <p className="text-sm text-gray-500 mt-1">Опитування автоматично закриється після досягнення ліміту</p>
            </div>
          </div>
        </Card>

        {/* Collaborators Section */}
        <Card className="mb-6 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">👥 Співавтори</h3>
          <p className="text-sm text-gray-600 mb-4">
            Додайте співавторів, щоб вони могли редагувати це опитування разом з вами
          </p>

          {/* Add Collaborator Form */}
          <div className="flex gap-3 mb-4">
            <Input
              placeholder="Email співавтора"
              value={newCollaboratorEmail}
              onChange={(e) => setNewCollaboratorEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCollaborator()}
              disabled={isAddingCollaborator}
            />
            <Button
              onClick={handleAddCollaborator}
              disabled={isAddingCollaborator || !newCollaboratorEmail.trim()}
            >
              {isAddingCollaborator ? 'Додавання...' : 'Додати'}
            </Button>
          </div>

          {/* Collaborators List */}
          {collaborators.length > 0 ? (
            <div className="space-y-2">
              {collaborators.map((collab) => (
                <div
                  key={collab.user._id || collab.user}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-semibold text-sm">
                        {collab.user.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {collab.user.name || collab.user.username || collab.user.email}
                      </p>
                      <p className="text-xs text-gray-500">{collab.user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCollaborator(collab.user._id || collab.user)}
                    className="text-red-600 hover:text-red-700 px-3 py-1 text-sm font-medium"
                  >
                    Видалити
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Поки що немає співавторів
            </p>
          )}
        </Card>
        </>
        )}

        {/* Save Buttons */}
        <Card className="p-6">
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate('/surveys')}>
              Скасувати
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              💾 Зберегти зміни
            </Button>
          </div>
        </Card>
      </div>

      {/* AI Generator Modal */}
      <AIGeneratorModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={handleAIGenerate}
      />
    </div>
  );
};

export default EditSurveyPage;

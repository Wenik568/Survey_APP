import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card, Navbar } from '../components/common';
import AIGeneratorModal from '../components/surveys/AIGeneratorModal';
import AddQuestionsModal from '../components/surveys/AddQuestionsModal';
import { surveyService } from '../services/surveyService';
import { aiService } from '../services/aiService';
import type { Question, AIGeneratedSurvey } from '../types';

const CreateSurveyPage = () => {
  const navigate = useNavigate();
  const [showAIModal, setShowAIModal] = useState(false);
  const [showAddQuestionsModal, setShowAddQuestionsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'settings'>('create');

  const [surveyData, setSurveyData] = useState({
    title: '',
    description: '',
    allowMultipleResponses: false,
    closingDate: '',
    participantLimit: null as number | null,
  });

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      text: '',
      type: 'text',
      required: true,
      options: [],
    },
  ]);

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');

  const questionTypeLabels = {
    text: 'Коротка текстова відповідь',
    textarea: 'Довга текстова відповідь',
    radio: 'Один варіант відповіді',
    checkbox: 'Декілька варіантів відповіді',
    rating: 'Рейтинг (1-5)',
  };

  const handleAIGenerate = (aiSurvey: AIGeneratedSurvey) => {
    setSurveyData({
      ...surveyData,
      title: aiSurvey.title,
      description: aiSurvey.description,
    });

    // Convert AI questions format to our format
    const processedQuestions = aiSurvey.questions.map((q, index) => ({
      ...q,
      id: q.id || String(index + 1),
      // Ensure options are strings array, not objects
      options: Array.isArray(q.options)
        ? q.options.map((opt) => (typeof opt === 'string' ? opt : opt.text || opt.value || String(opt)))
        : [],
    }));

    setQuestions(processedQuestions as Question[]);
    setShowAIModal(false);
  };

  const handleAddQuestions = (newQuestions: Question[]) => {
    const startId = questions.length > 0 ? Math.max(...questions.map((q) => parseInt(q.id || '0'))) + 1 : 1;
    const processedQuestions = newQuestions.map((q, index) => ({
      ...q,
      id: String(startId + index),
      options: Array.isArray(q.options)
        ? q.options.map((opt) => (typeof opt === 'string' ? opt : opt.text || opt.value || String(opt)))
        : [],
    }));

    setQuestions([...questions, ...processedQuestions]);
    setShowAddQuestionsModal(false);
  };

  const handleRegenerateQuestion = async (index: number) => {
    const question = questions[index];
    setRegeneratingIndex(index);
    setError('');

    try {
      const newQuestion = await aiService.regenerateQuestion(
        question.text,
        question.type,
        surveyData.title || 'опитування',
        questions,
        question.options // Передаємо поточні варіанти відповідей
      );

      const processedQuestion = {
        ...newQuestion,
        id: question.id,
        options: Array.isArray(newQuestion.options)
          ? newQuestion.options.map((opt: any) =>
              typeof opt === 'string' ? opt : opt.text || opt.value || String(opt)
            )
          : [],
      };

      setQuestions(questions.map((q, i) => (i === index ? processedQuestion : q)));
    } catch (err: any) {
      setError(err.message || 'Помилка regenerate питання');
    } finally {
      setRegeneratingIndex(null);
    }
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

  const removeQuestion = (id: string) => {
    if (questions.length === 1) {
      setError('Опитування має містити хоча б одне питання');
      return;
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          const updated = { ...q, [field]: value };
          // Якщо тип змінюється на radio/checkbox, додаємо дефолтні опції
          if (field === 'type' && (value === 'radio' || value === 'checkbox')) {
            if (!updated.options || updated.options.length === 0) {
              updated.options = ['Варіант 1', 'Варіант 2'];
            }
          }
          // Якщо тип не radio/checkbox, очищаємо опції
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

    // При створенні опитування просто додаємо до локального стейту
    // Співавтори будуть збережені разом з опитуванням
    const email = newCollaboratorEmail.trim();

    // Перевірка чи не дублюється email
    if (collaborators.some(c => c.email === email)) {
      setError('Цей співавтор вже доданий');
      return;
    }

    setCollaborators([...collaborators, { email, addedAt: new Date() }]);
    setNewCollaboratorEmail('');
    setError('');
  };

  const handleRemoveCollaborator = (email: string) => {
    setCollaborators(collaborators.filter(c => c.email !== email));
  };

  const handleSave = async () => {
    setError('');

    if (!validateSurvey()) {
      return;
    }

    setIsLoading(true);

    try {
      // Add order field to each question
      const questionsWithOrder = questions.map((q, index) => {
        console.log(`📋 Обробка питання ${index}:`, {
          text: q.text,
          hasSkipLogic: !!q.skipLogic,
          skipLogic: q.skipLogic
        });

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

          console.log(`🔍 Skip Logic для питання ${index}:`, {
            currentQuestionId: q.id,
            lookingFor: q.skipLogic.condition.questionId,
            foundIndex: sourceQuestionIndex,
            allQuestionIds: questions.map(qu => qu.id)
          });

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
            console.log(`✅ Додано skipLogic до питання ${index}:`, baseQuestion.skipLogic);
          } else {
            console.warn(`⚠️ Не знайдено питання-джерело з ID ${q.skipLogic.condition.questionId}`);
          }
        }

        console.log(`📦 Фінальне питання ${index}:`, baseQuestion);
        return baseQuestion;
      });

      console.log(`📤 Відправляємо на сервер:`, questionsWithOrder);

      const surveyPayload = {
        ...surveyData,
        questions: questionsWithOrder,
        collaboratorEmails: collaborators.map(c => c.email),
        isActive: true,
      };

      await surveyService.createSurvey(surveyPayload);
      navigate('/surveys');
    } catch (err: any) {
      setError(err.message || 'Помилка створення опитування');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-bg">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 text-center drop-shadow-lg">
            Створення опитування
          </h1>
          <p className="text-white/90 text-center text-lg">
            Створіть опитування вручну або згенеруйте за допомогою AI
          </p>
        </div>

        {error && (
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
                Згенеруйте опитування автоматично за допомогою штучного інтелекту
              </p>
            </div>
            <Button onClick={() => setShowAIModal(true)}>✨ Згенерувати з AI</Button>
          </div>
        </Card>

        {/* Tabs */}
        <Card className="mb-6 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📝 Створення опитування
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

        {/* Create Tab - Basic Info + Questions */}
        {activeTab === 'create' && (
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
        {/* Questions */}
        <div className="space-y-4 mb-6">
          {questions.map((question, index) => (
            <Card key={question.id} data-question-index={index} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">Питання {index + 1}</h4>
                <div className="flex items-center gap-2">
                  {/* AI Regenerate */}
                  <button
                    onClick={() => handleRegenerateQuestion(index)}
                    disabled={regeneratingIndex === index || !question.text}
                    className="px-3 py-1 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Regenerate питання з AI"
                  >
                    {regeneratingIndex === index ? '🔄' : '✨ AI'}
                  </button>
                  {/* Move Up/Down */}
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
                  {/* Remove Question */}
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
                {/* Question Text */}
                <Input
                  label="Текст питання"
                  placeholder="Введіть ваше питання..."
                  value={question.text}
                  onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                  required
                />

                {/* Question Type */}
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

                {/* Options for radio/checkbox */}
                {(question.type === 'radio' || question.type === 'checkbox') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Варіанти відповідей
                    </label>
                    <div className="space-y-2">
                      {question.options?.map((option, optIndex) => {
                        // Handle both string and object options
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

                {/* Required Toggle */}
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

        {/* Add Question Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button variant="secondary" onClick={addQuestion}>
            ➕ Додати питання
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowAddQuestionsModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
          >
            ✨ Додати з AI
          </Button>
        </div>
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
            />
            <Button
              onClick={handleAddCollaborator}
              disabled={!newCollaboratorEmail.trim()}
            >
              Додати
            </Button>
          </div>

          {/* Collaborators List */}
          {collaborators.length > 0 ? (
            <div className="space-y-2">
              {collaborators.map((collab, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-semibold text-sm">
                        {collab.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{collab.email}</p>
                      <p className="text-xs text-gray-500">Буде додано при збереженні</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCollaborator(collab.email)}
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
            <Button onClick={handleSave} isLoading={isLoading}>
              💾 Зберегти опитування
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

      {/* Add Questions Modal */}
      <AddQuestionsModal
        isOpen={showAddQuestionsModal}
        onClose={() => setShowAddQuestionsModal(false)}
        onAddQuestions={handleAddQuestions}
        existingQuestions={questions}
        surveyTopic={surveyData.title}
      />
    </div>
  );
};

export default CreateSurveyPage;

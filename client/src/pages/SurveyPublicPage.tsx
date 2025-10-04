import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Loading } from '../components/common';
import { surveyService } from '../services/surveyService';
import { responseService } from '../services/responseService';
import type { Survey, Question } from '../types';

const SurveyPublicPage = () => {
  const { uniqueLink } = useParams<{ uniqueLink: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [visibleQuestions, setVisibleQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (uniqueLink) {
      loadSurvey();
    }
  }, [uniqueLink]);

  // Оновлення видимості питань при зміні відповідей
  useEffect(() => {
    if (!survey) return;

    const newVisible = new Set<string>();

    survey.questions.forEach((question, index) => {
      const questionId = (question as any)._id || question.id || String(index);

      // Якщо немає skip logic або вона вимкнена - питання завжди видиме
      if (!question.skipLogic?.enabled || !question.skipLogic.condition) {
        newVisible.add(questionId);
        return;
      }

      // Перевіряємо умову skip logic
      const condition = question.skipLogic.condition;
      const sourceAnswer = answers[condition.questionId];
      let shouldShow = false;

      switch (condition.operator) {
        case 'equals':
          // Не показуємо якщо ще не відповіли
          if (!sourceAnswer && sourceAnswer !== 0) {
            shouldShow = false;
          } else if (typeof sourceAnswer === 'number' || typeof condition.value === 'number') {
            shouldShow = Number(sourceAnswer) === Number(condition.value);
          } else {
            shouldShow = sourceAnswer === condition.value;
          }
          break;
        case 'not_equals':
          // Не показуємо якщо ще не відповіли
          if (!sourceAnswer && sourceAnswer !== 0) {
            shouldShow = false;
          } else if (typeof sourceAnswer === 'number' || typeof condition.value === 'number') {
            shouldShow = Number(sourceAnswer) !== Number(condition.value);
          } else {
            shouldShow = sourceAnswer !== condition.value;
          }
          break;
        case 'contains':
          // Для checkbox - перевіряємо чи масив містить значення
          shouldShow = Array.isArray(sourceAnswer) && sourceAnswer.includes(condition.value);
          break;
        case 'not_contains':
          // Для checkbox - показуємо якщо НЕ містить або не відповіли
          if (Array.isArray(sourceAnswer)) {
            shouldShow = !sourceAnswer.includes(condition.value);
          } else {
            // Якщо не масив (не checkbox) - вважаємо що не містить
            shouldShow = true;
          }
          break;
        case 'is_answered':
          // Показуємо якщо є будь-яка відповідь
          if (Array.isArray(sourceAnswer)) {
            shouldShow = sourceAnswer.length > 0;
          } else {
            shouldShow = sourceAnswer !== '' && sourceAnswer !== undefined && sourceAnswer !== null;
          }
          break;
        default:
          shouldShow = true;
      }

      if (shouldShow) {
        newVisible.add(questionId);
      }
    });

    setVisibleQuestions(newVisible);
  }, [answers, survey]);

  const loadSurvey = async () => {
    try {
      const data = await surveyService.getSurveyByLink(uniqueLink!);
      setSurvey(data);

      // Перевірка чи користувач вже відповідав на це опитування
      if (!data.allowMultipleResponses) {
        const hasResponded = localStorage.getItem(`survey_responded_${data._id}`);
        if (hasResponded === 'true') {
          setSubmitted(true);
          setIsLoading(false);
          return;
        }
      }

      // Initialize answers for all questions
      const initialAnswers: Record<string, any> = {};
      data.questions.forEach((q: Question, index: number) => {
        // Використовуємо _id або id, або index як fallback
        const questionId = (q as any)._id || q.id || String(index);
        if (q.type === 'checkbox') {
          initialAnswers[questionId] = [];
        } else {
          initialAnswers[questionId] = '';
        }
      });
      setAnswers(initialAnswers);
    } catch (error: any) {
      setError(error.message || 'Опитування не знайдено');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any, questionType: string) => {
    if (questionType === 'checkbox') {
      const currentValues = answers[questionId] || [];
      if (currentValues.includes(value)) {
        setAnswers({
          ...answers,
          [questionId]: currentValues.filter((v: string) => v !== value),
        });
      } else {
        setAnswers({
          ...answers,
          [questionId]: [...currentValues, value],
        });
      }
    } else {
      setAnswers({
        ...answers,
        [questionId]: value,
      });
    }
  };

  const validateAnswers = (): boolean => {
    if (!survey) return false;

    for (let i = 0; i < survey.questions.length; i++) {
      const question = survey.questions[i];
      const questionId = (question as any)._id || question.id || String(i);

      // Перевіряємо тільки видимі та обов'язкові питання
      if (question.required && visibleQuestions.has(questionId)) {
        const answer = answers[questionId];
        if (
          answer === undefined ||
          answer === '' ||
          (Array.isArray(answer) && answer.length === 0)
        ) {
          setError(`Будь ласка, дайте відповідь на питання: "${question.text}"`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    setError('');

    if (!validateAnswers()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Transform answers to API format
      const responseAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      await responseService.submitResponse(uniqueLink!, {
        answers: responseAnswers,
      });

      // Зберігаємо в localStorage, що користувач відповів на це опитування
      if (survey && !survey.allowMultipleResponses) {
        localStorage.setItem(`survey_responded_${survey._id}`, 'true');
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('❌ Помилка відправки:', err);
      console.error('📋 Деталі помилки:', err.response?.data);
      setError(err.response?.data?.message || err.message || 'Помилка відправки відповіді');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <Loading text="Завантаження опитування..." />
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-4">
        <Card className="p-12 text-center max-w-md animate-fade-in">
          <div className="text-6xl mb-4 animate-bounce">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Опитування не знайдено</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/login')}>На головну</Button>
        </Card>
      </div>
    );
  }

  if (submitted) {
    const canRespondAgain = survey?.allowMultipleResponses;
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-4">
        <Card className="p-12 text-center max-w-md animate-fade-in">
          <div className="text-6xl mb-4 animate-bounce">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Дякуємо за відповідь!</h2>
          <p className="text-gray-600 mb-6">
            {canRespondAgain
              ? 'Ваші відповіді були успішно відправлені. Ви можете відповісти ще раз, перезавантаживши сторінку.'
              : 'Ваші відповіді були успішно відправлені. Ви вже не можете відповідати на це опитування повторно.'}
          </p>
          <div className="flex gap-3 justify-center">
            {canRespondAgain && (
              <Button onClick={() => window.location.reload()}>Відповісти ще раз</Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/login')}>
              На головну
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!survey?.isActive) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-4">
        <Card className="p-12 text-center max-w-md animate-fade-in">
          <div className="text-6xl mb-4">⏸️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Опитування неактивне</h2>
          <p className="text-gray-600 mb-6">
            Це опитування наразі не приймає відповіді
          </p>
          <Button onClick={() => navigate('/login')}>На головну</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header with Logo */}
        <div className="mb-8 text-center animate-fade-in">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-white drop-shadow-2xl">
              📊 Система Опитувань
            </span>
          </h1>
          <p className="text-white text-lg font-medium drop-shadow-lg">Ваша думка важлива для нас</p>
        </div>

        {/* Survey Header Card */}
        <Card className="mb-8 p-8 animate-slide-up shadow-2xl border-t-4 border-primary-500">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-4">
            {survey.title}
          </h2>
          {survey.description && (
            <p className="text-gray-600 text-lg leading-relaxed">{survey.description}</p>
          )}
          <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <span>{survey.questions.length} питань</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⏱️</span>
              <span>~{Math.ceil(survey.questions.length * 0.5)} хв</span>
            </div>
          </div>
        </Card>

        {/* Progress Bar */}
        {(() => {
          const totalVisible = visibleQuestions.size;
          const answered = Array.from(visibleQuestions).filter((qId) => {
            const answer = answers[qId];
            if (Array.isArray(answer)) {
              return answer.length > 0;
            }
            return answer !== '' && answer !== undefined && answer !== null;
          }).length;
          const progress = totalVisible > 0 ? (answered / totalVisible) * 100 : 0;

          return (
            <div className="sticky top-0 z-40 mb-6 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📝</span>
                  <span className="text-sm font-medium text-gray-600">
                    {answered} / {totalVisible} відповідей
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    {Math.round(progress)}%
                  </div>
                </div>
              </div>
              <div className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>
          );
        })()}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl shadow-md animate-shake">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6 mb-8">
          {survey.questions.map((question, index) => {
            // Використовуємо _id або id, або index як fallback
            const questionId = (question as any)._id || question.id || String(index);

            // Показуємо тільки видимі питання
            if (!visibleQuestions.has(questionId)) {
              return null;
            }

            return (
            <Card
              key={questionId}
              className="p-6 animate-slide-up shadow-lg hover:shadow-2xl transition-all duration-300 border-l-4 border-primary-400"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-5">
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full mr-3 text-sm">
                    {index + 1}
                  </span>
                  {question.text}
                  {question.required && <span className="text-red-500 ml-2 text-xl">*</span>}
                </label>
              </div>

              {/* Text Input */}
              {question.type === 'text' && (
                <Input
                  placeholder="Введіть вашу відповідь..."
                  value={answers[questionId] || ''}
                  onChange={(e) => handleAnswerChange(questionId, e.target.value, 'text')}
                  required={question.required}
                />
              )}

              {/* Textarea */}
              {question.type === 'textarea' && (
                <textarea
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all resize-none"
                  rows={5}
                  placeholder="Введіть вашу відповідь..."
                  value={answers[questionId] || ''}
                  onChange={(e) => handleAnswerChange(questionId, e.target.value, 'textarea')}
                  required={question.required}
                />
              )}

              {/* Radio */}
              {question.type === 'radio' && (
                <div className="space-y-3">
                  {question.options?.map((option, optIndex) => {
                    const optionValue = typeof option === 'string' ? option : option.text || option.value;
                    const isSelected = answers[questionId] === optionValue;
                    return (
                      <label
                        key={optIndex}
                        className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 shadow-md'
                            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={questionId}
                          value={optionValue}
                          checked={isSelected}
                          onChange={(e) => handleAnswerChange(questionId, e.target.value, 'radio')}
                          className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                        />
                        <span className={`${isSelected ? 'text-primary-700 font-medium' : 'text-gray-700'}`}>
                          {optionValue}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Checkbox */}
              {question.type === 'checkbox' && (
                <div className="space-y-3">
                  {question.options?.map((option, optIndex) => {
                    const optionValue = typeof option === 'string' ? option : option.text || option.value;
                    const isChecked = (answers[questionId] || []).includes(optionValue);
                    return (
                      <label
                        key={optIndex}
                        className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          isChecked
                            ? 'border-primary-500 bg-primary-50 shadow-md'
                            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={optionValue}
                          checked={isChecked}
                          onChange={(e) => handleAnswerChange(questionId, optionValue, 'checkbox')}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className={`${isChecked ? 'text-primary-700 font-medium' : 'text-gray-700'}`}>
                          {optionValue}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Rating */}
              {question.type === 'rating' && (
                <div className="flex gap-3 justify-center py-4">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleAnswerChange(questionId, rating, 'rating')}
                      className={`w-16 h-16 rounded-xl font-bold text-xl transition-all duration-200 ${
                        answers[questionId] === rating
                          ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-xl scale-110 transform'
                          : 'bg-white border-2 border-gray-300 text-gray-600 hover:border-primary-400 hover:bg-primary-50 hover:scale-105'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              )}
            </Card>
            );
          })}
        </div>

        {/* Submit Button */}
        <Card className="p-8 shadow-2xl animate-slide-up border-t-4 border-primary-500">
          <div className="text-center mb-4">
            <p className="text-gray-600 text-sm">
              Переконайтеся, що ви дали відповідь на всі обов'язкові питання
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="w-full text-lg py-4 shadow-xl hover:shadow-2xl transition-all duration-300"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin inline-block mr-2">⏳</span>
                Відправка...
              </>
            ) : (
              <>
                ✉️ Відправити відповіді
              </>
            )}
          </Button>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-white/80 text-sm">
          <p>Дякуємо, що приділили час для проходження цього опитування! 💙</p>
        </div>
      </div>
    </div>
  );
};

export default SurveyPublicPage;

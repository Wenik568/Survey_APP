import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, Loading, Navbar } from '../components/common';
import { RatingChart, PieChartComponent, BarChartComponent } from '../components/charts';
import { surveyService } from '../services/surveyService';
import { responseService } from '../services/responseService';
import { exportToPDF } from '../utils/pdfExport';
import type { Survey, SurveyResponse } from '../types';

interface QuestionStats {
  questionId: string;
  questionText: string;
  questionType: string;
  totalAnswers: number;
  textAnswers?: string[];
  optionStats?: { option: string; count: number; percentage: number }[];
  ratingAverage?: number;
  ratingDistribution?: { rating: number; count: number }[];
}

const ResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get('id');

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [stats, setStats] = useState<QuestionStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'charts' | 'table' | 'responses'>('charts');

  useEffect(() => {
    if (!surveyId) {
      setError('ID опитування не вказано');
      setIsLoading(false);
      return;
    }
    loadData();
  }, [surveyId]);

  const loadData = async () => {
    try {
      const [surveyData, responsesData] = await Promise.all([
        surveyService.getSurveyById(surveyId!),
        responseService.getResponses(surveyId!),
      ]);

      setSurvey(surveyData);
      setResponses(responsesData);
      calculateStats(surveyData, responsesData);
    } catch (error: any) {
      setError(error.message || 'Помилка завантаження даних');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (survey: Survey, responses: SurveyResponse[]) => {
    console.log('📊 Calculating stats for survey:', survey._id);
    console.log('📝 Total responses:', responses.length);

    // Виводимо всі questionId з відповідей
    responses.forEach((r, idx) => {
      console.log(`\n📋 Response ${idx + 1} (${r._id}) questionIds:`,
        r.answers.map(a => a.questionId)
      );
    });

    // Виводимо всі questionId з опитування
    console.log('\n📝 Survey question IDs:',
      survey.questions.map((q, idx) => ({
        index: idx,
        _id: (q as any)._id,
        id: (q as any).id
      }))
    );

    const questionStats: QuestionStats[] = survey.questions.map((question, index) => {
      // Question ID can be _id (from DB) or string index
      const questionId = (question as any)._id || (question as any).id || String(index);

      console.log(`\n🔍 Processing question ${index + 1}:`, {
        questionId,
        text: question.text,
        type: question.type
      });

      const answers = responses
        .map((r) => {
          // Спочатку шукаємо по ID
          let answer = r.answers.find((a) => a.questionId === questionId);

          // Якщо не знайдено по ID, шукаємо по індексу (fallback для старих відповідей)
          if (!answer && r.answers[index]) {
            console.log(`  🔄 Response ${r._id}: Falling back to index ${index}`);
            answer = r.answers[index];
          }

          if (!answer) {
            console.log(`  ❌ Response ${r._id}: NOT FOUND. Available IDs:`, r.answers.map(a => a.questionId));
          } else {
            console.log(`  ✅ Response ${r._id}: FOUND answer =`, answer.answer);
          }
          return answer;
        })
        .filter((a) => a !== undefined);

      console.log(`  📊 Total answers for this question: ${answers.length}`);

      const stat: QuestionStats = {
        questionId: questionId,
        questionText: question.text,
        questionType: question.type,
        totalAnswers: answers.length,
      };

      if (question.type === 'text' || question.type === 'textarea') {
        stat.textAnswers = answers.map((a) => {
          const answer = a!.answer;
          // Обробка об'єктів і рядків для текстових відповідей
          if (typeof answer === 'string') return answer;
          return answer?.text || answer?.value || String(answer);
        });
      } else if (question.type === 'radio' || question.type === 'checkbox') {
        const optionCounts: Record<string, number> = {};

        answers.forEach((a) => {
          const answer = a!.answer;
          if (Array.isArray(answer)) {
            answer.forEach((opt) => {
              // Обробка об'єктів і рядків
              const optValue = typeof opt === 'string' ? opt : (opt?.text || opt?.value || String(opt));
              optionCounts[optValue] = (optionCounts[optValue] || 0) + 1;
            });
          } else {
            // Обробка об'єктів і рядків для одиночних відповідей
            const answerValue = typeof answer === 'string'
              ? answer
              : (answer?.text || answer?.value || String(answer));
            optionCounts[answerValue] = (optionCounts[answerValue] || 0) + 1;
          }
        });

        // Для checkbox рахуємо відсоток від загальної кількості ВСІХ респондентів
        // Для radio рахуємо від тих, хто відповів на це питання
        const totalRespondents = question.type === 'checkbox' ? responses.length : answers.length;

        stat.optionStats = Object.entries(optionCounts).map(([option, count]) => ({
          option,
          count,
          percentage: totalRespondents > 0 ? (count / totalRespondents) * 100 : 0,
        }));
      } else if (question.type === 'rating') {
        const ratings = answers.map((a) => Number(a!.answer));
        const sum = ratings.reduce((acc, val) => acc + val, 0);
        stat.ratingAverage = ratings.length > 0 ? sum / ratings.length : 0;

        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratings.forEach((rating) => {
          distribution[rating] = (distribution[rating] || 0) + 1;
        });

        stat.ratingDistribution = Object.entries(distribution).map(([rating, count]) => ({
          rating: Number(rating),
          count,
        }));
      }

      return stat;
    });

    setStats(questionStats);
  };

  const exportToCSV = () => {
    if (!survey || responses.length === 0) return;

    const headers = ['Response ID', 'Date', ...survey.questions.map((q) => q.text)];
    const rows = responses.map((response) => [
      response._id,
      new Date(response.submittedAt).toLocaleString('uk-UA'),
      ...survey.questions.map((q) => {
        const answer = response.answers.find((a) => a.questionId === q.id);
        if (!answer) return '';

        // Обробка різних типів відповідей
        const answerValue = answer.answer;
        if (Array.isArray(answerValue)) {
          return answerValue.map(val =>
            typeof val === 'string' ? val : (val?.text || val?.value || String(val))
          ).join('; ');
        }

        // Для одиночних відповідей
        if (typeof answerValue === 'string') return answerValue;
        return answerValue?.text || answerValue?.value || String(answerValue);
      }),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    // Add BOM for UTF-8 encoding to properly display Ukrainian text in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${survey.title}_results.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <Loading text="Завантаження результатів..." />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Помилка</h2>
          <p className="text-gray-600 mb-6">{error || 'Опитування не знайдено'}</p>
          <Button onClick={() => navigate('/surveys')}>До списку опитувань</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg">
      <Navbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Card className="mb-8 p-6">
          <div className="flex justify-between items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-3xl font-bold text-gray-800 mb-2 break-words">{survey.title}</h2>
              {survey.description && <p className="text-gray-600 break-words">{survey.description}</p>}
            </div>
            <div className="flex-shrink-0">
              <Button
                onClick={() => exportToPDF(survey, responses, stats)}
                variant="primary"
                className="whitespace-nowrap"
              >
                📄 Експорт PDF
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-lg">
            <span className="text-gray-700">
              📝 <strong>{survey.questions.length}</strong> питань
            </span>
            <span className="text-gray-700">
              ✉️ <strong>{responses.length}</strong> відповідей
            </span>
          </div>
        </Card>

        {responses.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Поки немає відповідей</h3>
            <p className="text-gray-600">
              Поділіться посиланням на опитування, щоб почати збирати відповіді
            </p>
          </Card>
        ) : (
          <>
            {/* Tabs Navigation */}
            <Card className="p-2 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    activeTab === 'charts'
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  📊 Графіки
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    activeTab === 'table'
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  📋 Таблиця
                </button>
                <button
                  onClick={() => setActiveTab('responses')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    activeTab === 'responses'
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  💬 Відповіді
                </button>
              </div>
            </Card>

            {/* Charts Tab */}
            {activeTab === 'charts' && (
              <div className="space-y-8">
                {stats.map((stat, index) => (
                  <Card key={stat.questionId} className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {index + 1}. {stat.questionText}
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                      Відповіді: {stat.totalAnswers} / {responses.length}
                    </p>

                    {/* Rating Chart */}
                    {stat.questionType === 'rating' && stat.ratingDistribution && stat.ratingAverage !== undefined && (
                      <RatingChart
                        data={stat.ratingDistribution}
                        average={stat.ratingAverage}
                      />
                    )}

                    {/* Radio - Pie Chart */}
                    {stat.questionType === 'radio' && stat.optionStats && stat.optionStats.length > 0 && (
                      <PieChartComponent
                        data={stat.optionStats.map(opt => ({
                          name: opt.option,
                          value: opt.count,
                          percentage: opt.percentage
                        }))}
                      />
                    )}

                    {/* Checkbox - Bar Chart */}
                    {stat.questionType === 'checkbox' && stat.optionStats && stat.optionStats.length > 0 && (
                      <BarChartComponent
                        data={stat.optionStats.map(opt => ({
                          name: opt.option,
                          value: opt.count,
                          percentage: opt.percentage
                        }))}
                      />
                    )}

                    {/* Text answers - simple list */}
                    {(stat.questionType === 'text' || stat.questionType === 'textarea') && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">📝 Останні відповіді:</h4>
                        {stat.textAnswers && stat.textAnswers.length > 0 ? (
                          <div className="grid gap-2 max-h-96 overflow-y-auto">
                            {stat.textAnswers.slice(0, 10).map((answer, i) => (
                              <div
                                key={i}
                                className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                              >
                                {answer}
                              </div>
                            ))}
                            {stat.textAnswers.length > 10 && (
                              <p className="text-sm text-gray-500 text-center py-2">
                                ... і ще {stat.textAnswers.length - 10} відповідей
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">Немає відповідей</p>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* Table Tab */}
            {activeTab === 'table' && (
              <div className="space-y-8">
                {stats.map((stat, index) => (
                  <Card key={stat.questionId} className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      {index + 1}. {stat.questionText}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Відповіді: {stat.totalAnswers} / {responses.length}
                    </p>

                    {/* Text Answers */}
                    {(stat.questionType === 'text' || stat.questionType === 'textarea') && (
                      <div className="space-y-2">
                        {stat.textAnswers && stat.textAnswers.length > 0 ? (
                          stat.textAnswers.map((answer, i) => (
                            <div
                              key={i}
                              className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                            >
                              {answer}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 italic">Немає відповідей</p>
                        )}
                      </div>
                    )}

                    {/* Option Stats */}
                    {(stat.questionType === 'radio' || stat.questionType === 'checkbox') && (
                      <div className="space-y-3">
                        {stat.optionStats && stat.optionStats.length > 0 ? (
                          stat.optionStats.map((optStat, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-700 font-medium">{optStat.option}</span>
                                <span className="text-gray-600">
                                  {optStat.count} ({optStat.percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500"
                                  style={{ width: `${optStat.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 italic">Немає відповідей</p>
                        )}
                      </div>
                    )}

                    {/* Rating Stats */}
                    {stat.questionType === 'rating' && (
                      <div>
                        <div className="mb-4 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl">
                          <p className="text-3xl font-bold text-center text-gray-800">
                            ⭐ {stat.ratingAverage?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-center text-gray-600 mt-1">Середній рейтинг</p>
                        </div>
                        <div className="space-y-2">
                          {stat.ratingDistribution?.map((dist) => (
                            <div key={dist.rating} className="flex items-center gap-3">
                              <span className="text-gray-700 font-medium w-12">{dist.rating} ⭐</span>
                              <div className="flex-1 h-8 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
                                  style={{
                                    width: `${
                                      stat.totalAnswers > 0 ? (dist.count / stat.totalAnswers) * 100 : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="text-gray-600 w-16 text-right">{dist.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* Responses Tab */}
            {activeTab === 'responses' && (
              <div className="space-y-6">
                {responses.length > 0 ? (
                  responses
                    .slice()
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                    .map((response, responseIndex) => (
                      <Card key={response._id} className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">
                              💬 Відповідь #{responses.length - responseIndex}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(response.submittedAt).toLocaleString('uk-UA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4 mt-4">
                          {survey.questions.map((question, qIndex) => {
                            const questionId = (question as any)._id || (question as any).id || String(qIndex);
                            const answer = response.answers.find((a) => a.questionId === questionId);

                            return (
                              <div key={questionId} className="border-l-4 border-primary-500 pl-4 py-2">
                                <p className="font-semibold text-gray-700 mb-2">
                                  {qIndex + 1}. {question.text}
                                </p>
                                <div className="text-gray-600">
                                  {answer ? (
                                    <>
                                      {/* Text/Textarea answers */}
                                      {(question.type === 'text' || question.type === 'textarea') && (
                                        <p className="bg-gray-50 p-3 rounded-lg">
                                          {typeof answer.answer === 'string'
                                            ? answer.answer
                                            : (answer.answer as any)?.text ||
                                              (answer.answer as any)?.value ||
                                              String(answer.answer)}
                                        </p>
                                      )}

                                      {/* Radio answers */}
                                      {question.type === 'radio' && (
                                        <p className="bg-primary-50 p-3 rounded-lg font-medium">
                                          ✓{' '}
                                          {typeof answer.answer === 'string'
                                            ? answer.answer
                                            : (answer.answer as any)?.text ||
                                              (answer.answer as any)?.value ||
                                              String(answer.answer)}
                                        </p>
                                      )}

                                      {/* Checkbox answers */}
                                      {question.type === 'checkbox' && (
                                        <div className="space-y-1">
                                          {Array.isArray(answer.answer) ? (
                                            answer.answer.map((opt, i) => (
                                              <p key={i} className="bg-secondary-50 p-2 rounded-lg">
                                                ✓{' '}
                                                {typeof opt === 'string'
                                                  ? opt
                                                  : (opt as any)?.text || (opt as any)?.value || String(opt)}
                                              </p>
                                            ))
                                          ) : (
                                            <p className="bg-secondary-50 p-2 rounded-lg">
                                              ✓{' '}
                                              {typeof answer.answer === 'string'
                                                ? answer.answer
                                                : (answer.answer as any)?.text ||
                                                  (answer.answer as any)?.value ||
                                                  String(answer.answer)}
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      {/* Rating answers */}
                                      {question.type === 'rating' && (
                                        <div className="flex items-center gap-2 bg-yellow-50 p-3 rounded-lg">
                                          <span className="text-2xl font-bold text-yellow-600">
                                            {answer.answer}
                                          </span>
                                          <span className="text-yellow-500">
                                            {'⭐'.repeat(Number(answer.answer))}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-gray-400 italic">Не відповіли</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    ))
                ) : (
                  <Card className="p-12 text-center">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Немає відповідей</h3>
                    <p className="text-gray-600">Ще ніхто не відповів на це опитування</p>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;

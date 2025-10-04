import api from './api';
import type {
  AIGenerateSurveyInput,
  AIGeneratedSurvey,
  AIAnalysisResult,
  AIChatRequest,
  ApiResponse,
} from '../types';

export const aiService = {
  // Генерація опитування за допомогою AI
  async generateSurvey(input: AIGenerateSurveyInput): Promise<AIGeneratedSurvey> {
    const response = await api.post<ApiResponse<AIGeneratedSurvey>>(
      '/api/ai/generate-survey',
      input
    );
    return response.data.data;
  },

  // Покращення питання
  async improveQuestion(question: string): Promise<{ improved: string; original: string }> {
    const response = await api.post<
      ApiResponse<{ improved: string; original: string }>
    >('/api/ai/improve-question', { question });
    return response.data.data;
  },

  // Regenerate окреме питання
  async regenerateQuestion(
    questionText: string,
    questionType: string,
    surveyTopic: string,
    existingQuestions: any[],
    currentOptions?: any[]
  ): Promise<any> {
    const response = await api.post<ApiResponse<{ question: any }>>(
      '/api/ai/regenerate-question',
      {
        questionText,
        questionType,
        surveyTopic,
        existingQuestions,
        currentOptions,
      }
    );
    return response.data.data.question;
  },

  // Генерація додаткових питань
  async generateAdditionalQuestions(
    topic: string,
    existingQuestions: any[],
    count: number = 3
  ): Promise<any[]> {
    const response = await api.post<ApiResponse<{ questions: any[] }>>(
      '/api/ai/generate-questions',
      {
        topic,
        existingQuestions,
        count,
      }
    );
    return response.data.data.questions;
  },

  // Аналіз якості опитування
  async analyzeSurvey(questions: any[]): Promise<any> {
    const response = await api.post<ApiResponse<any>>('/api/ai/analyze-survey', {
      questions,
    });
    return response.data.data;
  },

  // AI аналіз результатів опитування
  async analyzeResults(surveyId: string): Promise<AIAnalysisResult> {
    const response = await api.get<ApiResponse<AIAnalysisResult>>(
      `/api/surveys/${surveyId}/ai-analysis`
    );
    return response.data.data;
  },

  // AI аналіз результатів опитування (alias)
  async analyzeSurveyResults(surveyId: string): Promise<string> {
    const result = await this.analyzeResults(surveyId);
    return result.analysis;
  },

  // Чат з AI про результати
  async chatAboutResults(surveyId: string, chatRequest: AIChatRequest): Promise<string> {
    const response = await api.post<ApiResponse<{ response: string }>>(
      `/api/surveys/${surveyId}/ai-chat`,
      chatRequest
    );
    return response.data.data.response;
  },

  // Чат з AI (спрощений інтерфейс)
  async chatWithAI(
    surveyId: string,
    message: string,
    history: Array<{ role: string; content: string }>
  ): Promise<string> {
    return this.chatAboutResults(surveyId, { message, history });
  },
};

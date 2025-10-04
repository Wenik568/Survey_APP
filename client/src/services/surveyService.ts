import api from './api';
import type {
  Survey,
  CreateSurveyInput,
  SurveyStats,
  DashboardStats,
  ApiResponse,
} from '../types';

export const surveyService = {
  // Отримати всі опитування користувача
  async getSurveys(): Promise<Survey[]> {
    const response = await api.get<ApiResponse<{ surveys: Survey[] }>>('/api/surveys');
    return response.data.data.surveys;
  },

  // Отримати конкретне опитування
  async getSurvey(id: string): Promise<Survey> {
    const response = await api.get<ApiResponse<{ survey: Survey }>>(`/api/surveys/${id}`);
    return response.data.data.survey;
  },

  // Отримати конкретне опитування (alias для getSurvey)
  async getSurveyById(id: string): Promise<Survey> {
    return this.getSurvey(id);
  },

  // Отримати опитування за унікальним посиланням (публічне)
  async getSurveyByLink(uniqueLink: string): Promise<Survey> {
    const response = await api.get<ApiResponse<{ survey: Survey }>>(
      `/api/surveys/public/${uniqueLink}`
    );
    return response.data.data.survey;
  },

  // Створити опитування
  async createSurvey(data: CreateSurveyInput): Promise<Survey> {
    const response = await api.post<ApiResponse<{ survey: Survey }>>(
      '/api/surveys',
      data
    );
    return response.data.data.survey;
  },

  // Оновити опитування
  async updateSurvey(id: string, data: Partial<CreateSurveyInput>): Promise<Survey> {
    const response = await api.put<ApiResponse<{ survey: Survey }>>(
      `/api/surveys/${id}`,
      data
    );
    return response.data.data.survey;
  },

  // Видалити опитування
  async deleteSurvey(id: string): Promise<void> {
    await api.delete(`/api/surveys/${id}`);
  },

  // Перемкнути статус (активне/неактивне)
  async toggleStatus(id: string, isActive: boolean): Promise<Survey> {
    const response = await api.put<ApiResponse<{ survey: Survey }>>(
      `/api/surveys/${id}`,
      { isActive }
    );
    return response.data.data.survey;
  },

  // Отримати статистику опитування
  async getSurveyStats(id: string): Promise<SurveyStats> {
    const response = await api.get<ApiResponse<SurveyStats>>(
      `/api/surveys/${id}/stats`
    );
    return response.data.data;
  },

  // Отримати статистику дашборду
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<ApiResponse<DashboardStats>>('/api/surveys/stats');
    return response.data.data;
  },

  // Експорт у CSV
  async exportToCSV(id: string): Promise<Blob> {
    const response = await api.get(`/api/export/csv/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Додати співавтора
  async addCollaborator(surveyId: string, email: string): Promise<any> {
    const response = await api.post<ApiResponse<{ collaborators: any[] }>>(
      `/api/surveys/${surveyId}/collaborators`,
      { email }
    );
    return response.data.data;
  },

  // Видалити співавтора
  async removeCollaborator(surveyId: string, collaboratorId: string): Promise<any> {
    const response = await api.delete<ApiResponse<{ collaborators: any[] }>>(
      `/api/surveys/${surveyId}/collaborators/${collaboratorId}`
    );
    return response.data.data;
  },
};

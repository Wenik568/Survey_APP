import api from './api';
import type { SurveyResponse, SubmitResponseInput, ApiResponse } from '../types';

export const responseService = {
  // Відправити відповідь на опитування (публічний endpoint)
  async submitResponse(
    uniqueLink: string,
    data: SubmitResponseInput
  ): Promise<SurveyResponse> {
    const response = await api.post<ApiResponse<{ response: SurveyResponse }>>(
      `/api/surveys/public/${uniqueLink}/response`,
      data
    );
    return response.data.data.response;
  },

  // Отримати відповіді на опитування
  async getResponses(surveyId: string): Promise<SurveyResponse[]> {
    const response = await api.get<ApiResponse<{ responses: SurveyResponse[] }>>(
      `/api/surveys/${surveyId}/responses`
    );
    return response.data.data.responses;
  },
};

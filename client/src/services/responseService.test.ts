import { describe, test, expect, vi, beforeEach } from 'vitest';
import { responseService } from './responseService';
import api from './api';
import type { SurveyResponse, SubmitResponseInput } from '../types';

// Mock API module
vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('responseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitResponse', () => {
    test('відправляє відповідь на опитування', async () => {
      const mockResponse: SurveyResponse = {
        _id: '1',
        survey: 'survey-123',
        answers: [{ questionId: 'q1', answer: 'Test answer' }],
        submittedAt: '2024-01-01',
      };

      const mockApiResponse = {
        data: {
          success: true,
          data: { response: mockResponse },
        },
      };

      vi.mocked(api.post).mockResolvedValue(mockApiResponse);

      const submitData: SubmitResponseInput = {
        answers: [{ questionId: 'q1', answer: 'Test answer' }],
      };

      const result = await responseService.submitResponse('unique-link-123', submitData);

      expect(api.post).toHaveBeenCalledWith(
        '/api/surveys/public/unique-link-123/response',
        submitData
      );
      expect(result).toEqual(mockResponse);
    });

    test('правильно передає всі відповіді', async () => {
      const mockResponse: SurveyResponse = {
        _id: '2',
        survey: 'survey-456',
        answers: [
          { questionId: 'q1', answer: 'Answer 1' },
          { questionId: 'q2', answer: 'Answer 2' },
          { questionId: 'q3', answer: ['Option A', 'Option B'] },
        ],
        submittedAt: '2024-01-01',
      };

      vi.mocked(api.post).mockResolvedValue({
        data: {
          success: true,
          data: { response: mockResponse },
        },
      });

      const submitData: SubmitResponseInput = {
        answers: [
          { questionId: 'q1', answer: 'Answer 1' },
          { questionId: 'q2', answer: 'Answer 2' },
          { questionId: 'q3', answer: ['Option A', 'Option B'] },
        ],
      };

      const result = await responseService.submitResponse('test-link', submitData);

      expect(result.answers).toHaveLength(3);
      expect(result.answers[2].answer).toEqual(['Option A', 'Option B']);
    });
  });

  describe('getResponses', () => {
    test('отримує список відповідей на опитування', async () => {
      const mockResponses: SurveyResponse[] = [
        {
          _id: '1',
          survey: 'survey-123',
          answers: [{ questionId: 'q1', answer: 'Answer 1' }],
          submittedAt: '2024-01-01',
        },
        {
          _id: '2',
          survey: 'survey-123',
          answers: [{ questionId: 'q1', answer: 'Answer 2' }],
          submittedAt: '2024-01-02',
        },
      ];

      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: { responses: mockResponses },
        },
      });

      const result = await responseService.getResponses('survey-123');

      expect(api.get).toHaveBeenCalledWith('/api/surveys/survey-123/responses');
      expect(result).toEqual(mockResponses);
      expect(result).toHaveLength(2);
    });

    test('повертає порожній масив якщо немає відповідей', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: { responses: [] },
        },
      });

      const result = await responseService.getResponses('survey-empty');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});

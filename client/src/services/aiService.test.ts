import { describe, test, expect, vi, beforeEach } from 'vitest';
import { aiService } from './aiService';
import api from './api';

// Mock API module
vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSurvey', () => {
    test('генерує опитування через AI', async () => {
      const mockInput = {
        topic: 'Customer Satisfaction',
        numberOfQuestions: 5,
        language: 'uk',
      };

      const mockGenerated = {
        title: 'Customer Satisfaction Survey',
        description: 'Help us improve',
        questions: [
          { text: 'How satisfied are you?', type: 'rating', order: 0 },
        ],
      };

      vi.mocked(api.post).mockResolvedValue({
        data: {
          success: true,
          data: mockGenerated,
        },
      });

      const result = await aiService.generateSurvey(mockInput);

      expect(api.post).toHaveBeenCalledWith('/api/ai/generate-survey', mockInput);
      expect(result).toEqual(mockGenerated);
    });
  });

  describe('improveQuestion', () => {
    test('покращує питання', async () => {
      const original = 'Do you like our product?';
      const improved = 'How would you rate your satisfaction with our product?';

      vi.mocked(api.post).mockResolvedValue({
        data: {
          success: true,
          data: { improved, original },
        },
      });

      const result = await aiService.improveQuestion(original);

      expect(api.post).toHaveBeenCalledWith('/api/ai/improve-question', {
        question: original,
      });
      expect(result.improved).toBe(improved);
      expect(result.original).toBe(original);
    });
  });

  describe('regenerateQuestion', () => {
    test('перегенеровує питання', async () => {
      const mockQuestion = {
        text: 'New question text',
        type: 'radio',
        options: ['Option 1', 'Option 2'],
      };

      vi.mocked(api.post).mockResolvedValue({
        data: {
          success: true,
          data: { question: mockQuestion },
        },
      });

      const result = await aiService.regenerateQuestion(
        'Old question',
        'radio',
        'Customer feedback',
        [],
        []
      );

      expect(api.post).toHaveBeenCalledWith('/api/ai/regenerate-question', {
        questionText: 'Old question',
        questionType: 'radio',
        surveyTopic: 'Customer feedback',
        existingQuestions: [],
        currentOptions: [],
      });
      expect(result).toEqual(mockQuestion);
    });
  });
});

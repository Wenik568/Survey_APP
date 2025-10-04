import { describe, test, expect, vi, beforeEach } from 'vitest';
import { surveyService } from './surveyService';
import api from './api';
import type { Survey, CreateSurveyInput } from '../types';

// Mock API module
vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('surveyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSurvey: Survey = {
    _id: '1',
    title: 'Test Survey',
    description: 'Test Description',
    questions: [],
    owner: '123',
    isActive: true,
    uniqueLink: 'abc123',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  describe('getSurveys', () => {
    test('повертає список опитувань', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { surveys: [mockSurvey] },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await surveyService.getSurveys();

      expect(api.get).toHaveBeenCalledWith('/api/surveys');
      expect(result).toEqual([mockSurvey]);
    });
  });

  describe('getSurvey', () => {
    test('повертає конкретне опитування', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { survey: mockSurvey },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await surveyService.getSurvey('1');

      expect(api.get).toHaveBeenCalledWith('/api/surveys/1');
      expect(result).toEqual(mockSurvey);
    });
  });

  describe('getSurveyById', () => {
    test('викликає getSurvey (alias)', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { survey: mockSurvey },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await surveyService.getSurveyById('1');

      expect(api.get).toHaveBeenCalledWith('/api/surveys/1');
      expect(result).toEqual(mockSurvey);
    });
  });

  describe('getSurveyByLink', () => {
    test('повертає опитування за унікальним посиланням', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { survey: mockSurvey },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await surveyService.getSurveyByLink('abc123');

      expect(api.get).toHaveBeenCalledWith('/api/surveys/public/abc123');
      expect(result).toEqual(mockSurvey);
    });
  });

  describe('createSurvey', () => {
    test('створює нове опитування', async () => {
      const createData: CreateSurveyInput = {
        title: 'New Survey',
        description: 'New Description',
        questions: [],
      };

      const mockResponse = {
        data: {
          success: true,
          data: { survey: mockSurvey },
        },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await surveyService.createSurvey(createData);

      expect(api.post).toHaveBeenCalledWith('/api/surveys', createData);
      expect(result).toEqual(mockSurvey);
    });
  });

  describe('updateSurvey', () => {
    test('оновлює опитування', async () => {
      const updateData = { title: 'Updated Title' };

      const mockResponse = {
        data: {
          success: true,
          data: { survey: { ...mockSurvey, title: 'Updated Title' } },
        },
      };

      vi.mocked(api.put).mockResolvedValue(mockResponse);

      const result = await surveyService.updateSurvey('1', updateData);

      expect(api.put).toHaveBeenCalledWith('/api/surveys/1', updateData);
      expect(result.title).toBe('Updated Title');
    });
  });

  describe('deleteSurvey', () => {
    test('видаляє опитування', async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await surveyService.deleteSurvey('1');

      expect(api.delete).toHaveBeenCalledWith('/api/surveys/1');
    });
  });

  describe('toggleStatus', () => {
    test('перемикає статус опитування', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { survey: { ...mockSurvey, isActive: false } },
        },
      };

      vi.mocked(api.put).mockResolvedValue(mockResponse);

      const result = await surveyService.toggleStatus('1', false);

      expect(api.put).toHaveBeenCalledWith('/api/surveys/1', { isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  describe('getSurveyStats', () => {
    test('повертає статистику опитування', async () => {
      const mockStats = {
        totalResponses: 10,
        averageCompletionTime: 120,
        responseRate: 0.8,
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockStats,
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await surveyService.getSurveyStats('1');

      expect(api.get).toHaveBeenCalledWith('/api/surveys/1/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('getDashboardStats', () => {
    test('повертає статистику дашборду', async () => {
      const mockStats = {
        totalSurveys: 5,
        totalResponses: 50,
        activeSurveys: 3,
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockStats,
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await surveyService.getDashboardStats();

      expect(api.get).toHaveBeenCalledWith('/api/surveys/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('exportToCSV', () => {
    test('експортує дані в CSV', async () => {
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });

      vi.mocked(api.get).mockResolvedValue({ data: mockBlob });

      const result = await surveyService.exportToCSV('1');

      expect(api.get).toHaveBeenCalledWith('/api/export/csv/1', {
        responseType: 'blob',
      });
      expect(result).toEqual(mockBlob);
    });
  });

  describe('addCollaborator', () => {
    test('додає співавтора', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { collaborators: [{ email: 'collab@test.com' }] },
        },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await surveyService.addCollaborator('1', 'collab@test.com');

      expect(api.post).toHaveBeenCalledWith('/api/surveys/1/collaborators', {
        email: 'collab@test.com',
      });
      expect(result.collaborators).toHaveLength(1);
    });
  });

  describe('removeCollaborator', () => {
    test('видаляє співавтора', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { collaborators: [] },
        },
      };

      vi.mocked(api.delete).mockResolvedValue(mockResponse);

      const result = await surveyService.removeCollaborator('1', 'collab-id');

      expect(api.delete).toHaveBeenCalledWith('/api/surveys/1/collaborators/collab-id');
      expect(result.collaborators).toHaveLength(0);
    });
  });
});

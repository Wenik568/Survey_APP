import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          _id: '123',
          email: 'test@example.com',
          username: 'testuser'
        },
        accessToken: 'fake-token'
      }
    });
  }),

  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          _id: '123',
          email: 'test@example.com',
          username: 'testuser'
        },
        accessToken: 'fake-token'
      }
    });
  }),

  // Survey endpoints
  http.get('/api/surveys', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          _id: '1',
          title: 'Test Survey',
          description: 'Test Description',
          questions: [],
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ]
    });
  }),

  http.post('/api/surveys', () => {
    return HttpResponse.json({
      success: true,
      data: {
        _id: '1',
        title: 'New Survey',
        questions: [],
        isActive: true
      }
    });
  }),
];

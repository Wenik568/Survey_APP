const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Survey = require('../models/Survey');
const Response = require('../models/Response');

describe('Survey API Integration Tests', () => {
  let accessToken;
  let userId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await Survey.deleteMany({});
    await Response.deleteMany({});

    // Create and login test user
    const response = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });

    accessToken = response.body.data.accessToken;
    userId = response.body.data.user.id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Survey.deleteMany({});
    await Response.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/surveys', () => {
    test('створення нового опитування', async () => {
      const surveyData = {
        title: 'Test Survey',
        description: 'Test Description',
        questions: [
          {
            type: 'text',
            text: 'What is your name?',
            required: true,
            order: 0,
          },
          {
            type: 'rating',
            text: 'Rate our service',
            required: false,
            order: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(surveyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.survey.title).toBe(surveyData.title);
      expect(response.body.data.survey.questions).toHaveLength(2);
      expect(response.body.data.survey).toHaveProperty('uniqueLink');

      // Verify in database
      const survey = await Survey.findOne({ title: surveyData.title });
      expect(survey).toBeTruthy();
      expect(survey.creator.toString()).toBe(userId);
    });

    test('помилка без авторизації', async () => {
      await request(app)
        .post('/api/surveys')
        .send({
          title: 'Test',
          questions: [{ type: 'text', text: 'Q1', order: 0 }],
        })
        .expect(401);
    });

    test('помилка при відсутності обов\'язкових полів', async () => {
      const response = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('обов\'язкові');
    });
  });

  describe('GET /api/surveys', () => {
    beforeEach(async () => {
      // Create multiple surveys
      await Survey.create([
        {
          title: 'Survey 1',
          creator: userId,
          questions: [{ type: 'text', text: 'Q1', order: 0 }],
          uniqueLink: 'test-link-1',
        },
        {
          title: 'Survey 2',
          creator: userId,
          questions: [{ type: 'text', text: 'Q2', order: 0 }],
          uniqueLink: 'test-link-2',
        },
      ]);
    });

    test('отримання списку опитувань', async () => {
      const response = await request(app)
        .get('/api/surveys')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.surveys).toHaveLength(2);
      expect(response.body.data.surveys[0].title).toBeTruthy();
    });

    test('помилка без авторизації', async () => {
      await request(app).get('/api/surveys').expect(401);
    });
  });

  describe('GET /api/surveys/:id', () => {
    let surveyId;

    beforeEach(async () => {
      const survey = await Survey.create({
        title: 'Test Survey',
        creator: userId,
        questions: [{ type: 'text', text: 'Q1', order: 0 }],
        uniqueLink: 'test-link-get',
      });
      surveyId = survey._id.toString();
    });

    test('отримання конкретного опитування', async () => {
      const response = await request(app)
        .get(`/api/surveys/${surveyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.survey.title).toBe('Test Survey');
      expect(response.body.data.survey._id).toBe(surveyId);
    });

    test('помилка при неіснуючому ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/surveys/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/surveys/:id', () => {
    let surveyId;

    beforeEach(async () => {
      const survey = await Survey.create({
        title: 'Original Title',
        creator: userId,
        questions: [{ type: 'text', text: 'Q1', order: 0 }],
        uniqueLink: 'test-link-put',
      });
      surveyId = survey._id.toString();
    });

    test('оновлення опитування', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const response = await request(app)
        .put(`/api/surveys/${surveyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.survey.title).toBe('Updated Title');
      expect(response.body.data.survey.description).toBe('Updated Description');

      // Verify in database
      const survey = await Survey.findById(surveyId);
      expect(survey.title).toBe('Updated Title');
    });

    test('помилка при оновленні чужого опитування', async () => {
      // Create another user
      const anotherUser = await request(app).post('/api/auth/register').send({
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'password123',
      });

      await request(app)
        .put(`/api/surveys/${surveyId}`)
        .set('Authorization', `Bearer ${anotherUser.body.data.accessToken}`)
        .send({ title: 'Hacked Title' })
        .expect(403);
    });
  });

  describe('DELETE /api/surveys/:id', () => {
    let surveyId;

    beforeEach(async () => {
      const survey = await Survey.create({
        title: 'To Delete',
        creator: userId,
        questions: [{ type: 'text', text: 'Q1', order: 0 }],
        uniqueLink: 'test-link-delete',
      });
      surveyId = survey._id.toString();
    });

    test('видалення опитування', async () => {
      const response = await request(app)
        .delete(`/api/surveys/${surveyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('видалено');

      // Verify deletion
      const survey = await Survey.findById(surveyId);
      expect(survey).toBeNull();
    });

    test('помилка при видаленні чужого опитування', async () => {
      const anotherUser = await request(app).post('/api/auth/register').send({
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'password123',
      });

      await request(app)
        .delete(`/api/surveys/${surveyId}`)
        .set('Authorization', `Bearer ${anotherUser.body.data.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/surveys/stats', () => {
    beforeEach(async () => {
      // Create surveys with different states
      const survey1 = await Survey.create({
        title: 'Active Survey',
        creator: userId,
        questions: [{ type: 'text', text: 'Q1', order: 0 }],
        uniqueLink: 'test-link-active',
        isActive: true,
      });

      const survey2 = await Survey.create({
        title: 'Inactive Survey',
        creator: userId,
        questions: [{ type: 'text', text: 'Q2', order: 0 }],
        uniqueLink: 'test-link-inactive',
        isActive: false,
      });

      // Create some responses
      await Response.create({
        survey: survey1._id,
        answers: [{
          questionId: survey1.questions[0]._id,
          questionText: survey1.questions[0].text,
          questionType: survey1.questions[0].type,
          answer: 'Answer 1'
        }],
      });

      await Response.create({
        survey: survey1._id,
        answers: [{
          questionId: survey1.questions[0]._id,
          questionText: survey1.questions[0].text,
          questionType: survey1.questions[0].type,
          answer: 'Answer 2'
        }],
      });
    });

    test('отримання статистики дашборду', async () => {
      const response = await request(app)
        .get('/api/surveys/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('activeSurveys');
      expect(response.body.data).toHaveProperty('completedSurveys');
      expect(response.body.data).toHaveProperty('totalResponses');
      expect(response.body.data.totalResponses).toBe(2);
    });
  });

  describe('GET /api/surveys/:id/stats', () => {
    let surveyId;

    beforeEach(async () => {
      const survey = await Survey.create({
        title: 'Survey for Stats',
        creator: userId,
        questions: [
          {
            type: 'radio',
            text: 'Question 1',
            order: 0,
            options: [
              { text: 'A', value: 'A' },
              { text: 'B', value: 'B' },
              { text: 'C', value: 'C' }
            ]
          },
          { type: 'text', text: 'Question 2', order: 1 }
        ],
        uniqueLink: 'test-link-stats',
      });
      surveyId = survey._id.toString();

      // Create responses
      await Response.create({
        survey: surveyId,
        answers: [
          { questionId: survey.questions[0]._id, answer: 'A' },
          { questionId: survey.questions[1]._id, answer: 'Answer 1' }
        ],
      });

      await Response.create({
        survey: surveyId,
        answers: [
          { questionId: survey.questions[0]._id, answer: 'A' },
          { questionId: survey.questions[1]._id, answer: 'Answer 2' }
        ],
      });
    });

    test('отримання статистики конкретного опитування', async () => {
      const response = await request(app)
        .get(`/api/surveys/${surveyId}/stats`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalResponses).toBe(2);
      expect(response.body.data.questionStats).toHaveLength(2);
    });

    test('помилка доступу до статистики чужого опитування', async () => {
      const anotherUser = await request(app).post('/api/auth/register').send({
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'password123',
      });

      await request(app)
        .get(`/api/surveys/${surveyId}/stats`)
        .set('Authorization', `Bearer ${anotherUser.body.data.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/surveys/public/:uniqueLink', () => {
    let uniqueLink;

    beforeEach(async () => {
      const survey = await Survey.create({
        title: 'Public Survey',
        creator: userId,
        questions: [{ type: 'text', text: 'Q1', order: 0 }],
        uniqueLink: 'public-survey-link',
        isActive: true,
      });
      uniqueLink = survey.uniqueLink;
    });

    test('отримання активного опитування по публічному посиланню', async () => {
      const response = await request(app)
        .get(`/api/surveys/public/${uniqueLink}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.survey.title).toBe('Public Survey');
    });

    test('помилка при доступі до неактивного опитування', async () => {
      await Survey.findOneAndUpdate({ uniqueLink }, { isActive: false });

      const response = await request(app)
        .get(`/api/surveys/public/${uniqueLink}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('помилка при неіснуючому посиланні', async () => {
      await request(app)
        .get('/api/surveys/public/non-existent-link')
        .expect(404);
    });
  });

  describe('PUT /api/surveys/:id/toggle', () => {
    let surveyId;

    beforeEach(async () => {
      const survey = await Survey.create({
        title: 'Survey to Toggle',
        creator: userId,
        questions: [{ type: 'text', text: 'Q1', order: 0 }],
        uniqueLink: 'test-link-toggle',
        isActive: true,
      });
      surveyId = survey._id.toString();
    });

    test('перемикання статусу опитування', async () => {
      const response = await request(app)
        .put(`/api/surveys/${surveyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.survey.isActive).toBe(false);
    });
  });

  describe('POST /api/surveys/:id/collaborators', () => {
    let surveyId;
    let collaboratorEmail;

    beforeEach(async () => {
      const survey = await Survey.create({
        title: 'Survey with Collaborators',
        creator: userId,
        questions: [{ type: 'text', text: 'Q1', order: 0 }],
        uniqueLink: 'test-link-collab',
      });
      surveyId = survey._id.toString();

      // Create potential collaborator
      const collabUser = await request(app).post('/api/auth/register').send({
        username: 'collaborator',
        email: 'collab@example.com',
        password: 'password123',
      });
      collaboratorEmail = 'collab@example.com';
    });

    test('додавання співавтора до опитування', async () => {
      const response = await request(app)
        .post(`/api/surveys/${surveyId}/collaborators`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: collaboratorEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborators).toHaveLength(1);
    });

    test('помилка при додаванні неіснуючого користувача', async () => {
      const response = await request(app)
        .post(`/api/surveys/${surveyId}/collaborators`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('помилка при додаванні без email', async () => {
      const response = await request(app)
        .post(`/api/surveys/${surveyId}/collaborators`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/surveys/:id/collaborators/:collaboratorId', () => {
    let surveyId;
    let collaboratorId;

    beforeEach(async () => {
      // Create collaborator user
      const collabResponse = await request(app).post('/api/auth/register').send({
        username: 'collaborator',
        email: 'collab@example.com',
        password: 'password123',
      });
      collaboratorId = collabResponse.body.data.user.id;

      // Create survey with collaborator
      const survey = await Survey.create({
        title: 'Survey with Collaborators',
        creator: userId,
        questions: [{ type: 'text', text: 'Q1', order: 0 }],
        uniqueLink: 'test-link-remove-collab',
        collaborators: [{ user: collaboratorId, addedAt: new Date() }]
      });
      surveyId = survey._id.toString();
    });

    test('видалення співавтора', async () => {
      const response = await request(app)
        .delete(`/api/surveys/${surveyId}/collaborators/${collaboratorId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborators).toHaveLength(0);
    });
  });
});

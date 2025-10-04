const express = require('express');
const {
  createSurvey,
  getUserSurveys,
  getSurvey,
  getSurveyByLink,
  updateSurvey,
  deleteSurvey,
  getDashboardStats,
  getSingleSurveyStats,
  getAIAnalysis,
  addCollaborator,
  removeCollaborator
} = require('../controllers/surveyController');

const {
  createResponse,
  getSurveyResponses,
  exportResponses
} = require('../controllers/responseController');

const { protect } = require('../middleware/auth');

const router = express.Router();

// ========== МАРШРУТИ ДЛЯ ОПИТУВАНЬ ==========

// Отримання статистики для дашборду (захищено)
router.get('/stats', protect, getDashboardStats);

// Створення нового опитування (захищено)
router.post('/', protect, createSurvey);

// Отримання всіх опитувань користувача (захищено)
router.get('/', protect, getUserSurveys);

// Отримання конкретного опитування (захищено)
router.get('/:id', protect, getSurvey);

// Оновлення опитування (захищено)
router.put('/:id', protect, updateSurvey);

// Видалення опитування (захищено)
router.delete('/:id', protect, deleteSurvey);

// Отримання статистики опитування (захищено)
router.get('/:id/stats', protect, getSingleSurveyStats);

// AI аналіз відповідей опитування (захищено)
router.get('/:id/ai-analysis', protect, getAIAnalysis);

// AI чат про результати опитування (захищено)
router.post('/:id/ai-chat', protect, require('../controllers/surveyController').aiChatResponse);

// ========== МАРШРУТИ ДЛЯ СПІВАВТОРІВ ==========

// Додати співавтора (захищено)
router.post('/:id/collaborators', protect, addCollaborator);

// Видалити співавтора (захищено)
router.delete('/:id/collaborators/:collaboratorId', protect, removeCollaborator);

// ========== МАРШРУТИ ДЛЯ ВІДПОВІДЕЙ ==========

// Отримання всіх відповідей на опитування (захищено)
router.get('/:surveyId/responses', protect, getSurveyResponses);

// Експорт відповідей у CSV (захищено)
router.get('/:surveyId/export', protect, exportResponses);

// ========== ПУБЛІЧНІ МАРШРУТИ ==========

// Отримання опитування по унікальному посиланню (публічно)
router.get('/public/:uniqueLink', getSurveyByLink);

// Створення відповіді на опитування (публічно)
router.post('/public/:uniqueLink/response', createResponse);

module.exports = router;
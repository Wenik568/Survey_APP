const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  generateSurvey,
  improveQuestion,
  generateAdditionalQuestions,
  regenerateQuestion,
  analyzeSurvey
} = require('../controllers/aiController');

// Всі маршрути вимагають аутентифікації
router.use(protect);

// POST /api/ai/generate-survey - Генерація повного опитування
router.post('/generate-survey', generateSurvey);

// POST /api/ai/improve-question - Покращення питання
router.post('/improve-question', improveQuestion);

// POST /api/ai/generate-questions - Генерація додаткових питань
router.post('/generate-questions', generateAdditionalQuestions);

// POST /api/ai/regenerate-question - Regenerate окреме питання
router.post('/regenerate-question', regenerateQuestion);

// POST /api/ai/analyze-survey - Аналіз якості опитування
router.post('/analyze-survey', analyzeSurvey);

module.exports = router;
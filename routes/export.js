const express = require('express');
const { protect } = require('../middleware/auth');
const { exportSurveyToCSV } = require('../controllers/exportController');

const router = express.Router();

// Експорт опитування в CSV
router.get('/:surveyId/export', protect, exportSurveyToCSV);

module.exports = router;

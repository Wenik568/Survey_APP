const mongoose = require('mongoose');

// Схема для окремої відповіді на питання
const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  questionText: String, // Копія тексту питання для історії
  questionType: String,
  answer: mongoose.Schema.Types.Mixed // Може бути рядком, масивом рядків, тощо
});

// Основна схема відповіді
const responseSchema = new mongoose.Schema({
  survey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
    required: true
  },
  
  answers: [answerSchema],
  
  // Інформація про респондента (анонімна)
  respondentInfo: {
    ipAddress: String,
    userAgent: String,
    sessionId: String
  },
  
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  isComplete: {
    type: Boolean,
    default: true
  }
});

// Індекс для запобігання повторним відповідям
responseSchema.index({ survey: 1, 'respondentInfo.ipAddress': 1 });

module.exports = mongoose.model('Response', responseSchema);
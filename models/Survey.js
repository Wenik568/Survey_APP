const mongoose = require('mongoose');

// Схема для питання
const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Текст питання обов\'язковий'],
    trim: true
  },
  type: {
    type: String,
    enum: ['radio', 'checkbox', 'text', 'textarea', 'rating'],
    required: [true, 'Тип питання обов\'язковий']
  },
  options: [{
    text: String,
    value: String
  }],
  required: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    required: true
  },
  // Skip Logic - умовна логіка
  skipLogic: {
    enabled: {
      type: Boolean,
      default: false
    },
    condition: {
      questionId: {
        type: String  // ID питання на яке дивимось (після конвертації)
      },
      questionIndex: {
        type: Number  // Індекс питання (тимчасово, для конвертації в questionId)
      },
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'not_contains', 'is_answered'],
        default: 'equals'
      },
      value: mongoose.Schema.Types.Mixed  // Очікуване значення (String/Number/Array)
    }
  }
});

// Основна схема опитування
const surveySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Назва опитування обов\'язкова'],
    trim: true,
    maxlength: [200, 'Назва не може бути довшою за 200 символів']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Опис не може бути довшим за 1000 символів']
  },
  questions: [questionSchema],
  
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  uniqueLink: {
    type: String,
    unique: true,
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  closingDate: {
    type: Date
  },
  
  allowMultipleResponses: {
    type: Boolean,
    default: false
  },

  participantLimit: {
    type: Number,
    default: null, // null означає необмежено
    min: [1, 'Мінімальна кількість учасників - 1']
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Автоматичне оновлення дати модифікації
surveySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Генерація унікального посилання
surveySchema.methods.generateUniqueLink = function() {
  const randomString = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
  this.uniqueLink = randomString;
  return this.uniqueLink;
};

module.exports = mongoose.model('Survey', surveySchema);
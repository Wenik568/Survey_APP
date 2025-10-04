const aiService = require('../config/aiService');

/**
 * Генерація опитування за допомогою AI
 */
const generateSurvey = async (req, res) => {
  try {
    const { topic, goal, questionCount, questionTypes, additionalInstructions } = req.body;

    // Валідація вхідних даних
    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Тема опитування обов\'язкова'
      });
    }

    if (questionCount && (questionCount < 3 || questionCount > 20)) {
      return res.status(400).json({
        success: false,
        message: 'Кількість питань повинна бути від 3 до 20'
      });
    }

    // Генерація опитування
    const surveyData = await aiService.generateSurvey({
      topic: topic.trim(),
      goal: goal || 'збір відгуків',
      questionCount: questionCount || 7,
      questionTypes: questionTypes || ['radio', 'checkbox', 'text'],
      additionalInstructions: additionalInstructions ? additionalInstructions.trim() : undefined
    });

    res.status(200).json({
      success: true,
      data: surveyData,
      message: 'Опитування успішно згенеровано'
    });

  } catch (error) {
    console.error('❌ Помилка генерації опитування:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при генерації опитування',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Покращення окремого питання
 */
const improveQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Текст питання обов\'язковий'
      });
    }

    const result = await aiService.improveQuestion(question.trim());

    res.status(200).json({
      success: true,
      data: result,
      message: 'Питання покращено'
    });

  } catch (error) {
    console.error('❌ Помилка покращення питання:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при покращенні питання',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Генерація додаткових питань для існуючого опитування
 */
const generateAdditionalQuestions = async (req, res) => {
  try {
    const { topic, existingQuestions, count, questionTypes } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Тема опитування обов\'язкова'
      });
    }

    // Генеруємо нове опитування і беремо з нього потрібну кількість питань
    const surveyData = await aiService.generateSurvey({
      topic,
      goal: 'доповнення опитування',
      questionCount: count || 3,
      questionTypes: questionTypes || ['radio', 'text']
    });

    // Фільтруємо питання, щоб не дублювати існуючі
    const existingTexts = (existingQuestions || []).map(q => q.text.toLowerCase());
    const newQuestions = surveyData.questions.filter(q =>
      !existingTexts.includes(q.text.toLowerCase())
    );

    res.status(200).json({
      success: true,
      data: {
        questions: newQuestions.slice(0, count || 3)
      },
      message: 'Додаткові питання згенеровано'
    });

  } catch (error) {
    console.error('❌ Помилка генерації додаткових питань:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при генерації додаткових питань',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Regenerate окреме питання
 */
const regenerateQuestion = async (req, res) => {
  try {
    const { questionText, questionType, surveyTopic, existingQuestions, currentOptions } = req.body;

    if (!questionText || !questionType) {
      return res.status(400).json({
        success: false,
        message: 'Текст питання та тип обов\'язкові'
      });
    }

    // Формування інструкцій з урахуванням існуючих варіантів
    let additionalInstructions = surveyTopic
      ? `Контекст опитування: ${surveyTopic}. Створи покращений варіант питання "${questionText}", який буде про те саме, але сформульований інакше.`
      : `Створи покращений альтернативний варіант питання "${questionText}".`;

    // Якщо є існуючі опції для radio/checkbox, враховуємо їх
    if ((questionType === 'radio' || questionType === 'checkbox') && currentOptions && currentOptions.length > 0) {
      const optionsText = currentOptions
        .map(opt => typeof opt === 'string' ? opt : opt.text || opt.value)
        .join(', ');
      additionalInstructions += `\n\nІСНУЮЧІ ВАРІАНТИ ВІДПОВІДЕЙ: ${optionsText}.\nСтвори покращені та розширені варіанти відповідей на основі існуючих, збережи їх суть але зроби більш чіткими та професійними. Додай 1-2 додаткові релевантні варіанти якщо потрібно.`;
    }

    // Генеруємо нове питання того ж типу, використовуючи текст поточного питання як тему
    const surveyData = await aiService.generateSurvey({
      topic: questionText,
      goal: `створити покращене альтернативне питання типу ${questionType} на цю ж тему`,
      questionCount: 3,
      questionTypes: [questionType],
      additionalInstructions
    });

    // Вибираємо перше питання потрібного типу, яке відрізняється від поточного
    const existingTexts = (existingQuestions || []).map(q => q.text.toLowerCase());
    const newQuestion = surveyData.questions.find(q =>
      q.type === questionType &&
      !existingTexts.includes(q.text.toLowerCase())
    ) || surveyData.questions.find(q => q.type === questionType);

    res.status(200).json({
      success: true,
      data: {
        question: newQuestion || surveyData.questions[0]
      },
      message: 'Питання перегенеровано'
    });

  } catch (error) {
    console.error('❌ Помилка regenerate питання:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при regenerate питання',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Аналіз якості опитування
 */
const analyzeSurvey = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Питання обов\'язкові для аналізу'
      });
    }

    // Базовий аналіз якості
    const analysis = {
      totalQuestions: questions.length,
      estimatedTime: Math.ceil(questions.length * 0.5), // 30 секунд на питання
      questionTypes: {},
      hasRequiredQuestions: questions.some(q => q.required),
      recommendations: []
    };

    // Підрахунок типів питань
    questions.forEach(q => {
      analysis.questionTypes[q.type] = (analysis.questionTypes[q.type] || 0) + 1;
    });

    // Рекомендації
    if (questions.length < 5) {
      analysis.recommendations.push('Розгляньте можливість додати більше питань для детальнішого зворотного зв\'язку');
    }
    if (questions.length > 15) {
      analysis.recommendations.push('Опитування може бути занадто довгим. Розгляньте можливість скоротити кількість питань');
    }
    if (!analysis.questionTypes.text && !analysis.questionTypes.textarea) {
      analysis.recommendations.push('Додайте відкриті питання для отримання детальніших відгуків');
    }
    if (questions.filter(q => q.required).length > questions.length * 0.7) {
      analysis.recommendations.push('Забагато обов\'язкових питань може знизити completion rate');
    }

    res.status(200).json({
      success: true,
      data: analysis,
      message: 'Аналіз опитування завершено'
    });

  } catch (error) {
    console.error('❌ Помилка аналізу опитування:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при аналізі опитування',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  generateSurvey,
  improveQuestion,
  generateAdditionalQuestions,
  regenerateQuestion,
  analyzeSurvey
};
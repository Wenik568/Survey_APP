const Survey = require('../models/Survey');
const Response = require('../models/Response');
const aiService = require('../config/aiService');
const { hasAccess, isOwner } = require('../utils/surveyHelpers');

// Отримання загальної статистики опитувань для дашборду
const getDashboardStats = async (req, res) => {
  try {
    // Отримуємо активні опитування (ті, що не закриті)
    const activeSurveys = await Survey.countDocuments({
      creator: req.user.id,
      isActive: true,
      $or: [
        { closingDate: { $gt: new Date() } },
        { closingDate: null }
      ]
    });

    // Отримуємо завершені опитування
    const completedSurveys = await Survey.countDocuments({
      creator: req.user.id,
      $or: [
        { isActive: false },
        { closingDate: { $lte: new Date() } }
      ]
    });

    // Отримуємо загальну кількість відповідей на всі опитування користувача
    const surveys = await Survey.find({ creator: req.user.id });
    const surveyIds = surveys.map(survey => survey._id);
    const totalResponses = await Response.countDocuments({
      survey: { $in: surveyIds }
    });

    res.json({
      success: true,
      data: {
        activeSurveys,
        completedSurveys,
        totalResponses
      }
    });

  } catch (error) {
    console.error('Помилка отримання статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Створення нового опитування
const createSurvey = async (req, res) => {
  try {
    const { title, description, questions, closingDate, allowMultipleResponses, participantLimit, collaboratorEmails } = req.body;

    // Перевірка обов'язкових полів
    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Назва опитування та питання обов\'язкові'
      });
    }

    // Створення опитування
    const survey = new Survey({
      title,
      description,
      questions,
      creator: req.user.id,
      closingDate: closingDate ? new Date(closingDate) : null,
      allowMultipleResponses: allowMultipleResponses || false,
      participantLimit: participantLimit || null
    });

    // Додавання співавторів якщо є
    if (collaboratorEmails && Array.isArray(collaboratorEmails) && collaboratorEmails.length > 0) {
      const User = require('../models/User');

      for (const email of collaboratorEmails) {
        const collaborator = await User.findOne({ email: email.toLowerCase() });

        if (collaborator && collaborator._id.toString() !== req.user.id) {
          // Перевіряємо чи не доданий вже
          const alreadyAdded = survey.collaborators.some(
            c => (c.user._id ? c.user._id.toString() : c.user.toString()) === collaborator._id.toString()
          );

          if (!alreadyAdded) {
            survey.collaborators.push({
              user: collaborator._id,
              addedAt: new Date()
            });
          }
        }
      }
    }

    // Генерація унікального посилання
    survey.generateUniqueLink();

    await survey.save();

    // Конвертуємо questionIndex → questionId для skip logic
    if (survey.questions && survey.questions.length > 0) {
      let needsUpdate = false;
      survey.questions.forEach((question, index) => {
        console.log(`📝 Питання ${index}: "${question.text}"`, {
          hasSkipLogic: !!question.skipLogic,
          enabled: question.skipLogic?.enabled,
          hasCondition: !!question.skipLogic?.condition,
          questionIndex: question.skipLogic?.condition?.questionIndex,
          questionId: question.skipLogic?.condition?.questionId
        });

        if (question.skipLogic?.enabled && question.skipLogic.condition?.questionIndex !== undefined) {
          const sourceQuestion = survey.questions[question.skipLogic.condition.questionIndex];
          console.log(`🔄 Конвертую questionIndex ${question.skipLogic.condition.questionIndex} → questionId`);
          if (sourceQuestion) {
            question.skipLogic.condition.questionId = sourceQuestion._id.toString();
            delete question.skipLogic.condition.questionIndex;
            console.log(`✅ Встановлено questionId: ${question.skipLogic.condition.questionId}`);
            needsUpdate = true;
          } else {
            console.log(`❌ Не знайдено sourceQuestion за індексом ${question.skipLogic.condition.questionIndex}`);
          }
        }
      });

      if (needsUpdate) {
        console.log(`💾 Зберігаю опитування з оновленими questionId`);
        await survey.save();
      } else {
        console.log(`ℹ️ Не потрібно оновлювати skip logic`);
      }
    }

    // Популяція даних про автора
    await survey.populate('creator', 'username email');

    res.status(201).json({
      success: true,
      message: 'Опитування успішно створено',
      data: {
        survey,
        surveyLink: `${req.protocol}://${req.get('host')}/survey/${survey.uniqueLink}`
      }
    });

  } catch (error) {
    console.error('Помилка створення опитування:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Отримання всіх опитувань користувача
const getUserSurveys = async (req, res) => {
  try {
    // Отримати опитування де користувач - власник або співавтор
    const surveys = await Survey.find({
      $or: [
        { creator: req.user.id },
        { 'collaborators.user': req.user.id }
      ]
    })
      .populate('creator', 'username email')
      .populate('collaborators.user', 'username email name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: surveys.length,
      data: { surveys }
    });

  } catch (error) {
    console.error('Помилка отримання опитувань:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Отримання конкретного опитування
const getSurvey = async (req, res) => {
  try {
    const { id } = req.params;
    
    const survey = await Survey.findById(id)
      .populate('creator', 'username email')
      .populate('collaborators.user', 'username email name');

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Опитування не знайдено'
      });
    }

    // Перевірка прав доступу (власник або співавтор)
    if (!hasAccess(survey, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Немає прав доступу до цього опитування'
      });
    }

    res.json({
      success: true,
      data: { survey }
    });

  } catch (error) {
    console.error('Помилка отримання опитування:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Отримання опитування для респондента (по унікальному посиланню)
const getSurveyByLink = async (req, res) => {
  try {
    const { uniqueLink } = req.params;
    
    const survey = await Survey.findOne({ 
      uniqueLink,
      isActive: true 
    }).populate('creator', 'username');

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Опитування не знайдено або неактивне'
      });
    }

    // Перевірка дати закриття
    if (survey.closingDate && new Date() > survey.closingDate) {
      return res.status(400).json({
        success: false,
        message: 'Опитування закрито'
      });
    }

    res.json({
      success: true,
      data: { survey }
    });

  } catch (error) {
    console.error('Помилка отримання опитування по посиланню:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Оновлення опитування
const updateSurvey = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, questions, closingDate, isActive, allowMultipleResponses, participantLimit } = req.body;

    const survey = await Survey.findById(id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Опитування не знайдено'
      });
    }

    // Перевірка прав доступу (власник або співавтор)
    if (!hasAccess(survey, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Немає прав доступу до цього опитування'
      });
    }

    // Оновлення полів
    if (title) survey.title = title;
    if (description !== undefined) survey.description = description;
    if (questions) survey.questions = questions;
    if (closingDate) survey.closingDate = new Date(closingDate);
    if (isActive !== undefined) survey.isActive = isActive;
    if (allowMultipleResponses !== undefined) survey.allowMultipleResponses = allowMultipleResponses;
    if (participantLimit !== undefined) survey.participantLimit = participantLimit;

    await survey.save();

    // Конвертуємо questionIndex → questionId для skip logic (як при створенні)
    if (survey.questions && survey.questions.length > 0) {
      let needsUpdate = false;
      survey.questions.forEach((question) => {
        if (question.skipLogic?.enabled && question.skipLogic.condition?.questionIndex !== undefined) {
          const sourceQuestion = survey.questions[question.skipLogic.condition.questionIndex];
          if (sourceQuestion) {
            question.skipLogic.condition.questionId = sourceQuestion._id.toString();
            delete question.skipLogic.condition.questionIndex;
            needsUpdate = true;
          }
        }
      });

      if (needsUpdate) {
        await survey.save();
      }
    }

    await survey.populate('creator', 'username email');

    res.json({
      success: true,
      message: 'Опитування оновлено',
      data: { survey }
    });

  } catch (error) {
    console.error('Помилка оновлення опитування:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Видалення опитування
const deleteSurvey = async (req, res) => {
  try {
    const { id } = req.params;

    const survey = await Survey.findById(id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Опитування не знайдено'
      });
    }

    // Перевірка прав доступу (тільки власник може видаляти)
    if (survey.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Тільки власник може видалити опитування'
      });
    }

    await Survey.findByIdAndDelete(id);

    // Видалення пов'язаних відповідей
    await Response.deleteMany({ survey: id });

    res.json({
      success: true,
      message: 'Опитування видалено'
    });

  } catch (error) {
    console.error('Помилка видалення опитування:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Отримання статистики конкретного опитування
const getSingleSurveyStats = async (req, res) => {
  try {
    const { id } = req.params;

    const survey = await Survey.findById(id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Опитування не знайдено'
      });
    }

    // Перевірка прав доступу (власник або співавтор)
    if (!hasAccess(survey, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Немає прав доступу до цього опитування'
      });
    }

    // Отримання всіх відповідей
    const responses = await Response.find({ survey: id });

    // Підрахунок статистики
    const stats = {
      totalResponses: responses.length,
      questionStats: []
    };

    // Статистика по кожному питанню
    survey.questions.forEach((question, questionIndex) => {
      const questionStats = {
        questionId: question._id,
        text: question.text,
        type: question.type,
        totalAnswers: 0,
        answers: {}
      };

      responses.forEach(response => {
        const answer = response.answers.find(a => 
          a.questionId.toString() === question._id.toString()
        );

        if (answer) {
          questionStats.totalAnswers++;
          
          if (question.type === 'checkbox') {
            // Для множинного вибору
            if (Array.isArray(answer.answer)) {
              answer.answer.forEach(val => {
                questionStats.answers[val] = (questionStats.answers[val] || 0) + 1;
              });
            }
          } else {
            // Для одинарного вибору і тексту
            const answerValue = answer.answer;
            questionStats.answers[answerValue] = (questionStats.answers[answerValue] || 0) + 1;
          }
        }
      });

      stats.questionStats.push(questionStats);
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Помилка отримання статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// AI аналіз відповідей опитування
const getAIAnalysis = async (req, res) => {
  try {
    const surveyId = req.params.id;

    // Перевірка наявності опитування
    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Опитування не знайдено'
      });
    }

    // Перевірка прав доступу
    if (survey.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Немає прав для перегляду цього опитування'
      });
    }

    // Отримання всіх відповідей
    const responses = await Response.find({ survey: surveyId });

    if (responses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Недостатньо відповідей для аналізу. Потрібно мінімум 1 відповідь.'
      });
    }

    // Підготовка статистики питань (використовуємо існуючу логіку)
    const questionStats = survey.questions.map(question => {
      const questionAnswers = {};

      responses.forEach(response => {
        const answer = response.answers.find(a => a.questionId.toString() === question._id.toString());
        if (answer && answer.answer) {
          if (Array.isArray(answer.answer)) {
            // Для checkbox
            answer.answer.forEach(val => {
              questionAnswers[val] = (questionAnswers[val] || 0) + 1;
            });
          } else {
            // Для radio, text, textarea
            const answerValue = answer.answer.toString();
            questionAnswers[answerValue] = (questionAnswers[answerValue] || 0) + 1;
          }
        }
      });

      return {
        text: question.text,
        type: question.type,
        answers: questionAnswers
      };
    });

    // Підготовка даних для AI
    const surveyData = {
      title: survey.title,
      createdAt: survey.createdAt,
      responses: responses,
      questionStats: questionStats
    };

    // Виклик AI аналізу
    console.log('🤖 Запуск AI аналізу для опитування:', survey.title);
    const analysisResult = await aiService.analyzeResponses(surveyData);

    res.json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    console.error('❌ Помилка AI аналізу:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Помилка при виконанні AI аналізу'
    });
  }
};

// AI чат про результати опитування
const aiChatResponse = async (req, res) => {
  try {
    const surveyId = req.params.id;
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Повідомлення не може бути порожнім'
      });
    }

    // Перевірка наявності опитування
    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Опитування не знайдено'
      });
    }

    // Перевірка прав доступу
    if (survey.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Немає прав для перегляду цього опитування'
      });
    }

    // Отримання всіх відповідей
    const responses = await Response.find({ survey: surveyId });

    // Підготовка статистики питань
    const questionStats = survey.questions.map(question => {
      const questionAnswers = {};

      responses.forEach(response => {
        const answer = response.answers.find(a => a.questionId.toString() === question._id.toString());
        if (answer && answer.answer) {
          if (Array.isArray(answer.answer)) {
            answer.answer.forEach(val => {
              questionAnswers[val] = (questionAnswers[val] || 0) + 1;
            });
          } else {
            const answerValue = answer.answer.toString();
            questionAnswers[answerValue] = (questionAnswers[answerValue] || 0) + 1;
          }
        }
      });

      return {
        text: question.text,
        type: question.type,
        answers: questionAnswers
      };
    });

    // Підготовка контексту для AI
    const surveyContext = {
      title: survey.title,
      totalResponses: responses.length,
      questionStats: questionStats
    };

    // Виклик AI чату
    console.log('💬 AI Chat запит:', message);
    const chatResponse = await aiService.chatAboutSurvey(surveyContext, message, history || []);

    res.json({
      success: true,
      data: {
        response: chatResponse
      }
    });

  } catch (error) {
    console.error('❌ Помилка AI чату:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Помилка при обробці повідомлення'
    });
  }
};

// Додати співавтора до опитування
const addCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email обов\'язковий'
      });
    }

    const survey = await Survey.findById(id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Опитування не знайдено'
      });
    }

    // Перевірка що тільки власник може додавати співавторів
    const creatorId = survey.creator._id ? survey.creator._id.toString() : survey.creator.toString();
    if (creatorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Тільки власник може додавати співавторів'
      });
    }

    // Знайти користувача за email
    const User = require('../models/User');
    const collaborator = await User.findOne({ email: email.toLowerCase() });

    if (!collaborator) {
      return res.status(404).json({
        success: false,
        message: 'Користувач з таким email не знайдений'
      });
    }

    // Перевірка що не додає себе
    if (collaborator._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Ви не можете додати себе як співавтора'
      });
    }

    // Перевірка чи вже є співавтором
    const isAlreadyCollaborator = survey.collaborators.some(
      (c) => c.user.toString() === collaborator._id.toString()
    );

    if (isAlreadyCollaborator) {
      return res.status(400).json({
        success: false,
        message: 'Цей користувач вже є співавтором'
      });
    }

    // Додати співавтора
    survey.collaborators.push({
      user: collaborator._id,
      addedAt: new Date()
    });

    await survey.save();
    await survey.populate('collaborators.user', 'email username name');

    res.json({
      success: true,
      message: 'Співавтора успішно додано',
      data: { collaborators: survey.collaborators }
    });

  } catch (error) {
    console.error('Помилка додавання співавтора:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Видалити співавтора
const removeCollaborator = async (req, res) => {
  try {
    const { id, collaboratorId } = req.params;

    const survey = await Survey.findById(id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Опитування не знайдено'
      });
    }

    // Перевірка що тільки власник може видаляти співавторів
    const creatorId = survey.creator._id ? survey.creator._id.toString() : survey.creator.toString();
    if (creatorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Тільки власник може видаляти співавторів'
      });
    }

    // Видалити співавтора
    survey.collaborators = survey.collaborators.filter(
      (c) => c.user.toString() !== collaboratorId
    );

    await survey.save();
    await survey.populate('collaborators.user', 'email username name');

    res.json({
      success: true,
      message: 'Співавтора видалено',
      data: { collaborators: survey.collaborators }
    });

  } catch (error) {
    console.error('Помилка видалення співавтора:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

module.exports = {
  createSurvey,
  getUserSurveys,
  getSurvey,
  getSurveyByLink,
  updateSurvey,
  deleteSurvey,
  getDashboardStats,
  getSingleSurveyStats,
  getAIAnalysis,
  aiChatResponse,
  addCollaborator,
  removeCollaborator
};
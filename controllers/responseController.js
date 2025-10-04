const Response = require('../models/Response');
const Survey = require('../models/Survey');
const { hasAccess } = require('../utils/surveyHelpers');

// Створення відповіді на опитування
const createResponse = async (req, res) => {
  try {
    const { uniqueLink } = req.params;
    const { answers } = req.body;

    // Перевірка обов'язкових полів
    if (!answers || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Відповіді обов\'язкові'
      });
    }

    // Пошук опитування за унікальним посиланням
    const survey = await Survey.findOne({ uniqueLink });

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Опитування не знайдено'
      });
    }

    // Перевірка активності опитування
    if (!survey.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Опитування неактивне'
      });
    }

    // Перевірка дати закриття
    if (survey.closingDate && new Date() > survey.closingDate) {
      return res.status(400).json({
        success: false,
        message: 'Термін опитування закінчився'
      });
    }

    // Отримання IP та User Agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const sessionId = req.sessionID || `${ipAddress}-${Date.now()}`;

    // Перевірка на повторні відповіді (якщо не дозволено)
    if (!survey.allowMultipleResponses) {
      const existingResponse = await Response.findOne({
        survey: survey._id,
        'respondentInfo.ipAddress': ipAddress
      });

      if (existingResponse) {
        return res.status(400).json({
          success: false,
          message: 'Ви вже відповідали на це опитування'
        });
      }
    }

    // Функція перевірки видимості питання з Skip Logic
    const isQuestionVisible = (question, answersMap) => {
      if (!question.skipLogic || !question.skipLogic.enabled || !question.skipLogic.condition) {
        return true; // Немає skip logic - завжди видиме
      }

      const condition = question.skipLogic.condition;

      console.log(`🔍 Skip Logic для "${question.text}":`, JSON.stringify({
        conditionQuestionId: condition.questionId,
        operator: condition.operator,
        expectedValue: condition.value,
        answersMapKeys: Object.keys(answersMap)
      }, null, 2));

      const sourceQuestion = survey.questions.find(q => q._id.toString() === condition.questionId);

      if (!sourceQuestion) {
        console.log(`⚠️ Питання-джерело не знайдено для ID: ${condition.questionId}`);
        return true; // Якщо питання-джерело не знайдено, показуємо
      }

      const sourceAnswer = answersMap[condition.questionId];

      console.log(`📊 Порівняння:`, {
        sourceAnswer,
        expectedValue: condition.value,
        operator: condition.operator,
        match: sourceAnswer === condition.value
      });

      let result;
      switch (condition.operator) {
        case 'equals':
          // Не показуємо якщо ще не відповіли
          if (!sourceAnswer && sourceAnswer !== 0) {
            result = false;
          } else if (typeof sourceAnswer === 'number' || typeof condition.value === 'number') {
            result = Number(sourceAnswer) === Number(condition.value);
          } else {
            result = sourceAnswer === condition.value;
          }
          break;
        case 'not_equals':
          // Не показуємо якщо ще не відповіли
          if (!sourceAnswer && sourceAnswer !== 0) {
            result = false;
          } else if (typeof sourceAnswer === 'number' || typeof condition.value === 'number') {
            result = Number(sourceAnswer) !== Number(condition.value);
          } else {
            result = sourceAnswer !== condition.value;
          }
          break;
        case 'contains':
          // Для checkbox - перевіряємо чи масив містить значення
          result = Array.isArray(sourceAnswer) && sourceAnswer.includes(condition.value);
          break;
        case 'not_contains':
          // Для checkbox - показуємо якщо НЕ містить або не відповіли
          if (Array.isArray(sourceAnswer)) {
            result = !sourceAnswer.includes(condition.value);
          } else {
            // Якщо не масив (не checkbox) - вважаємо що не містить
            result = true;
          }
          break;
        case 'is_answered':
          // Показуємо якщо є будь-яка відповідь
          if (Array.isArray(sourceAnswer)) {
            result = sourceAnswer.length > 0;
          } else {
            result = sourceAnswer !== '' && sourceAnswer !== undefined && sourceAnswer !== null;
          }
          break;
        default:
          result = true;
      }

      console.log(`✅ Результат видимості: ${result}`);
      return result;
    };

    // Створюємо Map відповідей для швидкого доступу
    const answersMap = {};
    answers.forEach(a => {
      answersMap[a.questionId] = a.answer;
    });

    // Валідація відповідей
    const processedAnswers = [];

    // Перевірка обов'язкових питань (тільки видимих)
    for (const question of survey.questions) {
      const isVisible = isQuestionVisible(question, answersMap);

      console.log(`📋 Перевірка: "${question.text}" - required: ${question.required}, visible: ${isVisible}`);

      if (question.required && isVisible) {
        const answer = answers.find(a => a.questionId === question._id.toString());

        if (!answer || !answer.answer || (Array.isArray(answer.answer) && answer.answer.length === 0)) {
          console.log(`❌ Відсутня відповідь на обов'язкове питання: "${question.text}"`);
          return res.status(400).json({
            success: false,
            message: `Питання "${question.text}" є обов'язковим`
          });
        }
      }
    }

    // Обробка кожної відповіді
    for (const answer of answers) {
      const question = survey.questions.find(q => q._id.toString() === answer.questionId);
      
      if (!question) {
        continue; // Пропустити невідомі питання
      }

      const processedAnswer = {
        questionId: answer.questionId,
        questionText: question.text,
        questionType: question.type,
        answer: answer.answer
      };

      // Валідація типу відповіді
      if (question.type === 'radio' && Array.isArray(answer.answer)) {
        return res.status(400).json({
          success: false,
          message: `Питання "${question.text}" дозволяє лише одну відповідь`
        });
      }

      if (question.type === 'checkbox' && !Array.isArray(answer.answer)) {
        processedAnswer.answer = [answer.answer];
      }

      processedAnswers.push(processedAnswer);
    }

    // Створення відповіді
    const response = new Response({
      survey: survey._id,
      answers: processedAnswers,
      respondentInfo: {
        ipAddress,
        userAgent,
        sessionId
      }
    });

    await response.save();

    // Перевірка на досягнення ліміту учасників
    if (survey.participantLimit) {
      const totalResponses = await Response.countDocuments({ survey: survey._id });

      if (totalResponses >= survey.participantLimit) {
        survey.isActive = false;
        await survey.save();
        console.log(`🔒 Опитування "${survey.title}" автоматично закрито. Досягнуто ліміт: ${survey.participantLimit} учасників`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Дякуємо за участь в опитуванні!',
      data: {
        responseId: response._id,
        submittedAt: response.submittedAt
      }
    });

  } catch (error) {
    console.error('Помилка створення відповіді:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Отримання всіх відповідей для опитування (тільки для автора)
const getSurveyResponses = async (req, res) => {
  try {
    const { surveyId } = req.params;

    // Перевірка прав доступу до опитування
    const survey = await Survey.findById(surveyId);
    
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

    // Отримання відповідей
    const responses = await Response.find({ survey: surveyId })
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      count: responses.length,
      data: {
        survey: {
          id: survey._id,
          title: survey.title,
          questions: survey.questions
        },
        responses
      }
    });

  } catch (error) {
    console.error('Помилка отримання відповідей:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Експорт відповідей у CSV форматі
const exportResponses = async (req, res) => {
  try {
    const { surveyId } = req.params;

    // Отримання опитування
    const survey = await Survey.findById(surveyId);

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

    // Отримання відповідей
    const responses = await Response.find({ survey: surveyId })
      .sort({ submittedAt: -1 });

    if (responses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Немає відповідей для експорту'
      });
    }

    // Формування CSV з BOM для правильного відображення в Excel
    let csvContent = '\uFEFF'; // Додаємо BOM для підтримки Unicode в Excel
    
    // Заголовки (A1, B1, C1, D1, ...)
    const headers = [];
    headers[0] = 'Користувач';
    headers[1] = 'Дата проходження';
    survey.questions.forEach((question, index) => {
      headers[index + 2] = `Питання ${index + 1}`;
    });
    csvContent += headers.join(';') + '\r\n'; // Використовуємо ; як роздільник для Excel

    // Дані (A2, B2, C2, D2, ...)
    responses.forEach(response => {
      const row = [];
      row[0] = response.respondentInfo.ipAddress || 'Анонім';
      row[1] = new Date(response.submittedAt).toLocaleDateString('uk-UA');

      // Додаємо відповіді починаючи з колонки C (індекс 2)
      survey.questions.forEach((question, index) => {
        const answer = response.answers.find(a => 
          a.questionId.toString() === question._id.toString()
        );

        if (answer) {
          if (Array.isArray(answer.answer)) {
            row[index + 2] = `"${answer.answer.join('; ')}"`;
          } else {
            row[index + 2] = `"${answer.answer || ''}"`;
          }
        } else {
          row[index + 2] = '""';
        }
      });

      csvContent += row.join(';') + '\r\n';
    });

    // Встановлення заголовків для завантаження файлу
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="survey_${surveyId}_responses.csv"`);

    res.send(csvContent); // BOM вже додано на початку файлу

  } catch (error) {
    console.error('Помилка експорту відповідей:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

module.exports = {
  createResponse,
  getSurveyResponses,
  exportResponses
};
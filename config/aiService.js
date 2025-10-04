const { HfInference } = require('@huggingface/inference');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * AI Service для генерації опитувань
 * Підтримує декілька провайдерів з fallback механізмом
 */
class AIService {
  constructor() {
    console.log('🔧 Ініціалізація AI Service...');
    console.log('📌 GOOGLE_AI_API_KEY exists:', !!process.env.GOOGLE_AI_API_KEY);
    console.log('📌 HUGGINGFACE_API_KEY exists:', !!process.env.HUGGINGFACE_API_KEY);

    // Ініціалізація Hugging Face (безкоштовний tier)
    this.hf = process.env.HUGGINGFACE_API_KEY
      ? new HfInference(process.env.HUGGINGFACE_API_KEY)
      : null;

    // Ініціалізація Google Gemini (безкоштовний tier)
    this.gemini = process.env.GOOGLE_AI_API_KEY
      ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
      : null;

    // Пріоритет провайдерів (Gemini найвищий!)
    this.providers = [
      { name: 'gemini', enabled: !!this.gemini },        // Найкраща якість
      { name: 'huggingface', enabled: !!this.hf },
      { name: 'fallback', enabled: true } // Завжди доступний fallback
    ];

    console.log('✅ AI Service ініціалізовано. Провайдери:', this.providers);
  }

  /**
   * Генерація повного опитування на основі теми
   */
  async generateSurvey(params) {
    const { topic, goal, questionCount = 7, questionTypes = ['radio', 'checkbox', 'text'], additionalInstructions } = params;

    console.log(`🤖 Генерую опитування: "${topic}" (${questionCount} питань)`);
    if (additionalInstructions) {
      console.log(`💡 Додаткові інструкції: ${additionalInstructions}`);
    }

    // Спроба генерації через різні провайдери
    for (const provider of this.providers) {
      if (!provider.enabled) continue;

      try {
        const result = await this[`generate_${provider.name}`](topic, goal, questionCount, questionTypes, additionalInstructions);
        console.log(`✅ Успішно згенеровано через ${provider.name}`);
        return result;
      } catch (error) {
        console.log(`⚠️ ${provider.name} failed:`, error.message);
      }
    }

    throw new Error('Всі AI провайдери недоступні');
  }

  /**
   * Генерація через Google Gemini API
   */
  async generate_gemini(topic, goal, questionCount, questionTypes, additionalInstructions) {
    if (!this.gemini) throw new Error('Google Gemini не налаштовано');

    // Використовуємо найновішу модель Gemini 2.5 Flash (швидка і безкоштовна)
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const prompt = `Створи опитування українською мовою на тему "${topic}".
Ціль: ${goal || 'збір відгуків'}
Кількість питань: ${questionCount}
${additionalInstructions ? `\nДодаткові вимоги: ${additionalInstructions}` : ''}

ВАЖЛИВО: Відповідай ТІЛЬКИ у форматі JSON. Не додавай жодного тексту до або після JSON. Не використовуй markdown code blocks.

Формат відповіді:
{
  "title": "Назва опитування",
  "description": "Короткий опис (1-2 речення)",
  "questions": [
    {
      "text": "Текст питання",
      "type": "radio",
      "options": [{"text": "Варіант 1", "value": "value1"}],
      "required": true
    }
  ]
}

Типи питань для використання: ${questionTypes.join(', ')}
- radio: питання з одним варіантом відповіді (додай 4-5 варіантів)
- checkbox: питання з декількома варіантами (додай 4-6 варіантів)
- text: коротка текстова відповідь (options: [])
- textarea: довга текстова відповідь (options: [])

Створи ${questionCount} різноманітних, професійних питань українською мовою.
Розподіли типи питань рівномірно.
Питання повинні бути чіткими, зрозумілими та релевантними темі.${additionalInstructions ? `\n\nОБОВ'ЯЗКОВО враховуй додаткові вимоги користувача!` : ''}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return this.parseAIResponse(text, questionTypes, 'gemini');
  }

  /**
   * Генерація через Hugging Face API
   */
  async generate_huggingface(topic, goal, questionCount, questionTypes, additionalInstructions) {
    if (!this.hf) throw new Error('Hugging Face не налаштовано');

    const prompt = this.buildPrompt(topic, goal, questionCount, questionTypes);

    const response = await this.hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false
      }
    });

    return this.parseAIResponse(response.generated_text, questionTypes, 'huggingface');
  }

  /**
   * Fallback генерація з шаблонами (завжди працює)
   */
  async generate_fallback(topic, goal, questionCount, questionTypes, additionalInstructions) {
    console.log('🔄 Використовую fallback генерацію з шаблонами');

    const templates = this.getQuestionTemplates(topic, goal);
    const questions = [];

    // Розподіл типів питань
    const typeCounts = this.distributeQuestionTypes(questionCount, questionTypes);

    for (const [type, count] of Object.entries(typeCounts)) {
      const typeTemplates = templates[type] || [];

      for (let i = 0; i < count && i < typeTemplates.length; i++) {
        // Текст вже відформатований в getQuestionTemplates, просто використовуємо його
        questions.push({
          text: typeTemplates[i].text,
          type: type,
          options: typeTemplates[i].options || [],
          required: true,
          order: questions.length + 1
        });
      }
    }

    return {
      title: `Опитування: ${topic}`,
      description: `Дякуємо за участь в опитуванні. Ваша думка дуже важлива для нас!`,
      questions: questions.slice(0, questionCount),
      aiGenerated: true,
      aiProvider: 'fallback'
    };
  }

  /**
   * Покращення окремого питання
   */
  async improveQuestion(questionText) {
    try {
      if (this.hf) {
        const prompt = `Покращ це питання для опитування, зроби його більш чітким та професійним. Відповідай ТІЛЬКИ покращеним питанням без додаткових пояснень:\n\n"${questionText}"`;

        const response = await this.hf.textGeneration({
          model: 'mistralai/Mistral-7B-Instruct-v0.2',
          inputs: prompt,
          parameters: {
            max_new_tokens: 150,
            temperature: 0.5
          }
        });

        const improved = response.generated_text.trim().replace(/^["']|["']$/g, '');
        return { improved, original: questionText };
      }
    } catch (error) {
      console.log('⚠️ Не вдалося покращити питання:', error.message);
    }

    // Fallback: базове покращення
    return {
      improved: this.basicImprove(questionText),
      original: questionText
    };
  }

  /**
   * Побудова промпту для AI
   */
  buildPrompt(topic, goal, questionCount, questionTypes) {
    return `Створи опитування українською мовою на тему "${topic}".
Ціль: ${goal || 'збір відгуків'}
Кількість питань: ${questionCount}
Типи питань: ${questionTypes.join(', ')}

Формат відповіді (JSON):
{
  "title": "Назва опитування",
  "description": "Короткий опис (1-2 речення)",
  "questions": [
    {
      "text": "Текст питання",
      "type": "radio",
      "options": [{"text": "Варіант 1", "value": "variant1"}],
      "required": true
    }
  ]
}

Створи ТІЛЬКИ JSON без додаткового тексту:`;
  }

  /**
   * Парсинг відповіді від AI
   */
  parseAIResponse(text, questionTypes, provider = 'huggingface') {
    try {
      // Очищаємо текст від markdown code blocks
      let cleanText = text.trim();
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Спроба знайти JSON в тексті
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Перевірка чи є необхідні поля
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
          throw new Error('Відповідь не містить масив питань');
        }

        // Додаємо order до питань
        parsed.questions = parsed.questions.map((q, index) => ({
          ...q,
          order: index + 1,
          required: q.required !== undefined ? q.required : true
        }));

        parsed.aiGenerated = true;
        parsed.aiProvider = provider;

        console.log(`✅ Успішно розпарсено ${parsed.questions.length} питань від ${provider}`);

        return parsed;
      }
    } catch (error) {
      console.log('⚠️ Помилка парсингу AI відповіді:', error.message);
      console.log('📄 Відповідь AI (перші 200 символів):', text.substring(0, 200));
    }

    // Якщо парсинг не вдався, використовуємо fallback
    throw new Error('Не вдалося розібрати відповідь AI');
  }

  /**
   * Базове покращення тексту питання
   */
  basicImprove(text) {
    // Додаємо знак питання якщо його немає
    if (!text.trim().endsWith('?')) {
      text = text.trim() + '?';
    }

    // Перша літера велика
    text = text.charAt(0).toUpperCase() + text.slice(1);

    return text;
  }

  /**
   * Розподіл типів питань
   */
  distributeQuestionTypes(total, types) {
    const distribution = {};
    const baseCount = Math.floor(total / types.length);
    const remainder = total % types.length;

    types.forEach((type, index) => {
      distribution[type] = baseCount + (index < remainder ? 1 : 0);
    });

    return distribution;
  }

  /**
   * Шаблони питань для fallback генерації
   */
  getQuestionTemplates(topic, goal) {
    return {
      radio: [
        {
          text: 'Як би ви оцінили загальну якість за шкалою від 1 до 5?',
          options: [
            { text: 'Відмінно (5)', value: '5' },
            { text: 'Добре (4)', value: '4' },
            { text: 'Задовільно (3)', value: '3' },
            { text: 'Погано (2)', value: '2' },
            { text: 'Дуже погано (1)', value: '1' }
          ]
        },
        {
          text: 'Наскільки ви задоволені загалом?',
          options: [
            { text: 'Повністю задоволений', value: 'fully_satisfied' },
            { text: 'Скоріше задоволений', value: 'satisfied' },
            { text: 'Нейтрально', value: 'neutral' },
            { text: 'Скоріше незадоволений', value: 'dissatisfied' },
            { text: 'Повністю незадоволений', value: 'fully_dissatisfied' }
          ]
        },
        {
          text: 'Чи порекомендуєте ви нас іншим?',
          options: [
            { text: 'Обов\'язково порекомендую', value: 'definitely' },
            { text: 'Швидше за все порекомендую', value: 'probably' },
            { text: 'Не впевнений', value: 'not_sure' },
            { text: 'Швидше за все ні', value: 'probably_not' },
            { text: 'Точно ні', value: 'definitely_not' }
          ]
        },
        {
          text: 'Як часто ви користуєтесь нашими послугами?',
          options: [
            { text: 'Щодня', value: 'daily' },
            { text: 'Кілька разів на тиждень', value: 'weekly' },
            { text: 'Раз на місяць', value: 'monthly' },
            { text: 'Рідше ніж раз на місяць', value: 'rarely' },
            { text: 'Вперше', value: 'first_time' }
          ]
        },
        {
          text: 'Чи відповідає якість вашим очікуванням?',
          options: [
            { text: 'Перевищує очікування', value: 'exceeds' },
            { text: 'Відповідає очікуванням', value: 'meets' },
            { text: 'Частково відповідає', value: 'partially' },
            { text: 'Не відповідає', value: 'not_meets' }
          ]
        }
      ],
      checkbox: [
        {
          text: 'Які аспекти вам найбільше сподобалися?',
          options: [
            { text: 'Якість обслуговування', value: 'quality' },
            { text: 'Швидкість роботи', value: 'speed' },
            { text: 'Зручність використання', value: 'convenience' },
            { text: 'Співвідношення ціна/якість', value: 'price' },
            { text: 'Професіоналізм', value: 'professionalism' },
            { text: 'Технічна підтримка', value: 'support' }
          ]
        },
        {
          text: 'Що потребує покращення на вашу думку?',
          options: [
            { text: 'Функціональність', value: 'functionality' },
            { text: 'Зручність інтерфейсу', value: 'interface' },
            { text: 'Швидкість роботи', value: 'performance' },
            { text: 'Документація', value: 'documentation' },
            { text: 'Служба підтримки', value: 'support' },
            { text: 'Ціноутворення', value: 'pricing' }
          ]
        },
        {
          text: 'Які додаткові функції ви б хотіли бачити?',
          options: [
            { text: 'Мобільний додаток', value: 'mobile_app' },
            { text: 'Інтеграції з іншими сервісами', value: 'integrations' },
            { text: 'Розширена аналітика', value: 'analytics' },
            { text: 'Налаштування під себе', value: 'customization' },
            { text: 'Багатомовність', value: 'multilingual' }
          ]
        }
      ],
      text: [
        {
          text: 'Що вам найбільше сподобалося?',
          options: []
        },
        {
          text: 'Які покращення ви б хотіли бачити?',
          options: []
        },
        {
          text: 'Поділіться вашою думкою або враженнями',
          options: []
        },
        {
          text: 'Чого не вистачає для ідеального досвіду?',
          options: []
        },
        {
          text: 'Що найбільше запам\'яталося під час використання?',
          options: []
        }
      ],
      textarea: [
        {
          text: 'Будь ласка, поділіться детальним відгуком про ваш досвід',
          options: []
        },
        {
          text: 'Які у вас є пропозиції щодо покращення?',
          options: []
        },
        {
          text: 'Опишіть ваш досвід використання максимально детально',
          options: []
        }
      ]
    };
  }

  /**
   * Аналіз відповідей користувачів за допомогою AI
   */
  async analyzeResponses(surveyData) {
    console.log(`🧠 Аналізую відповіді для опитування: "${surveyData.title}"`);

    // Перевірка наявності Gemini
    if (!this.gemini) {
      throw new Error('Google Gemini не налаштовано. AI аналіз недоступний.');
    }

    // Перевірка наявності відповідей
    if (!surveyData.responses || surveyData.responses.length === 0) {
      throw new Error('Недостатньо відповідей для аналізу. Потрібно мінімум 1 відповідь.');
    }

    try {
      const model = this.gemini.getGenerativeModel({
        model: 'gemini-2.5-flash'
      });

      // Підготовка даних для аналізу
      const analysisData = this.prepareDataForAnalysis(surveyData);

      const prompt = `Ти експерт з аналізу даних опитувань. Проаналізуй результати опитування та надай детальний звіт українською мовою.

📋 ОПИТУВАННЯ: "${surveyData.title}"
📊 Кількість відповідей: ${surveyData.responses.length}
📅 Період: ${new Date(surveyData.createdAt).toLocaleDateString('uk-UA')}

${analysisData}

Твоє завдання:
1. Проаналізувати всі відповіді респондентів
2. Виявити ключові тренди та патерни
3. Визначити загальний настрій (позитивний/нейтральний/негативний)
4. Знайти найчастіші теми та згадування
5. Надати конкретні, дієві рекомендації

ФОРМАТ ВІДПОВІДІ (дотримуйся точно):

🎯 ЗАГАЛЬНИЙ ВИСНОВОК
[2-3 речення про основний результат опитування]

📊 СТАТИСТИЧНІ ІНСАЙТИ
- [Конкретний факт з цифрами]
- [Конкретний факт з цифрами]
- [Конкретний факт з цифрами]

💭 КЛЮЧОВІ ТЕМИ
- [Тема 1]: [короткий опис]
- [Тема 2]: [короткий опис]
- [Тема 3]: [короткий опис]

😊 НАСТРІЙ РЕСПОНДЕНТІВ
[Визнач загальний настрій: позитивний/нейтральний/негативний з обґрунтуванням]

💡 РЕКОМЕНДАЦІЇ
1. [Конкретна дієва рекомендація]
2. [Конкретна дієва рекомендація]
3. [Конкретна дієва рекомендація]

⚠️ ЗОНИ УВАГИ
- [Що потребує негайної уваги]
- [Потенційні проблеми]

Будь конкретним, використовуй цифри та факти з даних. Пиши професійно, але зрозуміло.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      console.log('✅ AI аналіз завершено успішно');

      return {
        analysis: analysisText,
        metadata: {
          surveyTitle: surveyData.title,
          totalResponses: surveyData.responses.length,
          analyzedAt: new Date().toISOString(),
          aiProvider: 'gemini-2.5-flash'
        }
      };

    } catch (error) {
      console.error('❌ Помилка AI аналізу:', error.message);
      throw new Error(`Не вдалося виконати AI аналіз: ${error.message}`);
    }
  }

  /**
   * Підготовка даних опитування для аналізу
   */
  prepareDataForAnalysis(surveyData) {
    let analysisText = '📝 ДАНІ ДЛЯ АНАЛІЗУ:\n\n';

    surveyData.questionStats.forEach((question, index) => {
      analysisText += `ПИТАННЯ ${index + 1}: ${question.text}\n`;
      analysisText += `Тип: ${question.type}\n`;

      if (question.type === 'text' || question.type === 'textarea') {
        // Текстові відповіді
        analysisText += 'Відповіді респондентів:\n';
        const answers = Object.keys(question.answers);
        answers.forEach((answer, idx) => {
          const count = question.answers[answer];
          if (count > 1) {
            analysisText += `- "${answer}" (згадано ${count} разів)\n`;
          } else {
            analysisText += `- "${answer}"\n`;
          }
        });
      } else {
        // Варіанти вибору (radio/checkbox)
        analysisText += 'Розподіл відповідей:\n';
        Object.entries(question.answers).forEach(([answer, count]) => {
          const percentage = ((count / surveyData.responses.length) * 100).toFixed(1);
          analysisText += `- "${answer}": ${count} відповідей (${percentage}%)\n`;
        });
      }

      analysisText += '\n';
    });

    return analysisText;
  }

  /**
   * Чат про результати опитування
   * @param {Object} surveyContext - Контекст опитування (назва, статистика)
   * @param {String} userMessage - Повідомлення користувача
   * @param {Array} history - Історія розмови
   * @returns {Promise<String>} - Відповідь AI
   */
  async chatAboutSurvey(surveyContext, userMessage, history = []) {
    console.log('💬 AI Chat: Обробка повідомлення');

    if (!this.gemini) {
      throw new Error('AI сервіс недоступний');
    }

    // Формування контексту про опитування
    const contextInfo = `ОПИТУВАННЯ: "${surveyContext.title}"
КІЛЬКІСТЬ ВІДПОВІДЕЙ: ${surveyContext.totalResponses}

СТАТИСТИКА ПО ПИТАННЯХ:
${surveyContext.questionStats.map((q, i) => {
  const answersText = Object.entries(q.answers)
    .map(([answer, count]) => `  - "${answer}": ${count} відповідей`)
    .join('\n');
  return `${i + 1}. ${q.text} (${q.type})\n${answersText}`;
}).join('\n\n')}`;

    // Формування повного промпта з історією
    let conversationHistory = '';
    if (history && history.length > 1) {
      // Пропускаємо перше повідомлення (початковий аналіз)
      conversationHistory = '\n\nПОПЕРЕДНЯ РОЗМОВА:\n';
      for (let i = 1; i < history.length; i++) {
        const msg = history[i];
        if (msg.role === 'user') {
          conversationHistory += `Користувач: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          conversationHistory += `AI: ${msg.content}\n`;
        }
      }
    }

    const prompt = `Ти - AI асистент, який допомагає аналізувати результати опитування.

${contextInfo}
${conversationHistory}

Користувач запитує: ${userMessage}

Відповідай українською мовою. Будь корисним, конкретним та професійним. Використовуй дані зі статистики вище для відповіді. Якщо питання про кількість - дай точну цифру з даних.`;

    try {
      const model = this.gemini.getGenerativeModel({
        model: 'gemini-2.5-flash'
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      return responseText;
    } catch (error) {
      console.error('❌ Помилка Gemini chat:', error);
      throw new Error('Не вдалося отримати відповідь від AI');
    }
  }
}

module.exports = new AIService();
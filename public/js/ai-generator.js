/**
 * AI Generator Module
 * Модуль для роботи з AI генерацією опитувань
 */

class AIGenerator {
  constructor() {
    this.baseURL = '/api/ai';
  }

  /**
   * Отримання токену з localStorage або cookies
   */
  getToken() {
    // Спочатку перевіряємо localStorage
    let token = localStorage.getItem('accessToken');

    // Якщо немає в localStorage, шукаємо в cookies
    if (!token) {
      token = document.cookie
        .split('; ')
        .find(row => row.startsWith('accessToken='))
        ?.split('=')[1];
    }

    return token;
  }

  /**
   * Генерація повного опитування
   */
  async generateSurvey(params) {
    try {
      const response = await fetch(`${this.baseURL}/generate-survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Помилка генерації опитування');
      }

      return data.data;
    } catch (error) {
      console.error('Помилка AI генерації:', error);
      throw error;
    }
  }

  /**
   * Покращення питання
   */
  async improveQuestion(questionText) {
    try {
      const response = await fetch(`${this.baseURL}/improve-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({ question: questionText })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Помилка покращення питання');
      }

      return data.data;
    } catch (error) {
      console.error('Помилка покращення питання:', error);
      throw error;
    }
  }

  /**
   * Генерація додаткових питань
   */
  async generateAdditionalQuestions(topic, existingQuestions, count = 3) {
    try {
      const response = await fetch(`${this.baseURL}/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          topic,
          existingQuestions,
          count,
          questionTypes: ['radio', 'checkbox', 'text']
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Помилка генерації додаткових питань');
      }

      return data.data.questions;
    } catch (error) {
      console.error('Помилка генерації додаткових питань:', error);
      throw error;
    }
  }

  /**
   * Аналіз якості опитування
   */
  async analyzeSurvey(questions) {
    try {
      const response = await fetch(`${this.baseURL}/analyze-survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({ questions })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Помилка аналізу опитування');
      }

      return data.data;
    } catch (error) {
      console.error('Помилка аналізу опитування:', error);
      throw error;
    }
  }

  /**
   * Показ модального вікна AI генератора
   */
  showGeneratorModal(onGenerate) {
    const modal = document.getElementById('ai-generator-modal');
    if (!modal) {
      this.createGeneratorModal(onGenerate);
    } else {
      modal.style.display = 'flex';
    }
  }

  /**
   * Створення модального вікна AI генератора
   */
  createGeneratorModal(onGenerate) {
    const modalHTML = `
      <div id="ai-generator-modal" class="modal" style="display: flex;">
        <div class="modal-content ai-modal">
          <div class="modal-header">
            <h2>🤖 AI Генератор опитувань</h2>
            <span class="close-modal">&times;</span>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="ai-topic">📌 Тема опитування *</label>
              <input
                type="text"
                id="ai-topic"
                placeholder="Наприклад: Задоволеність послугами компанії"
                required
              />
            </div>

            <div class="form-group">
              <label for="ai-goal">🎯 Ціль опитування</label>
              <select id="ai-goal">
                <option value="Дослідження думки клієнтів">Дослідження думки клієнтів</option>
                <option value="Оцінка якості продукту">Оцінка якості продукту</option>
                <option value="Збір відгуків співробітників">Збір відгуків співробітників</option>
                <option value="Академічне дослідження">Академічне дослідження</option>
                <option value="Аналіз потреб ринку">Аналіз потреб ринку</option>
              </select>
            </div>

            <div class="form-group">
              <label for="ai-hints">💡 Додаткові підказки для ШІ (опціональне)</label>
              <textarea
                id="ai-hints"
                placeholder="Наприклад: Зроби акцент на якості обслуговування, додай питання про ціну, запитай про конкурентів..."
                rows="3"
                style="resize: vertical;"
              ></textarea>
              <small style="color: #718096; font-size: 0.85rem; display: block; margin-top: 0.3rem;">
                Опишіть що саме ви хочете бачити в опитуванні, щоб ШІ згенерувала більш релевантні питання
              </small>
            </div>

            <div class="form-group">
              <label for="ai-question-count">📊 Кількість питань *</label>
              <input
                type="number"
                id="ai-question-count"
                min="1"
                max="30"
                value="7"
                required
                style="width: 150px;"
              />
              <small style="color: #718096; font-size: 0.85rem; display: block; margin-top: 0.3rem;">
                Вкажіть від 1 до 30 питань
              </small>
            </div>

            <div class="form-group">
              <label>🎨 Типи питань</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="question-types" value="radio" checked />
                  <span>Вибір варіанту</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="question-types" value="checkbox" checked />
                  <span>Множинний вибір</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="question-types" value="text" checked />
                  <span>Текстові відповіді</span>
                </label>
              </div>
            </div>

            <div id="ai-generation-status" style="display: none;">
              <div class="progress-bar">
                <div class="progress-fill" id="ai-progress"></div>
              </div>
              <p class="status-text" id="ai-status-text">Генерую опитування...</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" id="cancel-generate">Скасувати</button>
            <button class="btn-primary" id="start-generate">🚀 Згенерувати</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Обробники подій
    const modal = document.getElementById('ai-generator-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancel-generate');
    const generateBtn = document.getElementById('start-generate');

    closeBtn.onclick = () => modal.style.display = 'none';
    cancelBtn.onclick = () => modal.style.display = 'none';

    generateBtn.onclick = async () => {
      const topic = document.getElementById('ai-topic').value.trim();
      const goal = document.getElementById('ai-goal').value;
      const hints = document.getElementById('ai-hints').value.trim();
      const questionCount = parseInt(document.getElementById('ai-question-count').value);
      const questionTypes = Array.from(
        document.querySelectorAll('input[name="question-types"]:checked')
      ).map(cb => cb.value);

      if (!topic) {
        alert('Будь ласка, введіть тему опитування');
        return;
      }

      if (questionCount < 1 || questionCount > 30) {
        alert('Кількість питань повинна бути від 1 до 30');
        return;
      }

      if (questionTypes.length === 0) {
        alert('Оберіть хоча б один тип питань');
        return;
      }

      // Показуємо прогрес
      this.showGenerationProgress();

      try {
        const surveyData = await this.generateSurvey({
          topic,
          goal: hints ? `${goal}. Додаткові вимоги: ${hints}` : goal,
          questionCount,
          questionTypes
        });

        modal.style.display = 'none';

        if (onGenerate) {
          onGenerate(surveyData);
        }
      } catch (error) {
        alert('Помилка генерації: ' + error.message);
      } finally {
        this.hideGenerationProgress();
      }
    };

    // Закриття при кліку поза модальним вікном
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    };
  }

  /**
   * Показ прогресу генерації
   */
  showGenerationProgress() {
    const statusDiv = document.getElementById('ai-generation-status');
    const generateBtn = document.getElementById('start-generate');
    const progressFill = document.getElementById('ai-progress');

    if (statusDiv && generateBtn) {
      statusDiv.style.display = 'block';
      generateBtn.disabled = true;
      generateBtn.textContent = 'Генерується...';

      // Анімація прогресу
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        if (progress > 90) {
          clearInterval(interval);
        }
        if (progressFill) {
          progressFill.style.width = progress + '%';
        }
      }, 200);
    }
  }

  /**
   * Приховування прогресу генерації
   */
  hideGenerationProgress() {
    const statusDiv = document.getElementById('ai-generation-status');
    const generateBtn = document.getElementById('start-generate');
    const progressFill = document.getElementById('ai-progress');

    if (statusDiv && generateBtn && progressFill) {
      progressFill.style.width = '100%';
      setTimeout(() => {
        statusDiv.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.textContent = '🚀 Згенерувати';
        progressFill.style.width = '0%';
      }, 500);
    }
  }
}

// Експортуємо для використання
const aiGenerator = new AIGenerator();
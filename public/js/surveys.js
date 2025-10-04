// Глобальні змінні
var currentUser = null;
var currentToken = localStorage.getItem("accessToken");
var questionCounter = 0;

// Захист від подвійного експорту
let exportInProgress = new Set();

// Допоміжні функції
function getElementId(prefix, id) {
    return prefix + '-' + id;
}

function createDownloadFilename(surveyId) {
    return 'survey-' + surveyId + '-' + Date.now() + '.csv';
}

// Функція для API запитів з автоматичним оновленням токена
async function apiRequest(url, options = {}) {
    if (!options.headers) {
        options.headers = {};
    }
    
    if (currentToken) {
        options.headers['Authorization'] = `Bearer ${currentToken}`;
    }

    try {
        const response = await fetch(url, options);
        
        // Якщо токен протермінувався, спробуємо оновити
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                // Повторна спроба з новим токеном
                options.headers['Authorization'] = `Bearer ${currentToken}`;
                return await fetch(url, options);
            } else {
                window.location.href = '/';
                return null;
            }
        }
        
        return response;
    } catch (error) {
        console.error('Помилка API запиту:', error);
        throw error;
    }
}

// Функція для перевірки валідності токена
async function validateToken() {
    if (!currentToken) {
        return false;
    }

    try {
        const response = await fetch('/api/auth/validate', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (!response.ok) {
            localStorage.removeItem('accessToken');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Помилка валідації токена:', error);
        return false;
    }
}

// Функція для оновлення токена
async function refreshToken() {
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.accessToken) {
                currentToken = result.data.accessToken;
                localStorage.setItem('accessToken', currentToken);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Помилка оновлення токена:', error);
        return false;
    }
}

// Спроба оновити токен через refresh token
async function tryRefreshToken() {
    try {
        console.log("Спроба оновити токен через refresh token...");
        const response = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include"
        });

        console.log("Відповідь сервера на refresh:", response.status);
        const text = await response.text();
        console.log("Тіло відповіді:", text);
        
        let result = null;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.log("Не вдалося розпарсити JSON:", e);
        }

        if (response.ok && result?.data?.accessToken) {
            currentToken = result.data.accessToken;
            localStorage.setItem("accessToken", currentToken);
            console.log("Токен успішно оновлено через refresh token");
            return true;
        } else {
            console.log("Не вдалося оновити токен, статус:", response.status);
        }
    } catch (error) {
        console.log("Помилка при оновленні токена:", error);
    }
    return false;
}

// Перевірка авторизації при завантаженні сторінки
document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== ІНІЦІАЛІЗАЦІЯ СТОРІНКИ ОПИТУВАНЬ ===');
    
    // Якщо токен не знайдено в localStorage, пробуємо оновити через refresh token
    if (!currentToken) {
        console.log('Токен не знайдено в localStorage, спробуємо refresh token');
        const refreshSuccess = await tryRefreshToken();
        if (refreshSuccess) {
            currentToken = localStorage.getItem('accessToken');
        } else {
            console.log('Не вдалося отримати токен через refresh token');
            window.location.href = '/';
            return;
        }
    }
    await checkAuth();
});

// Перевірка авторизації
async function checkAuth() {
    console.log('=== ПЕРЕВІРКА АВТОРИЗАЦІЇ ===');
    
    if (!currentToken) {
        console.log('Немає токена для перевірки');
        showAuthError();
        return;
    }

    try {
        console.log('Перевіряємо токен на сервері...');
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': 'Bearer ' + currentToken
            }
        });

        console.log('Статус перевірки токена:', response.status);
        const result = await response.json();

        if (result.success) {
            console.log('Авторизація успішна для користувача:', result.data.user.username);
            currentUser = result.data.user;
            showMainContent();
            loadUserSurveys();
        } else {
            console.log('Помилка авторизації:', result.message);
            // Спробуємо оновити токен ще раз
            const refreshSuccess = await tryRefreshToken();
            if (refreshSuccess) {
                // Рекурсивно перевіряємо з новим токеном
                await checkAuth();
            } else {
                showAuthError();
            }
        }
    } catch (error) {
        console.error('Помилка перевірки авторизації:', error);
        showAuthError();
    }
}

// Показати помилку авторизації
function showAuthError() {
    console.log('Показуємо помилку авторизації');
    const authCheckEl = document.getElementById("authCheck");
    if (authCheckEl) {
        const authErrorHtml = [
            '<h2>Помилка авторизації</h2>',
            '<div class="error">',
            '    Ваш токен протермінувався або недійсний.',
            '    <br><br>',
            '    <button onclick="handleTokenRefresh()" ',
            '        style="margin-right: 10px; padding: 10px 15px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">',
            '        Спробувати оновити токен',
            '    </button>',
            '    <a href="/" style="color: #007bff; text-decoration: none; padding: 10px 15px; background: #007bff; color: white; border-radius: 5px;">',
            '        Повернутися для входу',
            '    </a>',
            '</div>'
        ].join("\n");
        authCheckEl.innerHTML = authErrorHtml;
    }
}

// Обробка оновлення токена
async function handleTokenRefresh() {
    console.log('Користувач натиснув кнопку оновлення токена');
    const refreshSuccess = await tryRefreshToken();
    if (refreshSuccess) {
        console.log('Токен оновлено, перезавантажуємо сторінку');
        location.reload();
    } else {
        alert('Не вдалося оновити токен. Перейдіть на головну сторінку для повторного входу.');
        window.location.href = '/';
    }
}

// Показати основний контент
function showMainContent() {
    console.log('Показуємо основний контент');
    document.getElementById('authCheck').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    
    // Показати інформацію про користувача
    const displayName = currentUser ? (currentUser.name || currentUser.username || currentUser.email.split('@')[0]) : '';
    document.getElementById('userInfo').innerHTML = 'Привіт, ' +
        '<strong>' + displayName + '</strong>!';
}

// Функція експорту опитування в CSV з захистом від подвійного виклику
async function exportSurveyToCSV(surveyId) {
    // Перевірка чи вже йде експорт цього опитування
    if (exportInProgress.has(surveyId)) {
        console.log('Експорт опитування', surveyId, 'вже виконується...');
        return;
    }

    // Позначаємо початок експорту
    exportInProgress.add(surveyId);
    
    // Знаходимо кнопку експорту
    const exportBtn = document.querySelector(`[data-survey-id="${surveyId}"]`);
    let originalText = 'Експорт CSV';
    
    if (exportBtn) {
        originalText = exportBtn.textContent;
        exportBtn.disabled = true;
        exportBtn.textContent = '⏳ Завантажую...';
        exportBtn.style.opacity = '0.6';
    }

    try {
        console.log('Експортуємо опитування в CSV:', surveyId);
        const response = await apiRequest('/api/surveys/' + surveyId + '/export', {
            method: 'GET',
            credentials: 'include'
        });

        if (response && response.ok) {
            // Отримуємо blob з відповіді
            const blob = await response.blob();
            
            // Створюємо посилання для завантаження
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = createDownloadFilename(surveyId);
            a.style.display = 'none';
            
            // Додаємо посилання на сторінку і симулюємо клік
            document.body.appendChild(a);
            a.click();
            
            // Прибираємо посилання
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

            // Показуємо повідомлення про успіх
            showResult('surveysList', true, 'Файл успішно завантажено!');
            
        } else if (response) {
            const error = await response.json();
            alert('Помилка експорту: ' + (error.message || 'Невідома помилка'));
        }
    } catch (error) {
        console.error('Помилка експорту CSV:', error);
        alert('Помилка експорту: ' + error.message);
    } finally {
        // Завжди відновлюємо кнопку і видаляємо з списку експортів
        exportInProgress.delete(surveyId);
        
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.textContent = originalText;
            exportBtn.style.opacity = '1';
        }
    }
}

// Перемикання вкладок
function showTab(tabName) {
    console.log('Перемикання на вкладку:', tabName);
    
    // Приховати всі вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Показати вибрану вкладку
    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Додати активний клас до вкладки (якщо є event)
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }

    if (tabName === 'create') {
        initCreateForm();
    }
}

// Ініціалізація форми створення
function initCreateForm() {
    console.log('Ініціалізація форми створення опитування');
    questionCounter = 0;
    const questionsContainer = document.getElementById('questionsContainer');
    if (questionsContainer) {
        questionsContainer.innerHTML = '';
    }
    addQuestion(); // Додати перше питання за замовчуванням
}

// Додати питання
function addQuestion() {
    questionCounter++;
    const questionsContainer = document.getElementById('questionsContainer');
    if (!questionsContainer) return;
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.id = `question-${questionCounter}`;
    
    questionDiv.innerHTML = `
        <h4>Питання ${questionCounter}</h4>
        <div class="form-group">
            <label>Текст питання:</label>
            <input type="text" id="questionText-${questionCounter}" required>
        </div>
        
        <div class="form-group">
            <label>Тип питання:</label>
            <select id="questionType-${questionCounter}" onchange="toggleOptions(${questionCounter})">
                <option value="text">Текстова відповідь</option>
                <option value="textarea">Багаторядкова текстова відповідь</option>
                <option value="radio">Одна відповідь з варіантів</option>
                <option value="checkbox">Кілька відповідей з варіантів</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>
                <input type="checkbox" id="questionRequired-${questionCounter}">
                Обов'язкове питання
            </label>
        </div>
        
        <div id="options-${questionCounter}" class="hidden">
            <label>Варіанти відповідей:</label>
            <div id="optionsList-${questionCounter}"></div>
            <button type="button" onclick="addOption(${questionCounter})" class="success">Додати варіант</button>
        </div>
        
        <button type="button" onclick="removeQuestion(${questionCounter})" class="danger">Видалити питання</button>
    `;
    
    questionsContainer.appendChild(questionDiv);
}

// Перемикання варіантів відповідей
function toggleOptions(questionId) {
    const questionType = document.getElementById(`questionType-${questionId}`);
    const optionsDiv = document.getElementById(`options-${questionId}`);
    
    if (!questionType || !optionsDiv) return;
    
    if (questionType.value === 'radio' || questionType.value === 'checkbox') {
        optionsDiv.classList.remove('hidden');
        const optionsList = document.getElementById(`optionsList-${questionId}`);
        if (optionsList && optionsList.children.length === 0) {
            addOption(questionId);
            addOption(questionId);
        }
    } else {
        optionsDiv.classList.add('hidden');
    }
}

// Додати варіант відповіді
function addOption(questionId) {
    const optionsList = document.getElementById(`optionsList-${questionId}`);
    if (!optionsList) return;
    
    const optionId = Date.now();
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input';
    optionDiv.id = `option-${optionId}`;
    
    optionDiv.innerHTML = `
        <input type="text" placeholder="Варіант відповіді" style="flex: 1;">
        <button type="button" onclick="removeOption(${optionId})" class="danger">Видалити</button>
    `;
    
    optionsList.appendChild(optionDiv);
}

// Видалити варіант відповіді
function removeOption(optionId) {
    const optionElement = document.getElementById(`option-${optionId}`);
    if (optionElement) {
        optionElement.remove();
    }
}

// Видалити питання
function removeQuestion(questionId) {
    if (questionCounter <= 1) {
        alert('Опитування має містити хоча б одне питання');
        return;
    }
    const questionElement = document.getElementById(`question-${questionId}`);
    if (questionElement) {
        questionElement.remove();
    }
}

// Закрити модальне вікно статистики
function closeStatsModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Конвертувати тип питання в текстовий опис
function getQuestionTypeText(type) {
    const types = {
        'radio': 'Одиночний вибір',
        'checkbox': 'Множинний вибір',
        'text': 'Текстове поле',
        'textarea': 'Розгорнута відповідь',
        'multiple-choice': 'Одиночний вибір'
    };
    return types[type] || type;
}

// Створити опитування
async function createSurvey() {
    console.log('=== СТВОРЕННЯ ОПИТУВАННЯ ===');
    
    try {
        const titleEl = document.getElementById('surveyTitle');
        const descriptionEl = document.getElementById('surveyDescription');
        const closingDateEl = document.getElementById('surveyClosingDate');
        
        if (!titleEl || !descriptionEl || !closingDateEl) {
            showResult('createResult', false, 'Не всі елементи форми знайдено');
            return;
        }
        
        const title = titleEl.value;
        const description = descriptionEl.value;
        const closingDate = closingDateEl.value;
        
        if (!title.trim()) {
            showResult('createResult', false, 'Будь ласка, введіть назву опитування');
            return;
        }

        // Збір питань
        const questions = [];
        const questionElements = document.querySelectorAll('.question-item');
        
        questionElements.forEach((questionEl, index) => {
            const questionId = questionEl.id.split('-')[1];
            const textEl = document.getElementById(`questionText-${questionId}`);
            const typeEl = document.getElementById(`questionType-${questionId}`);
            const requiredEl = document.getElementById(`questionRequired-${questionId}`);
            
            if (!textEl || !typeEl || !requiredEl) return;
            
            const text = textEl.value;
            const type = typeEl.value;
            const required = requiredEl.checked;
            
            if (!text.trim()) {
                throw new Error(`Будь ласка, введіть текст для питання ${index + 1}`);
            }
            
            const question = {
                text: text.trim(),
                type,
                required,
                order: index + 1,
                options: []
            };
            
            // Збір варіантів відповідей (якщо потрібно)
            if (type === 'radio' || type === 'checkbox') {
                const optionInputs = document.querySelectorAll(`#optionsList-${questionId} input`);
                optionInputs.forEach((input) => {
                    if (input.value.trim()) {
                        question.options.push({
                            text: input.value.trim(),
                            value: input.value.trim()
                        });
                    }
                });
                
                if (question.options.length === 0) {
                    throw new Error(`Додайте варіанти відповідей для питання "${text}"`);
                }
            }
            
            questions.push(question);
        });
        
        if (questions.length === 0) {
            throw new Error('Додайте хоча б одне питання');
        }

        const surveyData = {
            title: title.trim(),
            description: description.trim(),
            questions,
            closingDate: closingDate || null
        };

        console.log('Відправляємо дані опитування:', surveyData);

        const response = await apiRequest('/api/surveys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(surveyData)
        });

        if (!response) return;

        const result = await response.json();
        console.log('Результат створення опитування:', result);

        if (result.success) {
            showResult('createResult', true, result.message, {
                surveyId: result.data.survey._id,
                surveyLink: result.data.surveyLink
            });
            
            // Очистити форму
            titleEl.value = '';
            descriptionEl.value = '';
            closingDateEl.value = '';
            initCreateForm();
            
            // Оновити список опитувань
            loadUserSurveys();
        } else {
            showResult('createResult', false, result.message);
        }

    } catch (error) {
        console.error('Помилка створення опитування:', error);
        showResult('createResult', false, error.message);
    }
}

// Завантажити опитування користувача
async function loadUserSurveys() {
    console.log('=== ЗАВАНТАЖЕННЯ ОПИТУВАНЬ КОРИСТУВАЧА ===');
    
    try {
        const response = await apiRequest('/api/surveys');
        if (!response) return;
        
        const result = await response.json();

        if (result.success) {
            console.log('Опитування завантажено:', result.data.surveys.length, 'штук');
            displaySurveys(result.data.surveys);
        } else {
            console.log('Помилка завантаження опитувань:', result.message);
            showResult('surveysList', false, result.message);
        }

    } catch (error) {
        console.error('Помилка завантаження опитувань:', error);
        showResult('surveysList', false, 'Помилка завантаження опитувань');
    }
}

// Відобразити список опитувань
function displaySurveys(surveys) {
    const surveysList = document.getElementById("surveysList");
    if (!surveysList) return;
    
    if (!surveys || surveys.length === 0) {
        const noSurveysHtml = [
            '<div class="info">',
            '    У вас ще немає опитувань. ',
            '    <a href="#" onclick="showTab(\'create\')">Створіть перше опитування</a>!',
            '</div>'
        ].join("\n");
        surveysList.innerHTML = noSurveysHtml;
        return;
    }

    const allSurveysHtml = surveys.map(survey => {
        const createdDate = new Date(survey.createdAt).toLocaleDateString("uk-UA");
        const isActive = survey.isActive ? "Активне" : "Неактивне";
        const closingDate = survey.closingDate ? 
            "Закривається: " + new Date(survey.closingDate).toLocaleString("uk-UA") : 
            "Без обмеження часу";
        const surveyLink = survey.uniqueLink;
        const surveyUrl = window.location.origin + "/survey/" + surveyLink;
        const surveyDesc = survey.description || "Немає опису";
        
        return [
            '<div class="survey-item">',
            '    <h4>' + survey.title + '</h4>',
            '    <p><strong>Опис:</strong> ' + surveyDesc + '</p>',
            '    <p><strong>Статус:</strong> ' + isActive + ' | <strong>Створено:</strong> ' + createdDate + '</p>',
            '    <p><strong>Питань:</strong> ' + survey.questions.length + ' | <strong>' + closingDate + '</strong></p>',
            '    <div class="survey-link">',
            '        <strong>Посилання для респондентів:</strong><br>',
            '        <a href="/survey/' + surveyLink + '" target="_blank">' + surveyUrl + '</a>',
            '        <button onclick="copySurveyLink(\'' + surveyUrl + '\', this)" class="btn btn-copy" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); margin-left: 10px; padding: 0.5rem 1rem; font-size: 0.85rem;">📋 Копіювати</button>',
            '    </div>',
            '    <div class="survey-actions">',
            '        <button onclick="viewStats(\'' + survey._id + '\')" class="success">Статистика</button>',
            '        <button onclick="exportSurveyToCSV(\'' + survey._id + '\')" class="btn" data-survey-id="' + survey._id + '">Експорт CSV</button>',
            '        <button onclick="window.location.href=\'/edit-survey.html?id=' + survey._id + '\'" style="background: linear-gradient(135deg, #f59e0b, #d97706);">Редагувати</button>',
            '        <button onclick="toggleSurveyStatus(\'' + survey._id + '\', ' + !survey.isActive + ')">',
            '            ' + (survey.isActive ? "Деактивувати" : "Активувати"),
            '        </button>',
            '        <button onclick="deleteSurvey(\'' + survey._id + '\')" class="danger">Видалити</button>',
            '    </div>',
            '</div>'
        ].join("\n");
    }).join("\n");

    surveysList.innerHTML = allSurveysHtml;
}

// Переглянути статистику опитування
async function viewStats(surveyId) {
    console.log('Отримуємо статистику для опитування:', surveyId);
    
    try {
        const response = await apiRequest('/api/surveys/' + surveyId + '/stats');
        if (!response) return;
        
        const result = await response.json();

        if (result.success) {
            // Закрити попереднє модальне вікно якщо воно відкрите
            closeStatsModal();
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            
            const modalHtml = [
                '<div class="modal-content">',
                '    <span class="close-button" onclick="closeStatsModal()">&times;</span>',
                '    <h3>Статистика опитування</h3>',
                '    <div id="stats-content"></div>',
                '</div>'
            ].join('\n');
            
            modal.innerHTML = modalHtml;
            document.body.appendChild(modal);
            
            const statsContent = document.getElementById('stats-content');
            const stats = result.data;
            
            // Показати загальну кількість відповідей
            const totalResponsesHtml = [
                '<p><strong>Загальна кількість відповідей: ' + stats.totalResponses + '</strong></p>',
                '<hr>'
            ].join('\n');
            
            statsContent.innerHTML = totalResponsesHtml;
            
            // Показати статистику для кожного питання
            if (stats.questionStats && stats.questionStats.length > 0) {
                try {
                    stats.questionStats.forEach((question, index) => {
                        const questionDiv = document.createElement('div');
                        questionDiv.className = 'question-stats';
                        questionDiv.innerHTML = `
                            <h4>Питання ${index + 1}: ${question.text}</h4>
                            <p>Тип: ${getQuestionTypeText(question.type)}</p>
                        `;
                        
                        if (Object.keys(question.answers).length > 0) {
                            if (question.type === 'text' || question.type === 'textarea') {
                                // Для текстових питань показуємо список відповідей
                                const answersDiv = document.createElement('div');
                                answersDiv.className = 'text-answers';
                                Object.entries(question.answers).forEach(([answer, count]) => {
                                    answersDiv.innerHTML += `
                                        <div class="text-answer">
                                            <p>${answer} (${count} ${count === 1 ? 'відповідь' : 'відповідей'})</p>
                                        </div>
                                    `;
                                });
                                questionDiv.appendChild(answersDiv);
                            } else {
                                // Для інших питань створюємо діаграму
                                const canvasContainer = document.createElement("div");
                                canvasContainer.style.height = "300px";
                                const canvas = document.createElement("canvas");
                                canvas.id = "chart-" + index;
                                canvasContainer.appendChild(canvas);
                                questionDiv.appendChild(canvasContainer);
                                
                                // Створити діаграму після додавання canvas в DOM
                                setTimeout(() => {
                                    try {
                                        const ctx = canvas.getContext("2d");
                                        if (!ctx || !window.Chart) return;

                                        const config = {
                                            type: 'pie',
                                            data: {
                                                labels: Object.keys(question.answers),
                                                datasets: [{
                                                    data: Object.values(question.answers),
                                                    backgroundColor: [
                                                        '#FF6384',
                                                        '#36A2EB',
                                                        '#FFCE56',
                                                        '#4BC0C0',
                                                        '#9966FF',
                                                        '#FF9F40'
                                                    ]
                                                }]
                                            },
                                            options: {
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: {
                                                        position: 'bottom'
                                                    }
                                                }
                                            }
                                        };
                                        new window.Chart(ctx, config);
                                    } catch (err) {
                                        console.error('Помилка створення діаграми:', err);
                                        if (questionDiv) {
                                            questionDiv.innerHTML += '<p>Помилка відображення діаграми</p>';
                                        }
                                    }
                                }, 100);
                            }
                        } else {
                            questionDiv.innerHTML += '<p>Поки що немає відповідей на це питання</p>';
                        }
                        
                        if (statsContent) {
                            statsContent.appendChild(questionDiv);
                        }
                    });
                } catch (err) {
                    console.error('Помилка відображення статистики:', err);
                    if (statsContent) {
                        statsContent.innerHTML = '<p>Помилка відображення статистики</p>';
                    }
                }
            } else {
                if (statsContent) {
                    statsContent.innerHTML += '<p>Немає даних для відображення</p>';
                }
            }
        } else {
            alert('Помилка завантаження статистики: ' + result.message);
        }
    } catch (error) {
        console.error('Помилка завантаження статистики:', error);
        alert('Помилка завантаження статистики');
    }
}

// Перемикати статус опитування
async function toggleSurveyStatus(surveyId, newStatus) {
    try {
        const response = await apiRequest(`/api/surveys/${surveyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive: newStatus })
        });

        if (!response) return;

        const result = await response.json();

        if (result.success) {
            loadUserSurveys(); // Оновити список
        } else {
            alert('Помилка оновлення статусу: ' + result.message);
        }

    } catch (error) {
        console.error('Помилка оновлення статусу:', error);
        alert('Помилка оновлення статусу');
    }
}

// Видалити опитування
async function deleteSurvey(surveyId) {
    if (!confirm('Ви впевнені, що хочете видалити це опитування? Всі відповіді будуть втрачені!')) {
        return;
    }

    try {
        const response = await apiRequest(`/api/surveys/${surveyId}`, {
            method: 'DELETE'
        });

        if (!response) return;

        const result = await response.json();

        if (result.success) {
            loadUserSurveys(); // Оновити список
        } else {
            alert('Помилка видалення: ' + result.message);
        }

    } catch (error) {
        console.error('Помилка видалення:', error);
        alert('Помилка видалення опитування');
    }
}

// Вийти з системи
function logout() {
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    }).then(() => {
        currentToken = null;
        currentUser = null;
        localStorage.removeItem('accessToken');
        window.location.href = '/';
    }).catch(error => {
        console.error('Помилка виходу:', error);
        // Все одно очищуємо дані і перенаправляємо
        currentToken = null;
        currentUser = null;
        localStorage.removeItem('accessToken');
        window.location.href = '/';
    });
}

// Функція копіювання посилання опитування
function copySurveyLink(url, button) {
    navigator.clipboard.writeText(url).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Скопійовано!';
        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
        }, 2000);
    }).catch(err => {
        console.error('Помилка копіювання:', err);
        alert('Не вдалося скопіювати посилання');
    });
}

// Функція для відображення результатів
function showResult(elementId, success, message, data = null) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const className = success ? 'success' : 'error';
    let content = `<div class="${className}">${message}</div>`;
    
    if (data) {
        content += `<div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">`;
        if (data.surveyId) {
            content += `<strong>ID опитування:</strong> ${data.surveyId}<br>`;
        }
        if (data.surveyLink) {
            const fullLink = window.location.origin + data.surveyLink;
            content += `<strong>Посилання:</strong> <a href="${fullLink}" target="_blank">${fullLink}</a>`;
        }
        content += `</div>`;
    }
    
    element.innerHTML = content;
}
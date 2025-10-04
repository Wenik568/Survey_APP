// Глобальні змінні
let currentSurvey = null;
let responses = {};

// Завантаження опитування при завантаженні сторінки
document.addEventListener('DOMContentLoaded', async () => {
    const uniqueLink = getUniqueLinkFromURL();
    if (uniqueLink) {
        await loadSurvey(uniqueLink);
    } else {
        showError('Неправильне посилання на опитування');
    }
});

// Отримання унікального посилання з URL
function getUniqueLinkFromURL() {
    const path = window.location.pathname;
    const match = path.match(/\/survey\/([^\/]+)$/);
    return match ? match[1] : null;
}

// Завантаження опитування
async function loadSurvey(uniqueLink) {
    try {
        const response = await fetch(`/api/surveys/public/${uniqueLink}`);
        const result = await response.json();

        if (result.success) {
            currentSurvey = result.data.survey;
            displaySurvey();
        } else {
            showError(result.message || 'Опитування не знайдено');
        }
    } catch (error) {
        console.error('Помилка завантаження опитування:', error);
        showError('Помилка завантаження опитування. Перевірте з\'єднання з інтернетом.');
    }
}

// Відображення опитування
function displaySurvey() {
    // Заголовок
    document.getElementById('surveyTitle').textContent = currentSurvey.title;
    
    // Опис
    const descContainer = document.getElementById('surveyDescriptionContainer');
    if (currentSurvey.description && currentSurvey.description.trim()) {
        descContainer.innerHTML = `
            <div class="survey-description">
                <h3>📄 Опис опитування</h3>
                <p>${currentSurvey.description}</p>
            </div>
        `;
    }

    // Оновлення лічильника питань
    updateQuestionCounter();

    // Генерація форми
    generateSurveyForm();

    // Показати контент
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('surveyContainer').style.display = 'block';

    // Додати обробник для кнопки відправки
    document.getElementById('submitButton').addEventListener('click', submitSurvey);

    // Додати обробники для відстеження прогресу
    addProgressTracking();
}

// Генерація форми опитування
function generateSurveyForm() {
    const formContainer = document.getElementById('surveyForm');
    let formHTML = '';

    currentSurvey.questions.forEach((question, index) => {
        const isRequired = question.required;
        const questionId = question._id;

        formHTML += `
            <div class="container question" id="question-${questionId}">
                <div class="question-title">
                    ${index + 1}. ${question.text}
                    ${isRequired ? '<span class="question-required">*</span>' : ''}
                </div>
                ${generateQuestionInput(question, index)}
            </div>
        `;
    });

    formContainer.innerHTML = formHTML;
}

// Генерація поля вводу для питання
function generateQuestionInput(question, index) {
    const questionId = question._id;
    
    switch (question.type) {
        case 'text':
            return `
                <input 
                    type="text" 
                    id="answer-${questionId}" 
                    placeholder="Введіть вашу відповідь"
                    data-question-id="${questionId}"
                    data-required="${question.required}"
                >
            `;

        case 'textarea':
            return `
                <textarea 
                    id="answer-${questionId}" 
                    placeholder="Введіть вашу відповідь"
                    data-question-id="${questionId}"
                    data-required="${question.required}"
                ></textarea>
            `;

        case 'radio':
            let radioHTML = '<div class="form-group">';
            question.options.forEach((option, optIndex) => {
                radioHTML += `
                    <label>
                        <input 
                            type="radio" 
                            name="question-${questionId}" 
                            value="${option.value}"
                            data-question-id="${questionId}"
                            data-required="${question.required}"
                        >
                        ${option.text}
                    </label>
                `;
            });
            radioHTML += '</div>';
            return radioHTML;

        case 'checkbox':
            let checkboxHTML = '<div class="form-group">';
            question.options.forEach((option, optIndex) => {
                checkboxHTML += `
                    <label>
                        <input 
                            type="checkbox" 
                            name="question-${questionId}" 
                            value="${option.value}"
                            data-question-id="${questionId}"
                            data-required="${question.required}"
                        >
                        ${option.text}
                    </label>
                `;
            });
            checkboxHTML += '</div>';
            return checkboxHTML;

        default:
            return `<p>Непідтримуваний тип питання: ${question.type}</p>`;
    }
}

// Додавання відстеження прогресу
function addProgressTracking() {
    // Додати обробники для всіх полів форми
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('change', updateProgress);
        input.addEventListener('input', updateProgress);
    });
}

// Оновлення прогресу
function updateProgress() {
    const totalQuestions = currentSurvey.questions.length;
    let answeredQuestions = 0;

    currentSurvey.questions.forEach(question => {
        const questionId = question._id;
        let hasAnswer = false;

        if (question.type === 'text' || question.type === 'textarea') {
            const input = document.getElementById(`answer-${questionId}`);
            if (input && input.value.trim()) {
                hasAnswer = true;
            }
        } else if (question.type === 'radio') {
            const radio = document.querySelector(`input[name="question-${questionId}"]:checked`);
            if (radio) {
                hasAnswer = true;
            }
        } else if (question.type === 'checkbox') {
            const checkboxes = document.querySelectorAll(`input[name="question-${questionId}"]:checked`);
            if (checkboxes.length > 0) {
                hasAnswer = true;
            }
        }

        if (hasAnswer) {
            answeredQuestions++;
        }
    });

    // Оновити прогрес бар
    const progress = (answeredQuestions / totalQuestions) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    
    // Оновити лічильник
    document.getElementById('questionCounter').textContent = 
        `Відповіли на ${answeredQuestions} з ${totalQuestions} питань`;
}

// Оновлення лічильника питань
function updateQuestionCounter() {
    const totalQuestions = currentSurvey.questions.length;
    document.getElementById('questionCounter').textContent = 
        `Питання 0 з ${totalQuestions}`;
}

// Збір відповідей з форми
function collectAnswers() {
    const answers = [];

    currentSurvey.questions.forEach(question => {
        const questionId = question._id;
        let answer = null;

        if (question.type === 'text' || question.type === 'textarea') {
            const input = document.getElementById(`answer-${questionId}`);
            if (input) {
                answer = input.value.trim();
            }
        } else if (question.type === 'radio') {
            const radio = document.querySelector(`input[name="question-${questionId}"]:checked`);
            if (radio) {
                answer = radio.value;
            }
        } else if (question.type === 'checkbox') {
            const checkboxes = document.querySelectorAll(`input[name="question-${questionId}"]:checked`);
            answer = Array.from(checkboxes).map(cb => cb.value);
        }

        answers.push({
            questionId: questionId,
            answer: answer
        });
    });

    return answers;
}

// Валідація відповідей
function validateAnswers(answers) {
    const errors = [];

    currentSurvey.questions.forEach((question, index) => {
        if (question.required) {
            const answer = answers.find(a => a.questionId === question._id);
            
            if (!answer || 
                answer.answer === null || 
                answer.answer === '' || 
                (Array.isArray(answer.answer) && answer.answer.length === 0)) {
                errors.push(`Питання ${index + 1} "${question.text}" є обов'язковим`);
            }
        }
    });

    return errors;
}

// Відправка опитування
async function submitSurvey() {
    const submitButton = document.getElementById('submitButton');
    const originalText = submitButton.textContent;
    
    try {
        // Блокувати кнопку
        submitButton.disabled = true;
        submitButton.textContent = '⏳ Відправляємо...';

        // Зібрати відповіді
        const answers = collectAnswers();

        // Валідація
        const errors = validateAnswers(answers);
        if (errors.length > 0) {
            alert('⚠️ Будь ласка, дайте відповідь на всі обов\'язкові питання (позначені зірочкою *):\n\n' + errors.join('\n'));

            // Прокрутити до першого обов'язкового питання без відповіді
            const firstErrorQuestion = currentSurvey.questions.find((q, idx) => {
                if (!q.required) return false;
                const answer = answers.find(a => a.questionId === q._id);
                return !answer || answer.answer === null || answer.answer === '' ||
                       (Array.isArray(answer.answer) && answer.answer.length === 0);
            });

            if (firstErrorQuestion) {
                const questionElement = document.getElementById(`question-${firstErrorQuestion._id}`);
                if (questionElement) {
                    questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    questionElement.style.border = '3px solid #f56565';
                    setTimeout(() => {
                        questionElement.style.border = '2px solid #e2e8f0';
                    }, 3000);
                }
            }

            return;
        }

        // Відправка на сервер
        const response = await fetch('/api/surveys/respond', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                surveyId: currentSurvey._id,
                answers: answers
            })
        });

        const result = await response.json();

        if (result.success) {
            showResult(true, result.message, 
                `Ваша відповідь збережена ${new Date().toLocaleString('uk-UA')}`
            );
            // Приховати форму
            document.getElementById('surveyForm').style.display = 'none';
            submitButton.style.display = 'none';
        } else {
            showResult(false, result.message);
        }

    } catch (error) {
        console.error('Помилка відправки:', error);
        showResult(false, 'Помилка відправки відповідей. Спробуйте ще раз.');
    } finally {
        // Розблокувати кнопку
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// Показати результат
function showResult(success, message, details = '') {
    const resultContainer = document.getElementById('resultContainer');
    const className = success ? 'success' : 'error';
    
    let resultHTML = `
        <div class="container">
            <div class="${className}">
                <h3>${success ? '✅ Успіх!' : '❌ Помилка'}</h3>
                <p>${message}</p>
                ${details ? `<p><small>${details}</small></p>` : ''}
            </div>
        </div>
    `;
    
    resultContainer.innerHTML = resultHTML;
    
    // Прокрутити до результату
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Показати помилку
function showError(message) {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('surveyContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}
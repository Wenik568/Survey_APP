// Функція для відображення результатів
function showResult(elementId, success, message, data = null) {
    const element = document.getElementById(elementId);
    const className = success ? 'success' : 'error';
    let content = `<div class="${className}">${message}</div>`;
    
    if (data) {
        content += `<div class="token-display"><strong>Дані:</strong><br>${JSON.stringify(data, null, 2)}</div>`;
    }
    
    element.innerHTML = content;
}

// Глобальна змінна для зберігання access token
let accessToken = null;

async function refreshAccessToken() {
    try {
        console.log('Спроба оновити access token...');
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            const result = await response.json();
            accessToken = result.data.accessToken;
            console.log('Access token оновлено автоматично');
            return true;
        } else {
            console.log('Не вдалося оновити токен - потрібен повторний вхід');
            accessToken = null;
            return false;
        }
    } catch (error) {
        console.error('Помилка оновлення токена:', error);
        return false;
    }
}

// Функція для виконання API запитів з автоматичним оновленням токена
async function apiRequest(url, options = {}) {
    if (accessToken) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
        };
    }

    options.credentials = 'include';

    let response = await fetch(url, options);

    if (response.status === 401 && accessToken) {
        const refreshed = await refreshAccessToken();
        
        if (refreshed) {
            options.headers['Authorization'] = `Bearer ${accessToken}`;
            response = await fetch(url, options);
        }
    }

    return response;
}

// Показати секцію профілю з кнопками управління
function showProfileSection(user) {
    const profileResult = document.getElementById('profileResult');
    
    profileResult.innerHTML = `
        <div class="success">
            <h3>Ваш профіль:</h3>
            <p><strong>Ім'я:</strong> ${user.username}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Роль:</strong> ${user.role}</p>
            <p><strong>Дата реєстрації:</strong> ${new Date(user.createdAt).toLocaleDateString('uk-UA')}</p>
        </div>
        
        <div style="margin-top: 15px; text-align: center;">
            <button id="goToSurveysBtn" style="background-color: #28a745; margin-right: 10px;">
                Управління опитуваннями
            </button>
            <button id="viewSessionsBtn" style="background-color: #17a2b8; margin-right: 10px;">
                Активні сесії
            </button>
            <button id="logoutBtn" style="background-color: #dc3545;">
                Вийти
            </button>
        </div>
    `;
    
    // Додати event listeners для кнопок
    document.getElementById('goToSurveysBtn').addEventListener('click', function() {
        goToSurveys(accessToken);
    });
    
    document.getElementById('viewSessionsBtn').addEventListener('click', viewActiveSessions);
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Реєстрація
async function registerUser() {
    console.log('=== ФУНКЦІЯ РЕЄСТРАЦІЇ ВИКЛИКАНА ===');
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    console.log('Дані форми реєстрації:', { username, email, password: password ? '[ПРИХОВАНО]' : 'ПОРОЖНЬО' });

    if (!username || !email || !password) {
        console.log('ПОМИЛКА: Не всі поля заповнені');
        showResult('registerResult', false, 'Будь ласка, заповніть всі поля');
        return;
    }

    const userData = { username, email, password };

    try {
        console.log('Відправляємо запит на реєстрацію...');
        
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        console.log('Статус відповіді реєстрації:', response.status);
        console.log('Об\'єкт відповіді:', response);

        const result = await response.json();
        console.log('JSON результат реєстрації:', result);
        
        if (result.success) {
            accessToken = result.data.accessToken;
            console.log('Реєстрація успішна, токен отримано, перенаправлення...');
            
            // Показати короткочасне повідомлення про успіх
            showResult('registerResult', true, `Вітаємо, ${result.data.user.username}! Перенаправляємо на дашборд...`);

            // Зберігаємо access token у localStorage
            localStorage.setItem('accessToken', accessToken);
            // Перенаправити через 1 секунду
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            
        } else {
            console.log('Помилка реєстрації:', result.message);
            showResult('registerResult', false, result.message);
        }
        
    } catch (error) {
        console.error('ПОМИЛКА FETCH РЕЄСТРАЦІЇ:', error);
        showResult('registerResult', false, 'Помилка з\'єднання: ' + error.message);
    }
}

// Вхід
async function loginUser() {
    console.log('=== ФУНКЦІЯ ВХОДУ ВИКЛИКАНА ===');
    
    const loginData = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value,
        rememberMe: document.getElementById('rememberMe').checked
    };

    console.log('Дані входу:', { email: loginData.email, password: loginData.password ? '[ПРИХОВАНО]' : 'ПОРОЖНЬО' });

    if (!loginData.email || !loginData.password) {
        console.log('ПОМИЛКА: Порожні поля входу');
        showResult('loginResult', false, 'Будь ласка, заповніть всі поля');
        return;
    }

    console.log('Відправляємо запит на вхід...');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(loginData)
        });

        console.log('Статус відповіді входу:', response.status);
        console.log('Об\'єкт відповіді входу:', response);

        const result = await response.json();
        console.log('JSON результат входу:', result);
        
        if (result.success) {
            accessToken = result.data.accessToken;
            console.log('Вхід успішний, токен отримано, перенаправлення...');
            
            // Показати короткочасне повідомлення про успіх
            showResult('loginResult', true, `Ласкаво просимо, ${result.data.user.username}! Перенаправляємо на дашборд...`);
            // Зберігаємо access token у localStorage
            localStorage.setItem('accessToken', accessToken);
            // Перенаправити через 1 секунду
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            
        } else {
            console.log('Помилка входу:', result.message);
            showResult('loginResult', false, result.message);
        }
        
    } catch (error) {
        console.error('ПОМИЛКА FETCH ВХОДУ:', error);
        showResult('loginResult', false, 'Помилка з\'єднання: ' + error.message);
    }
}

// Профіль
async function getProfile() {
    console.log('=== ФУНКЦІЯ ПРОФІЛЮ ВИКЛИКАНА ===');
    
    const token = document.getElementById('tokenInput').value || accessToken;
    
    if (!token) {
        console.log('ПОМИЛКА: Немає токена для отримання профілю');
        showResult('profileResult', false, 'Будь ласка, увійдіть в систему або введіть токен');
        return;
    }

    try {
        console.log('Відправляємо запит на профіль...');
        const response = await apiRequest('/api/auth/profile', {
            method: 'GET'
        });

        console.log('Статус відповіді профілю:', response.status);
        const result = await response.json();
        console.log('JSON результат профілю:', result);
        
        if (result.success) {
            showProfileSection(result.data.user);
        } else {
            console.log('Помилка отримання профілю:', result.message);
            showResult('profileResult', false, result.message);
        }
        
    } catch (error) {
        console.error('ПОМИЛКА FETCH ПРОФІЛЮ:', error);
        showResult('profileResult', false, 'Помилка з\'єднання: ' + error.message);
    }
}

// Перегляд активних сесій
async function viewActiveSessions() {
    console.log('=== ОТРИМАННЯ АКТИВНИХ СЕСІЙ ===');
    
    try {
        const response = await apiRequest('/api/auth/sessions');
        const result = await response.json();
        
        if (result.success) {
            let sessionsHtml = '<h4>Активні сесії:</h4><ul>';
            result.data.sessions.forEach(session => {
                sessionsHtml += `
                    <li>
                        <strong>${session.isCurrent ? '(Поточна) ' : ''}${new Date(session.createdAt).toLocaleString()}</strong><br>
                        IP: ${session.ipAddress}<br>
                        Браузер: ${session.userAgent}<br>
                        Завершується: ${new Date(session.expiresAt).toLocaleString()}
                    </li>
                `;
            });
            sessionsHtml += '</ul>';
            
            showResult('profileResult', true, sessionsHtml);
        } else {
            showResult('profileResult', false, result.message);
        }
    } catch (error) {
        showResult('profileResult', false, 'Помилка отримання сесій');
    }
}

// Вихід
async function logout() {
    console.log('=== ВИХІД З СИСТЕМИ ===');
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        const result = await response.json();
        
        if (result.success) {
            accessToken = null;
            document.getElementById('tokenInput').value = '';
            showResult('profileResult', true, 'Ви успішно вийшли з системи');
        } else {
            showResult('profileResult', false, result.message);
        }
        
    } catch (error) {
        showResult('profileResult', false, 'Помилка виходу: ' + error.message);
    }
}

// Перейти до сторінки опитувань
function goToSurveys(token) {
    window.location.href = '/surveys.html';
}

// Спроба автоматичного оновлення токена при завантаженні
// Спроба автоматичного оновлення токена при завантаженні
async function tryAutoRefresh() {
    console.log('=== СПРОБА АВТОМАТИЧНОГО ВХОДУ ===');
    
    try {
        const response = await fetch('/api/auth/verify-refresh', {
            credentials: 'include'
        });
        
        if (response.ok) {
            console.log('Знайдено refresh token, спробуємо оновити...');
            const refreshSuccess = await refreshAccessToken();
            
            if (refreshSuccess && accessToken) {
                try {
                    const profileResponse = await apiRequest('/api/auth/profile');
                    const profileResult = await profileResponse.json();
                    
                    if (profileResult.success) {
                        console.log('Автоматичний вхід успішний, перенаправлення...');
                        showResult('loginResult', true, `Автоматично увійшли в систему як ${profileResult.data.user.username}. Перенаправляємо...`);
                        
                        // Перенаправити через 1 секунду
                        setTimeout(() => {
                            window.location.href = `/surveys.html?token=${accessToken}`;
                        }, 1000);
                    }
                } catch (profileError) {
                    console.log('Помилка отримання профілю при автоматичному вході:', profileError);
                }
            } else {
                // Refresh token протермінувався - не показуємо помилку, просто логуємо
                console.log('Refresh token протермінувався, потрібен ручний вхід');
            }
        } else {
            console.log('Немає валідного refresh token');
        }
    } catch (error) {
        console.log('Автоматичний вхід неможливий:', error);
    }
}

// Ініціалізація після завантаження DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM ЗАВАНТАЖЕНИЙ ===');
    
    // Перевіряємо наявність елементів
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const profileBtn = document.getElementById('profileBtn');
    
    console.log('Кнопка реєстрації:', registerBtn ? 'ЗНАЙДЕНА' : 'НЕ ЗНАЙДЕНА');
    console.log('Кнопка входу:', loginBtn ? 'ЗНАЙДЕНА' : 'НЕ ЗНАЙДЕНА');
    console.log('Кнопка профілю:', profileBtn ? 'ЗНАЙДЕНА' : 'НЕ ЗНАЙДЕНА');
    
    // Додаємо event listeners
    if (registerBtn) {
        registerBtn.addEventListener('click', registerUser);
        console.log('Event listener для реєстрації додано');
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', loginUser);
        console.log('Event listener для входу додано');
    }
    
    if (profileBtn) {
        profileBtn.addEventListener('click', getProfile);
        console.log('Event listener для профілю додано');
    }
    
    // Спробуємо автоматичний вхід
    tryAutoRefresh();
});
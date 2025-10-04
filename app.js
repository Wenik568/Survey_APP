const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./config/passport');
const path = require('path');

// Створюємо Express додаток
const app = express();

// Middleware для cookies
app.use(cookieParser());

// Налаштування сесії для Passport
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 години
  }
}));

// Ініціалізація Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware для безпеки з оновленим CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
}));

// CORS налаштування для підтримки credentials (cookies)
app.use(cors({
  origin: true, // Тимчасово дозволяємо всі домени для тестування
  credentials: true,
  optionsSuccessStatus: 200
}));

// Налаштування trust proxy для правильного отримання IP адреси
app.set('trust proxy', 1);

// Налаштування обслуговування статичних файлів
app.use(express.static('public', {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  }
}));

// Обмеження запитів з різними лімітами для різних ендпойнтів
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 500, // максимум 500 запитів за 15 хвилин
  message: {
    success: false,
    message: 'Занадто багато запитів з цієї IP адреси. Спробуйте пізніше.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Більш суворий ліміт для auth ендпойнтів
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 2000, // максимум 2000 спроб входу за 15 хвилин
  message: {
    success: false,
    message: 'Занадто багато спроб входу. Спробуйте через 15 хвилин.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Застосування загального ліміту
app.use(generalLimiter);

// Middleware для обробки JSON та URL-encoded даних
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статичні файли
app.use(express.static(path.join(__dirname, 'public')));

// Налаштування шаблонного двигуна
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========== МАРШРУТИ ==========

// Базовий маршрут
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Маршрут для публічної сторінки опитування
app.get('/survey/:uniqueLink', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'survey.html'));
});

// Маршрут для перевірки здоров'я
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API health check для Railway
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    service: 'backend'
  });
});

// ========== API МАРШРУТИ ==========

// Auth маршрути з обмеженням запитів
app.use('/api/auth', authLimiter, require('./routes/auth'));

// Google OAuth маршрути
app.use('/auth', require('./routes/googleAuth'));

// Surveys маршрути
app.use('/api/surveys', require('./routes/surveys'));

// Export маршрути
app.use('/api/export', require('./routes/export'));

// AI маршрути
app.use('/api/ai', require('./routes/ai'));

// ========== ТЕСТОВІ МАРШРУТИ (тільки для розробки) ==========

if (process.env.NODE_ENV !== 'production') {
  // Тестовий маршрут для перевірки моделей
  app.get('/test-models', async (req, res) => {
    try {
      const User = require('./models/User');
      const Survey = require('./models/Survey');
      const Response = require('./models/Response');
      const RefreshToken = require('./models/RefreshToken');
      
      res.json({
        message: 'Моделі успішно завантажено!',
        models: {
          User: 'Готово',
          Survey: 'Готово', 
          Response: 'Готово',
          RefreshToken: 'Готово (Новий!)'
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Помилка завантаження моделей',
        details: error.message
      });
    }
  });

  // Тестовий маршрут для перевірки cookies
  app.get('/test-cookies', (req, res) => {
    res.json({
      message: 'Тест cookies',
      cookies: req.cookies,
      hasRefreshToken: !!req.cookies.refreshToken
    });
  });
}

// ========== ОБРОБКА ПОМИЛОК ==========

// Обробка 404 помилок тільки для API маршрутів
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API маршрут не знайдено',
    path: req.originalUrl
  });
});

// Глобальний обробник помилок
app.use((err, req, res, next) => {
  console.error('❌ Глобальна помилка:', err.stack);
  
  // Помилка валідації Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Помилка валідації',
      errors
    });
  }

  // Помилка дублювання ключа MongoDB
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} вже використовується`
    });
  }

  // JWT помилки
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Недійсний токен'
    });
  }

  // Загальна помилка сервера
  res.status(500).json({
    success: false,
    message: 'Внутрішня помилка сервера',
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.message,
      stack: err.stack 
    })
  });
});

module.exports = app;
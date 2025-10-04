const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Перевірка JWT токена
const protect = async (req, res, next) => {
  let token;

  // Отримання токена з заголовка Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Перевірка наявності токена
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Доступ заборонено. Access token не знайдено',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    // Перевірка та декодування токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Пошук користувача
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Користувач не знайдений або заблокований',
        code: 'USER_NOT_FOUND'
      });
    }

    // Додавання користувача в req для використання в наступних middleware
    req.user = user;
    next();

  } catch (error) {
    console.error('Помилка автентифікації:', error);
    
    // Різні типи помилок JWT
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token прострочений',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Недійсний access token',
        code: 'TOKEN_INVALID'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Помилка автентифікації',
      code: 'AUTH_ERROR'
    });
  }
};

// Перевірка ролі адміністратора
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'адміністратор') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Доступ заборонено. Потрібні права адміністратора',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
};

// Middleware для опціональної автентифікації (не обов'язковий токен)
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    // При помилці просто продовжуємо без користувача
    req.user = null;
    next();
  }
};

// Перевірка refresh токена (для ендпойнтів що працюють з refresh токенами)
const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token не знайдено в cookies',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Можна додати додаткову валідацію refresh токена тут
    req.refreshToken = refreshToken;
    next();

  } catch (error) {
    console.error('Помилка валідації refresh токена:', error);
    res.status(401).json({
      success: false,
      message: 'Помилка валідації refresh токена',
      code: 'REFRESH_TOKEN_ERROR'
    });
  }
};

// Middleware для логування запитів автентифікації
const logAuth = (req, res, next) => {
  console.log(`[AUTH] ${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
};

module.exports = {
  protect,
  admin,
  optionalAuth,
  validateRefreshToken,
  logAuth
};
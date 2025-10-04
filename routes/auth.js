const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  logoutAllDevices,
  getProfile,
  getActiveSessions,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { protect, validateRefreshToken, logAuth } = require('../middleware/auth');

const router = express.Router();

// Rate limiter для forgot-password (3 запити на 15 хвилин)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 3, // максимум 3 запити
  message: {
    success: false,
    message: 'Занадто багато спроб відновлення пароля. Спробуйте через 15 хвилин'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter для reset-password (5 спроб на 15 хвилин)
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 5, // максимум 5 спроб
  message: {
    success: false,
    message: 'Занадто багато спроб зміни пароля. Спробуйте через 15 хвилин'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter для login (10 спроб на 15 хвилин)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Занадто багато спроб входу. Спробуйте через 15 хвилин'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware для логування всіх auth запитів
router.use(logAuth);

// ========== ПУБЛІЧНІ МАРШРУТИ ==========

// Валідація токена
router.get('/validate', protect, (req, res) => {
    res.status(200).json({ success: true, message: 'Token is valid' });
});

// Реєстрація користувача
router.post('/register', registerUser);

// Вхід користувача (з rate limiting)
router.post('/login', loginLimiter, loginUser);

// Оновлення access токена (використовує refresh token з cookie)
router.post('/refresh', refreshTokens);

// Запит на відновлення пароля (з rate limiting)
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);

// Відновлення пароля за токеном (з rate limiting)
router.post('/reset-password', resetPasswordLimiter, resetPassword);

// ========== ЗАХИЩЕНІ МАРШРУТИ ==========

// Профіль користувача (потребує access token)
router.get('/profile', protect, getProfile);

// Вихід (деактивує refresh token)
router.post('/logout', logoutUser);

// Вихід з усіх пристроїв (потребує access token)
router.post('/logout-all', protect, logoutAllDevices);

// Отримання списку активних сесій
router.get('/sessions', protect, getActiveSessions);

// ========== ДОДАТКОВІ УТИЛІТНІ МАРШРУТИ ==========

// Перевірка дійсності access токена
router.get('/verify', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Access token дійсний',
    data: {
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    }
  });
});

// Перевірка дійсності refresh токена
router.get('/verify-refresh', validateRefreshToken, (req, res) => {
  res.json({
    success: true,
    message: 'Refresh token знайдено в cookies',
    hasRefreshToken: true
  });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

// Початок Google OAuth процесу
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Callback після автентифікації Google
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
  async (req, res) => {
    try {
      // Генерація JWT токенів (використовуємо той самий формат що й в authController)
      const accessToken = jwt.sign(
        {
          id: req.user._id  // Виправлено: використовуємо 'id' замість 'userId'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '8h' }
      );

      const refreshToken = jwt.sign(
        {
          id: req.user._id,  // Виправлено: використовуємо 'id' замість 'userId'
          type: 'refresh'
        },
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
      );

      // Зберігаємо refresh token в базі
      const RefreshToken = require('../models/RefreshToken');
      await RefreshToken.create({
        token: refreshToken,
        user: req.user._id, // Виправлено з userId на user
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 днів
      });

      // Встановлюємо refresh token в httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 днів
      });

      // Редирект на React додаток з токеном в URL (тимчасово для передачі в localStorage)
      const redirectUrl = process.env.CLIENT_URL || 'http://localhost:5176';
      res.redirect(`${redirectUrl}/auth/callback?token=${accessToken}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/?error=auth_failed');
    }
  }
);

// Logout
router.get('/logout', async (req, res) => {
  try {
    // Видаляємо refresh token з бази
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const RefreshToken = require('../models/RefreshToken');
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    // Очищаємо cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // Виходимо з passport сесії
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/');
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.redirect('/');
  }
});

module.exports = router;
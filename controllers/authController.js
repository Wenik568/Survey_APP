const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../config/emailService');

// Генерація JWT токена
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '8h'
  });
};

// Генерація refresh токена
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Генерація обох токенів
const generateTokens = (userId) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken();
  return { accessToken, refreshToken };
};

// Збереження refresh токена в БД
const saveRefreshToken = async (token, userId, req) => {
  const refreshTokenDoc = new RefreshToken({
    token,
    user: userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 днів
    userAgent: req.get('User-Agent') || '',
    ipAddress: req.ip || req.connection.remoteAddress || ''
  });
  
  await refreshTokenDoc.save();
  return refreshTokenDoc;
};

// Реєстрація користувача
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Перевірка чи всі поля заповнені
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Будь ласка, заповніть всі поля'
      });
    }

    // Перевірка чи користувач вже існує
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Користувач з таким email або ім\'ям вже існує'
      });
    }

    // Створення нового користувача
    const user = await User.create({
      username,
      email,
      password,
      name: username, // Додаємо name для уніфікації з Google OAuth
      isEmailVerified: false
    });

    // Генерація токенів
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Збереження refresh токена
    await saveRefreshToken(refreshToken, user._id, req);

    // Встановлення httpOnly cookie для refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів
      path: '/'
    });

    res.status(201).json({
      success: true,
      message: 'Користувач успішно зареєстрований',
      data: {
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        },
        accessToken,
        tokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m'
      }
    });

  } catch (error) {
    console.error('Помилка реєстрації:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Вхід користувача
const loginUser = async (req, res) => {
  try {
  const { email, password, rememberMe } = req.body;

    // Перевірка чи всі поля заповнені
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Будь ласка, введіть email та пароль'
      });
    }

    // Пошук користувача
    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Неправильний email або пароль'
      });
    }

    // Перевірка пароля
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Неправильний email або пароль'
      });
    }

    // Деактивація старих refresh токенів цього користувача (опціонально)
    await RefreshToken.updateMany(
      { user: user._id, isActive: true },
      { isActive: false }
    );

    // Генерація нових токенів
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Збереження нового refresh токена
    await saveRefreshToken(refreshToken, user._id, req);

    // Встановлення httpOnly cookie для refresh token
    // Якщо rememberMe true — 30 днів, інакше 1 день
    const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 1 * 24 * 60 * 60 * 1000;
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshMaxAge,
      path: '/'
    });

    res.json({
      success: true,
      message: 'Успішний вхід',
      data: {
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        },
        accessToken,
        tokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m'
      }
    });

  } catch (error) {
    console.error('Помилка входу:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Оновлення access токена
const refreshTokens = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token не знайдено'
      });
    }

    // Пошук активного refresh токена
    const tokenDoc = await RefreshToken.findOne({
      token: refreshToken,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).populate('user');

    if (!tokenDoc || !tokenDoc.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Недійсний або протермінований refresh token'
      });
    }

    // Генерація нових токенів
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenDoc.user._id);

    // Деактивація старого токена (token rotation)
    tokenDoc.isActive = false;
    await tokenDoc.save();

    // Створення нового refresh token
    await saveRefreshToken(newRefreshToken, tokenDoc.user._id, req);

    // Оновлення cookie з новим refresh token
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів
      path: '/'
    });

    res.json({
      success: true,
      message: 'Токен оновлено',
      data: {
        accessToken,
        tokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m'
      }
    });

  } catch (error) {
    console.error('Помилка оновлення токена:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка оновлення токена',
      error: error.message
    });
  }
};

// Вихід користувача
const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      // Деактивація refresh token в БД
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken, isActive: true },
        { isActive: false }
      );
    }

    // Видалення cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Успішний вихід'
    });

  } catch (error) {
    console.error('Помилка при виході:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при виході',
      error: error.message
    });
  }
};

// Вихід з усіх пристроїв
const logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user.id;

    // Деактивація всіх refresh токенів користувача
    await RefreshToken.updateMany(
      { user: userId, isActive: true },
      { isActive: false }
    );

    // Видалення cookie поточного пристрою
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Вихід з усіх пристроїв виконано'
    });

  } catch (error) {
    console.error('Помилка при виході з усіх пристроїв:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при виході з усіх пристроїв',
      error: error.message
    });
  }
};

// Отримання профілю користувача
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Користувач не знайдений'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    console.error('Помилка отримання профілю:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Отримання активних сесій користувача
const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await RefreshToken.find({
      user: userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).select('createdAt userAgent ipAddress expiresAt').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session._id,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          userAgent: session.userAgent || 'Невідомо',
          ipAddress: session.ipAddress || 'Невідомо',
          isCurrent: req.cookies.refreshToken && 
                     session.token === req.cookies.refreshToken
        }))
      }
    });

  } catch (error) {
    console.error('Помилка отримання сесій:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Запит на відновлення пароля
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Перевірка чи email заповнений
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Будь ласка, введіть email'
      });
    }

    // Пошук користувача
    const user = await User.findOne({ email });

    if (!user) {
      // Повертаємо той самий відповідь незалежно від того, чи існує користувач
      // для безпеки (не розкриваємо інформацію про існування email)
      return res.json({
        success: true,
        message: 'Якщо такий email існує в системі, на нього буде відправлено лист з інструкціями для відновлення пароля'
      });
    }

    // Створення токену для відновлення пароля
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Відправка email
    const emailResult = await emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.username
    );

    if (!emailResult.success) {
      // Якщо email не відправився, очищаємо токен
      user.clearPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Помилка відправки email. Спробуйте пізніше'
      });
    }

    res.json({
      success: true,
      message: 'Лист з інструкціями для відновлення пароля відправлено на ваш email'
    });

  } catch (error) {
    console.error('Помилка forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

// Відновлення пароля
const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    // Перевірка чи всі поля заповнені
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Будь ласка, заповніть всі поля'
      });
    }

    // Перевірка чи паролі співпадають
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Паролі не співпадають'
      });
    }

    // Перевірка довжини пароля
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Пароль повинен містити мінімум 6 символів'
      });
    }

    // Хешування токена для пошуку в БД
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Пошук користувача з дійсним токеном
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Недійсний або протермінований токен відновлення пароля'
      });
    }

    // Оновлення пароля
    user.password = password;
    user.clearPasswordResetToken();
    await user.save();

    // Деактивація всіх старих refresh токенів для безпеки
    await RefreshToken.updateMany(
      { user: user._id, isActive: true },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Пароль успішно оновлено. Тепер ви можете увійти в систему з новим паролем'
    });

  } catch (error) {
    console.error('Помилка reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера',
      error: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  logoutAllDevices,
  getProfile,
  getActiveSessions,
  forgotPassword,
  resetPassword
};
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: function() {
      // username обов'язкове тільки якщо немає googleId
      return !this.googleId;
    },
    unique: true,
    sparse: true, // Дозволяє null значення для unique полів
    trim: true,
    minlength: [3, 'Ім\'я користувача повинно містити мінімум 3 символи']
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email обов\'язковий'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Введіть правильний email']
  },
  password: {
    type: String,
    required: function() {
      // password обов'язковий тільки якщо немає googleId
      return !this.googleId;
    },
    minlength: [6, 'Пароль повинен містити мінімум 6 символів']
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Дозволяє null значення для unique полів
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['користувач', 'адміністратор'],
    default: 'користувач'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  }
});

// Шифрування пароля перед збереженням
userSchema.pre('save', async function(next) {
  // Якщо пароль не змінювався, переходимо далі
  if (!this.isModified('password')) return next();

  try {
    // Шифруємо пароль
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Метод для перевірки пароля
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Метод для створення токену відновлення пароля
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 година

  return resetToken;
};

// Метод для очищення токену відновлення пароля
userSchema.methods.clearPasswordResetToken = function() {
  this.passwordResetToken = null;
  this.passwordResetExpires = null;
};

// Приховуємо пароль та reset токени при виведенні JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
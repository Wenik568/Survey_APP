const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  userAgent: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Індекси для швидкого пошуку
refreshTokenSchema.index({ token: 1 }, { unique: true });
refreshTokenSchema.index({ user: 1, isActive: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Метод для перевірки чи токен ще дійсний
refreshTokenSchema.methods.isValid = function() {
  return this.isActive && this.expiresAt > new Date();
};

// Статичний метод для очищення протермінованих токенів
refreshTokenSchema.statics.cleanExpired = async function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false }
    ]
  });
};

// Middleware для автоматичного видалення протермінованих токенів
refreshTokenSchema.pre('save', function(next) {
  // Переконуємося що дата експірації встановлена
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 днів
  }
  next();
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
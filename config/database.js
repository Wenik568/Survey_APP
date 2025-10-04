const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
    // ...можливі додаткові опції...
    });

    console.log(`✅ MongoDB підключено: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Помилка підключення до MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
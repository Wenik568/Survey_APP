const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/database');

connectDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
  console.log(`Посилання: http://localhost:3000`);
});
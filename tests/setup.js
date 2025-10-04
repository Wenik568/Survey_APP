// Test setup file
require('dotenv').config();
const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';

// Use separate test database - replace production DB name with test DB name
if (process.env.MONGODB_URI) {
  process.env.MONGODB_URI = process.env.MONGODB_URI.replace('survey-app', 'survey-app-test');
}
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.ACCESS_TOKEN_EXPIRY = '8h';

// Mock Google OAuth credentials for testing
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/auth/google/callback';

// Mock Gemini API key
process.env.GEMINI_API_KEY = 'test-gemini-api-key';

// Mock other configs
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.SESSION_SECRET = 'test-session-secret';

// Mock email service credentials
process.env.EMAIL_PROVIDER = 'mailtrap';
process.env.MAILTRAP_USER = 'test-mailtrap-user';
process.env.MAILTRAP_PASS = 'test-mailtrap-pass';

// Increase timeout for database operations
jest.setTimeout(30000);

// Properly close connections after all tests
afterAll(async () => {
  try {
    // Close all mongoose connections
    await mongoose.disconnect();

    // Force close after timeout
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error('Error closing connections:', error);
  }
});

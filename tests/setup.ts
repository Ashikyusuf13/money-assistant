/**
 * Global test setup.
 * Sets test environment variables before any module import resolves them.
 */

// Must be set BEFORE importing any config modules
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '5001';
process.env['APP_NAME'] = 'money-assistant-api-test';
process.env['MONGODB_URI'] = 'mongodb://127.0.0.1:27017/money_assistant_test';
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-minimum-32-characters-long';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-minimum-32-characters-long';
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '30d';
process.env['BCRYPT_ROUNDS'] = '4'; // Low for test speed
process.env['CORS_ORIGINS'] = 'http://localhost:3000';
process.env['RATE_LIMIT_WINDOW_MS'] = '900000';
process.env['RATE_LIMIT_MAX'] = '10000'; // high for tests
process.env['AUTH_RATE_LIMIT_MAX'] = '10000';
process.env['LOG_LEVEL'] = 'error'; // suppress noise in tests
process.env['PASSWORD_RESET_SECRET'] = 'test-password-reset-secret-32chars';

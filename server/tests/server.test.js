const request = require('supertest');
const { app } = require('../index');

describe('Server', () => {
  test('should respond with health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('OK');
    expect(response.body.timestamp).toBeDefined();
  });

  test('should respond with API info', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200);

    expect(response.body.message).toBe('Turnship API v1');
  });
});

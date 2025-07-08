const request = require('supertest');
const express = require('express');

describe('Auth Router Error Handler', () => {
  let app;
  let finalHandler;

  beforeEach(() => {
    jest.resetModules();
    const baseRouter = require('../routes/auth');
    const errorLayer = baseRouter.stack.find((l) => !l.route && l.handle.length === 4);
    const errorMiddleware = errorLayer.handle;

    const router = express.Router();
    router.get('/trigger-error', (req, res, next) => {
      next(new Error('test-error'));
    });
    router.use(errorMiddleware);

    app = express();
    app.use(express.json());
    app.use('/auth', router);

    finalHandler = jest.fn((err, req, res, next) => next());
    app.use(finalHandler);
  });

  it('should send formatted error and propagate to next handler', async () => {
    const response = await request(app)
      .get('/auth/trigger-error')
      .expect(500);

    expect(response.body.error).toBe('Authentication service error');
    expect(finalHandler).toHaveBeenCalled();
  });
});

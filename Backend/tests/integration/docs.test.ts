import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('API Documentation & OpenAPI Integration Tests', () => {
  it('serves OpenAPI 3.0 specification JSON at /api/v1/docs/openapi.json', async () => {
    const res = await request(app).get('/api/v1/docs/openapi.json');

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('Money Assistant API');
    expect(res.body.paths['/health']).toBeDefined();
    expect(res.body.paths['/transactions']).toBeDefined();
    expect(res.body.paths['/salary']).toBeDefined();
    expect(res.body.paths['/dashboard']).toBeDefined();
    expect(res.body.paths['/budgets']).toBeDefined();
    expect(res.body.paths['/goals']).toBeDefined();
    expect(res.body.paths['/reports/period']).toBeDefined();
    expect(res.body.paths['/assistant/ask']).toBeDefined();
  });

  it('serves interactive Swagger documentation HTML page at /api/v1/docs', async () => {
    const res = await request(app).get('/api/v1/docs');

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('Money Assistant API Docs');
    expect(res.text).toContain('swagger-ui');
  });
});

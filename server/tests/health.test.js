import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';

describe('System Health & Perimeter Tests', () => {
  it('GET /api/v1/health should return 200 and operational system status', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.data.service).toBe('HelpDesk Hub API');
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('GET /api/v1/nonexistent should return 404 with AppError format', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('API endpoint not found');
  });
});

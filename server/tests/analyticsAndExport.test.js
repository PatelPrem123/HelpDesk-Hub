import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import { Category } from '../src/models/Category.js';
import { TICKET_PRIORITY } from '../src/config/constants.js';

describe('Analytics, Workload, CSV/Excel Export & Audit Suite', () => {
  let adminToken, employeeToken, testCategory;

  beforeEach(async () => {
    testCategory = await Category.create({
      name: 'Executive Systems',
      subcategories: ['Boardroom AV', 'C-Suite Laptop'],
      defaultPriority: TICKET_PRIORITY.HIGH
    });

    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Director Admin',
      email: 'director@corporate.internal',
      password: 'SecurePassword123!',
      department: 'Executive IT'
    });
    adminToken = adminRes.body.data.token;

    const empRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Grace Employee',
      email: 'grace@corporate.internal',
      password: 'SecurePassword123!',
      department: 'Legal'
    });
    employeeToken = empRes.body.data.token;

    // Create a ticket with formula injection probe
    await request(app)
      .post('/api/v1/tickets')
      .set('Cookie', [`token=${employeeToken}`])
      .send({
        title: '=CMD|\' /C calc\'!A0', // Formula Injection payload
        description: 'Testing spreadsheet export security against command execution.',
        category: testCategory._id.toString(),
        subcategory: 'Boardroom AV',
        priority: TICKET_PRIORITY.HIGH
      });
  });

  it('GET /api/v1/analytics/overview: Administrator receives KPI metrics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalTickets).toBeGreaterThanOrEqual(1);
    expect(res.body.data.summary.openTickets).toBeDefined();
    expect(res.body.data.summary.mttrHours).toBeDefined();
  });

  it('RBAC Guard: Employee receives 403 Forbidden on analytics overview', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Cookie', [`token=${employeeToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/analytics/workload: Returns workload distribution per technician', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/workload')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.technicians).toBeInstanceOf(Array);
  });

  it('GET /api/v1/analytics/export/csv: Generates CSV and escapes formula injection payloads', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export/csv')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="helpdesk_hub_tickets.csv"');

    // Formula injection verification: '=CMD' must be prefixed with single quote '\'=CMD'
    expect(res.text).toContain("'=CMD");
  });

  it('GET /api/v1/analytics/export/xlsx: Generates binary Excel workbook', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export/xlsx')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  it('GET /api/v1/analytics/audit-logs: Administrator can inspect immutable forensic ledger', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/audit-logs')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toBeInstanceOf(Array);
    expect(res.body.data.logs.length).toBeGreaterThan(0);
  });
});

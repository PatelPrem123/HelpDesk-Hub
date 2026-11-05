import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import { Category } from '../src/models/Category.js';
import { TICKET_PRIORITY } from '../src/config/constants.js';

describe('Comments, Privacy & File Attachment Hardening Suite', () => {
  let employeeToken, techToken, testTicketId;

  beforeEach(async () => {
    // 1. Create Category
    const category = await Category.create({
      name: 'Network Infrastructure',
      subcategories: ['Switch Outage', 'DHCP Scope'],
      defaultPriority: TICKET_PRIORITY.HIGH
    });

    // 2. Register first user (Admin/Tech)
    const techRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Lead Engineer',
      email: 'lead.tech@corporate.internal',
      password: 'SecurePassword123!',
      department: 'IT Infrastructure'
    });
    techToken = techRes.body.data.token;

    // 3. Register second user (Employee)
    const empRes = await request(app).post('/api/v1/auth/register').send({
      name: 'David Requester',
      email: 'david.emp@corporate.internal',
      password: 'SecurePassword123!',
      department: 'Operations'
    });
    employeeToken = empRes.body.data.token;

    // 4. Create Ticket
    const ticketRes = await request(app)
      .post('/api/v1/tickets')
      .set('Cookie', [`token=${employeeToken}`])
      .send({
        title: 'Floor 3 Switch Offline',
        description: 'No network connectivity on all ports of rack switch 3B.',
        category: category._id.toString(),
        subcategory: 'Switch Outage',
        priority: TICKET_PRIORITY.HIGH
      });
    testTicketId = ticketRes.body.data.ticket._id;
  });

  it('POST /comments should post public comment', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set('Cookie', [`token=${employeeToken}`])
      .send({
        content: 'I verified the power cable is firmly seated.'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comment.content).toBe('I verified the power cable is firmly seated.');
    expect(res.body.data.comment.isInternal).toBe(false);
  });

  it('POST /comments: Technician posts confidential internal diagnostic note', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set('Cookie', [`token=${techToken}`])
      .send({
        content: 'Internal diagnosis: Core routing loop at 10.10.4.1. Escalating to Cisco TAC.',
        isInternal: true
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comment.isInternal).toBe(true);
  });

  it('CRITICAL PRIVACY TEST: Employee GET /comments MUST NEVER leak records where isInternal === true', async () => {
    // 1. Post Public Comment
    await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set('Cookie', [`token=${employeeToken}`])
      .send({ content: 'Public user message 1' });

    // 2. Post Confidential Internal Note
    await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set('Cookie', [`token=${techToken}`])
      .send({
        content: 'CONFIDENTIAL: Internal server credentials root:Alpine123 on switch management IP',
        isInternal: true
      });

    // 3. Employee retrieves comments
    const empGetRes = await request(app)
      .get(`/api/v1/tickets/${testTicketId}/comments`)
      .set('Cookie', [`token=${employeeToken}`]);

    expect(empGetRes.status).toBe(200);
    const commentsSeenByEmployee = empGetRes.body.data.comments;

    // Verify zero leaked internal comments
    expect(commentsSeenByEmployee.length).toBe(1);
    expect(commentsSeenByEmployee.some(c => c.isInternal === true)).toBe(false);
    expect(commentsSeenByEmployee[0].content).toBe('Public user message 1');

    // 4. Technician retrieves comments (should see both)
    const techGetRes = await request(app)
      .get(`/api/v1/tickets/${testTicketId}/comments`)
      .set('Cookie', [`token=${techToken}`]);

    expect(techGetRes.status).toBe(200);
    expect(techGetRes.body.data.comments.length).toBe(2);
    expect(techGetRes.body.data.comments.some(c => c.isInternal === true)).toBe(true);
  });

  it('File Upload Filter: Prohibited executable (.exe) must be rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments/attachments`)
      .set('Cookie', [`token=${employeeToken}`])
      .attach('file', Buffer.from('MZ...fake executable binary payload'), 'exploit.exe');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Prohibited file format');
  });

  it('File Upload: Legitimate log file (.txt) accepted and renamed to UUID', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments/attachments`)
      .set('Cookie', [`token=${employeeToken}`])
      .attach('file', Buffer.from('Error log: connection reset by peer at 14:00:22'), 'debug.txt');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const attachment = res.body.data.attachment;
    expect(attachment.originalName).toBe('debug.txt');
    // Stored path must be UUID format with .txt extension
    expect(attachment.storagePath).toMatch(/^[0-9a-fA-F-]{36}\.txt$/);
  });
});

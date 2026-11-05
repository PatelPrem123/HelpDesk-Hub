import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { ROLES, TICKET_STATUS, TICKET_PRIORITY } from '../src/config/constants.js';

describe('Ticket Creation, SLA & Concurrency Suite', () => {
  let employeeToken, techToken, testCategory;

  beforeEach(async () => {
    // 1. Create Category
    testCategory = await Category.create({
      name: 'Hardware & Peripherals',
      subcategories: ['Laptop Display', 'RAM Failure', 'Docking Station'],
      defaultPriority: TICKET_PRIORITY.HIGH
    });

    // 2. Register first user (Admin/Tech)
    const techRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Bob Technician',
      email: 'bob.tech@corporate.internal',
      password: 'SecurePassword123!',
      department: 'IT Support'
    });
    techToken = techRes.body.data.token;

    // 3. Register second user (Employee)
    const empRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Charlie Employee',
      email: 'charlie.emp@corporate.internal',
      password: 'SecurePassword123!',
      department: 'Marketing'
    });
    employeeToken = empRes.body.data.token;
  });

  it('POST /api/v1/tickets should create ticket with atomic sequence HD-YYYY-XXXX', async () => {
    const currentYear = new Date().getFullYear();

    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Cookie', [`token=${employeeToken}`])
      .send({
        title: 'Flickering Laptop Screen',
        description: 'Screen randomly flashes black when connected to external monitor.',
        category: testCategory._id.toString(),
        subcategory: 'Laptop Display',
        priority: TICKET_PRIORITY.HIGH
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const ticket = res.body.data.ticket;
    expect(ticket.ticketNumber).toMatch(new RegExp(`^HD-${currentYear}-\\d{4}$`));
    expect(ticket.status).toBe(TICKET_STATUS.NEW);
    expect(ticket.firstResponseDeadline).toBeDefined();
    expect(ticket.resolutionDeadline).toBeDefined();
    expect(new Date(ticket.resolutionDeadline)).toBeInstanceOf(Date);
  });

  it('BOLA / IDOR Defense: Employee cannot view another user ticket', async () => {
    // Employee Charlie creates ticket
    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Cookie', [`token=${employeeToken}`])
      .send({
        title: 'Charlie Confidential Issue',
        description: 'Private confidential ticket data.',
        category: testCategory._id.toString(),
        subcategory: 'RAM Failure',
        priority: TICKET_PRIORITY.MEDIUM
      });

    const ticketId = createRes.body.data.ticket._id;

    // Register third user (Eve Employee)
    const eveRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Eve Intruder',
      email: 'eve@corporate.internal',
      password: 'SecurePassword123!',
      department: 'Legal'
    });
    const eveToken = eveRes.body.data.token;

    // Eve attempts to view Charlie's ticket
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Cookie', [`token=${eveToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Forbidden');
  });

  it('FSM Validation: Illegal status transition New -> Closed must throw 400 Bad Request', async () => {
    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Cookie', [`token=${employeeToken}`])
      .send({
        title: 'Cannot Connect to VPN',
        description: 'Authentication error 800 received when connecting to corporate VPN.',
        category: testCategory._id.toString(),
        subcategory: 'Docking Station',
        priority: TICKET_PRIORITY.HIGH
      });

    const ticketId = createRes.body.data.ticket._id;

    // Attempt illegal transition from New directly to Closed
    const res = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Cookie', [`token=${techToken}`])
      .send({
        status: TICKET_STATUS.CLOSED
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid state transition');
  });

  it('Concurrency Safety: Simultaneous ticket creation generates non-colliding sequential IDs', async () => {
    const concurrentRequests = 10;
    const currentYear = new Date().getFullYear();

    const promises = Array.from({ length: concurrentRequests }, (_, i) =>
      request(app)
        .post('/api/v1/tickets')
        .set('Cookie', [`token=${employeeToken}`])
        .send({
          title: `Concurrent Ticket Load Test ${i + 1}`,
          description: `Testing atomic MongoDB counter sequencing under simultaneous load #${i + 1}.`,
          category: testCategory._id.toString(),
          subcategory: 'Laptop Display',
          priority: TICKET_PRIORITY.LOW
        })
    );

    const responses = await Promise.all(promises);

    const ticketNumbers = responses.map(res => {
      expect(res.status).toBe(201);
      return res.body.data.ticket.ticketNumber;
    });

    // Verify all ticket numbers are strictly unique (Set length == total requests)
    const uniqueNumbers = new Set(ticketNumbers);
    expect(uniqueNumbers.size).toBe(concurrentRequests);

    // Verify format
    for (const num of ticketNumbers) {
      expect(num).toMatch(new RegExp(`^HD-${currentYear}-\\d{4}$`));
    }
  });

  it('Search Sanitization: Special regex metacharacters do not crash search or cause ReDoS', async () => {
    const res = await request(app)
      .get('/api/v1/tickets?search=.*((((([abc]')
      .set('Cookie', [`token=${employeeToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.tickets)).toBe(true);
  });
});

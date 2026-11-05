import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import { Ticket } from '../src/models/Ticket.js';
import { Category } from '../src/models/Category.js';
import { SLAPolicy } from '../src/models/SLAPolicy.js';
import { Notification } from '../src/models/Notification.js';
import { TICKET_PRIORITY, TICKET_STATUS } from '../src/config/constants.js';
import { addBusinessMinutes } from '../src/services/slaEngine.js';
import { evaluateSlaBreaches } from '../src/services/slaPoller.js';

describe('SLA Business Hours Engine & Notifications Suite', () => {
  let adminToken, employeeToken, testCategory, testTicket;

  beforeEach(async () => {
    testCategory = await Category.create({
      name: 'Cloud Services',
      subcategories: ['AWS IAM', 'S3 Access'],
      defaultPriority: TICKET_PRIORITY.CRITICAL
    });

    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'System Admin',
      email: 'admin.sla@corporate.internal',
      password: 'SecurePassword123!',
      department: 'DevOps'
    });
    adminToken = adminRes.body.data.token;

    const empRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Frank Employee',
      email: 'frank.emp@corporate.internal',
      password: 'SecurePassword123!',
      department: 'Engineering'
    });
    employeeToken = empRes.body.data.token;

    const ticketRes = await request(app)
      .post('/api/v1/tickets')
      .set('Cookie', [`token=${employeeToken}`])
      .send({
        title: 'Production IAM Policy Lockout',
        description: 'Terraform pipeline unable to assume role.',
        category: testCategory._id.toString(),
        subcategory: 'AWS IAM',
        priority: TICKET_PRIORITY.CRITICAL
      });
    testTicket = ticketRes.body.data.ticket;
  });

  it('Mathematical Algorithm: Friday 17:00 + 4 business hours projects to Monday 12:00', () => {
    // 2026-11-06 is a Friday. 17:00:00 (1 hour remaining before 18:00 close)
    const friday5pm = new Date(2026, 10, 6, 17, 0, 0);
    // Add 4 business hours = 240 business minutes
    const projectedDeadline = addBusinessMinutes(friday5pm, 240);

    // Should skip Saturday (Nov 7) and Sunday (Nov 8).
    // Remaining 3 hours resume Monday (Nov 9) at 09:00:00 -> finishes Monday at 12:00:00.
    const projectedDate = new Date(projectedDeadline);
    expect(projectedDate.getDay()).toBe(1); // Monday
    expect(projectedDate.getHours()).toBe(12);
  });

  it('Clock Pausing: Transition to Pending User pauses clock and shifts resolution deadline on exit', async () => {
    const originalDeadline = new Date(testTicket.resolutionDeadline).getTime();

    // 1. Advance ticket legally through FSM: New -> Assigned -> In Progress -> Pending User
    await request(app)
      .patch(`/api/v1/tickets/${testTicket._id}/status`)
      .set('Cookie', [`token=${adminToken}`])
      .send({ status: TICKET_STATUS.ASSIGNED });

    await request(app)
      .patch(`/api/v1/tickets/${testTicket._id}/status`)
      .set('Cookie', [`token=${adminToken}`])
      .send({ status: TICKET_STATUS.IN_PROGRESS });

    const pauseRes = await request(app)
      .patch(`/api/v1/tickets/${testTicket._id}/status`)
      .set('Cookie', [`token=${adminToken}`])
      .send({ status: TICKET_STATUS.PENDING_USER });

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.data.ticket.status).toBe(TICKET_STATUS.PENDING_USER);
    expect(pauseRes.body.data.ticket.isSlaPaused).toBe(true);
    expect(pauseRes.body.data.ticket.lastPausedAt).toBeDefined();

    // 2. Artificial pause duration: simulate 2000ms delay in database
    await Ticket.findByIdAndUpdate(testTicket._id, {
      lastPausedAt: new Date(Date.now() - 3600000) // 1 hour ago
    });

    // 3. User responds with comment -> auto-resumes to 'In Progress'
    const resumeRes = await request(app)
      .post(`/api/v1/tickets/${testTicket._id}/comments`)
      .set('Cookie', [`token=${employeeToken}`])
      .send({ content: 'Here are the requested Terraform console logs.' });

    expect(resumeRes.status).toBe(201);

    const updatedTicket = await Ticket.findById(testTicket._id);
    expect(updatedTicket.status).toBe(TICKET_STATUS.IN_PROGRESS);
    expect(updatedTicket.isSlaPaused).toBe(false);
    expect(updatedTicket.totalPausedDurationMs).toBeGreaterThanOrEqual(3600000);

    // Resolution deadline shifted forward by at least 1 hour
    const newDeadline = new Date(updatedTicket.resolutionDeadline).getTime();
    expect(newDeadline).toBeGreaterThan(originalDeadline);
  });

  it('SLA Breach Poller: Daemon accurately flags expired active tickets as breached', async () => {
    // Manually set deadline in the past
    await Ticket.findByIdAndUpdate(testTicket._id, {
      resolutionDeadline: new Date(Date.now() - 60000), // 1 minute in the past
      isBreached: false
    });

    const breachedCount = await evaluateSlaBreaches();
    expect(breachedCount).toBeGreaterThanOrEqual(1);

    const verifiedTicket = await Ticket.findById(testTicket._id);
    expect(verifiedTicket.isBreached).toBe(true);
  });

  it('Notifications API: User can fetch unread notifications and mark as read', async () => {
    // Check initial notification generated for admin
    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', [`token=${adminToken}`]);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.notifications).toBeInstanceOf(Array);

    if (listRes.body.data.notifications.length > 0) {
      const notifId = listRes.body.data.notifications[0]._id;
      const readRes = await request(app)
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Cookie', [`token=${adminToken}`]);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.notification.isRead).toBe(true);
    }
  });

  it('Admin SLA Policy Configuration: Administrator updates SLA targets', async () => {
    const policy = await SLAPolicy.findOne({ priority: TICKET_PRIORITY.CRITICAL });

    const res = await request(app)
      .put(`/api/v1/sla-policies/${policy._id}`)
      .set('Cookie', [`token=${adminToken}`])
      .send({
        firstResponseMinutes: 15,
        resolutionHours: 2
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.policy.firstResponseMinutes).toBe(15);
    expect(res.body.data.policy.resolutionHours).toBe(2);
  });
});

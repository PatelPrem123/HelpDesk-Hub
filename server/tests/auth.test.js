import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import { User } from '../src/models/User.js';
import { ROLES } from '../src/config/constants.js';

describe('Authentication & RBAC Test Suite', () => {
  const validUser = {
    name: 'Alice Employee',
    email: 'alice@corporate.internal',
    password: 'SecurePassword123!',
    department: 'Finance'
  };

  it('POST /api/v1/auth/register should register first user as Administrator', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.role).toBe(ROLES.ADMINISTRATOR);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.token).toBeDefined();

    // Verify Set-Cookie header
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('token=');
    expect(cookies[0]).toContain('HttpOnly');
  });

  it('POST /api/v1/auth/register should reject duplicate email with 409 Conflict', async () => {
    // First registration
    await request(app).post('/api/v1/auth/register').send(validUser);

    // Second registration with same email
    const res = await request(app).post('/api/v1/auth/register').send({
      ...validUser,
      name: 'Duplicate Alice'
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('POST /api/v1/auth/register should reject weak password with 400 Bad Request', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      ...validUser,
      email: 'weak@corporate.internal',
      password: 'weak'
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('POST /api/v1/auth/login should authenticate valid credentials', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: validUser.email,
      password: validUser.password
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('POST /api/v1/auth/login should reject incorrect password with 401 Unauthorized', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: validUser.email,
      password: 'WrongPassword999!'
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login should reject deactivated user with 403 Forbidden', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const userId = regRes.body.data.user._id;

    // Deactivate user in database
    await User.findByIdAndUpdate(userId, { isActive: false });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: validUser.email,
      password: validUser.password
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('deactivated');
  });

  it('GET /api/v1/auth/me should return authenticated profile when valid cookie is presented', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const token = regRes.body.data.token;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('GET /api/v1/auth/me should reject unauthenticated request with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

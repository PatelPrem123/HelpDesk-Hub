import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { env } from '../config/env.js';
import { ROLES } from '../config/constants.js';
import { AppError } from '../middleware/errorHandler.js';

export function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export async function registerUser({ name, email, password, department, phone, role, ipAddress, userAgent }) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('An account with this email address already exists.', 409);
  }

  // Work factor 12 for enterprise hardening
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // If first user in database, promote to Administrator, otherwise default to requested role or Employee
  const userCount = await User.countDocuments();
  const assignedRole = userCount === 0 ? ROLES.ADMINISTRATOR : (role || ROLES.EMPLOYEE);

  const user = await User.create({
    name,
    email,
    passwordHash,
    department,
    phone,
    role: assignedRole
  });

  const token = generateToken(user);

  await AuditLog.create({
    action: 'AUTH_REGISTER',
    entityType: 'User',
    entityId: user._id,
    performedBy: user._id,
    newState: { email: user.email, role: user.role, department: user.department },
    ipAddress: ipAddress || '127.0.0.1',
    userAgent: userAgent || 'Unknown'
  });

  return { user, token };
}

export async function loginUser({ email, password, ipAddress, userAgent }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid email or password credentials.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact IT Help Desk.', 403);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password credentials.', 401);
  }

  const token = generateToken(user);

  await AuditLog.create({
    action: 'AUTH_LOGIN',
    entityType: 'User',
    entityId: user._id,
    performedBy: user._id,
    ipAddress: ipAddress || '127.0.0.1',
    userAgent: userAgent || 'Unknown'
  });

  return { user, token };
}

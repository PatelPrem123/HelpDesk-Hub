import { registerSchema, loginSchema } from '../validators/authValidators.js';
import * as authService from '../services/authService.js';
import { env } from '../config/env.js';

function setAuthCookie(res, token) {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours in ms
  });
}

export async function register(req, res, next) {
  try {
    const validatedData = registerSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const { user, token } = await authService.registerUser({
      ...validatedData,
      ipAddress,
      userAgent
    });

    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Account successfully registered',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const { user, token } = await authService.loginUser({
      ...validatedData,
      ipAddress,
      userAgent
    });

    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
}

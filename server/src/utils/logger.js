const SENSITIVE_KEYS = new Set(['password', 'passwordHash', 'token', 'authorization', 'cookie', 'refreshToken']);

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  if (Array.isArray(meta)) return meta.map(sanitizeMeta);

  const clean = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeMeta(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export const logger = {
  info(message, meta) {
    if (process.env.NODE_ENV === 'test') return;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, meta ? sanitizeMeta(meta) : '');
  },
  warn(message, meta) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, meta ? sanitizeMeta(meta) : '');
  },
  error(message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, error?.message || error || '');
    if (error?.stack && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.error(error.stack);
    }
  }
};

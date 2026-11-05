import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_high_entropy_32_characters_long';
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'test_cookie_secret_high_entropy_32_chars';

let mongoServer;

beforeAll(async () => {
  const localUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/helpdesk_hub_test';
  let uri = localUri;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    // Fallback to MongoMemoryServer only if local MongoDB is unreachable
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }
});

beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

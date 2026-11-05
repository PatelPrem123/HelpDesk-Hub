import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

export async function connectDB(uri = env.MONGODB_URI) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true
    });
    isConnected = true;
    if (env.NODE_ENV !== 'test') {
      console.log(`[Database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    }
    return conn.connection;
  } catch (error) {
    console.error(`[Database Error] Connection failure: ${error.message}`);
    throw error;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

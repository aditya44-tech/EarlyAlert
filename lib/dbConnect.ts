import mongoose from 'mongoose';

mongoose.set('bufferCommands', false); // CRITICAL: fail fast, don't hang

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

/**
 * When the cluster is unreachable, stop hammering it with connection attempts.
 * After this many ms, allow one retry (in case the cluster was resumed).
 */
const COOLDOWN_MS = 60_000; // 1 minute
let lastFailedAt = 0;

export async function isDbConnected(): Promise<boolean> {
  const currentState = mongoose.connection.readyState as number;
  if (currentState === 1) {
    lastFailedAt = 0; // reset cooldown on success
    return true;
  }
  if (!MONGODB_URI) {
    return false;
  }
  // If we recently failed, skip the expensive connection attempt entirely.
  if (lastFailedAt && Date.now() - lastFailedAt < COOLDOWN_MS) {
    return false;
  }
  try {
    const conn = await dbConnect();
    if (!conn) {
      lastFailedAt = Date.now();
      return false;
    }
    return (mongoose.connection.readyState as number) === 1;
  } catch {
    lastFailedAt = Date.now();
    return false;
  }
}

async function dbConnect() {
  if (!MONGODB_URI) {
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2500,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((m) => m)
      .catch((err) => {
        console.warn('MongoDB not connected, using in-memory store:', err.message);
        cached.promise = null;
        return null;
      });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch {
    cached.promise = null;
    return null;
  }
  
  return cached.conn;
}

export default dbConnect;


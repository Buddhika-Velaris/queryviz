import mongoose from 'mongoose';

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[db] MONGODB_URI not set — history persistence disabled');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false, // fail immediately instead of buffering when disconnected
    });
    connected = true;
    console.log('[db] Connected to MongoDB — readyState:', mongoose.connection.readyState);
  } catch (err: any) {
    console.error('[db] MongoDB connection FAILED — history persistence disabled. Reason:', err.message);
    // Non-fatal — app still works without persistence
  }
}

export function isConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}

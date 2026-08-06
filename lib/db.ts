import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

if (!process.env.MONGODB_URI) {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envResult = dotenv.config({ path: envPath });
    if (envResult.error) {
        const fallbackPath = path.join(__dirname, '..', '.env.local');
        dotenv.config({ path: fallbackPath });
    }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error(
        'Please define the MONGODB_URI environment variable inside .env.local'
    );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null, listenersAttached: false };
}

// Only attach the event listeners ONCE, globally
if (!cached.listenersAttached) {
    cached.listenersAttached = true;

    mongoose.connection.on('disconnected', () => {
        console.warn('[DB] MongoDB disconnected. Clearing cache.');
        cached.conn = null;
        cached.promise = null;
    });

    mongoose.connection.on('error', (err) => {
        console.error('[DB] MongoDB connection error:', err.message);
        cached.conn = null;
        cached.promise = null;
    });

    mongoose.connection.on('connected', () => {
        console.log('[DB] MongoDB connected successfully.');
    });
}

async function dbConnect() {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise || mongoose.connection.readyState === 0) {
        const opts = {
            serverSelectionTimeoutMS: 5000, // Faster failure if DB is down
            socketTimeoutMS: 45000,
            maxPoolSize: 100, // Increased for concurrent users
            minPoolSize: 5,   // Keep pool ready
            retryWrites: true,
            connectTimeoutMS: 10000,
        };

        console.log('[DB] Initializing new MongoDB connection...');
        cached.promise = mongoose.connect(MONGODB_URI!, opts);
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        console.error('[DB] Connection failed:', (e as Error).message);
        cached.promise = null;
        cached.conn = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;

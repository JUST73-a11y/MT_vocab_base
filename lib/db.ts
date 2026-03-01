import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

// Force load .env.local from the current project directory 
// to avoid Next.js root detection issues (EBUSY/Multiple lockfiles)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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

    // Reset stale cache if connection is not healthy
    if (mongoose.connection.readyState !== 1) {
        cached.conn = null;
        cached.promise = null;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 60000,
            socketTimeoutMS: 120000,
            maxIdleTimeMS: 10000,
            maxPoolSize: 10,
            minPoolSize: 1,
            retryWrites: true,
            connectTimeoutMS: 60000,
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

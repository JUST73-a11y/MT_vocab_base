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

const PRIMARY_URI = process.env.MONGODB_URI || 'mongodb+srv://004muhamadali_db_user:5J2IDG4ij7Mk8KBb@cluster0.lxzgspe.mongodb.net/?appName=Cluster0';
const FALLBACK_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/mtvocab';

let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null, listenersAttached: false };
}

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
            serverSelectionTimeoutMS: 15000, // 15 seconds to ensure TLS handshake completes
            socketTimeoutMS: 45000,
            maxPoolSize: 100,
            minPoolSize: 5,
            retryWrites: true,
            connectTimeoutMS: 20000,
            family: 4, // Force IPv4 to prevent IPv6 DNS stall in Node 18+
        };

        console.log('[DB] Initializing new MongoDB connection...');
        cached.promise = mongoose.connect(PRIMARY_URI, opts).catch(async (primaryErr) => {
            console.warn('[DB] Primary Atlas connection failed/timed out:', primaryErr.message);
            console.log('[DB] Attempting automatic fallback connection...');
            try {
                return await mongoose.connect(FALLBACK_URI, { ...opts, serverSelectionTimeoutMS: 5000 });
            } catch (fallbackErr) {
                console.error('[DB] Fallback connection failed:', (fallbackErr as Error).message);
                throw primaryErr;
            }
        });
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
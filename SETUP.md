# 🚀 Quick Start Guide

## MongoDB Setup Required!

The app uses **Next.js + MongoDB** (via Mongoose).

### 1. MongoDB Connection

You need a MongoDB connection string. 
- **Local:** `mongodb://localhost:27017/vocab-learner` (if you have MongoDB installed)
- **Atlas:** Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas) and get the URI.

### 2. Configure Environment Variables

Open `.env.local` and update it:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/vocab-learner
# OR for Atlas: mongodb+srv://<user>:<pass>@cluster.mongodb.net/vocab-learner

# JWT Secret (for authentication)
JWT_SECRET=your-secret-key-change-me-to-something-secure
```

### 3. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- **Teacher Dashboard**: Create units, add words, configure settings.
- **Student Dashboard**: Practice words with random timer.
- **Authentication**: Email/Password login (stored in MongoDB).

## Demo Mode

1. Register a **Teacher** account.
2. Create a Unit and add some Words.
3. Register a **Student** account (or use incognito).
4. Go to **Start Random Practice**.


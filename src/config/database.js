

const mongoose = require('mongoose');

// Cached connection variable to persist across hot reloads in Serverless
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable Mongoose buffering to fail fast if not connected
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    console.log('Connecting to MongoDB...');
    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
  }

  return cached.conn;
};

// Handle events once
mongoose.connection.once('disconnected', () => {
  console.log('MongoDB disconnected');
});

module.exports = connectDB;

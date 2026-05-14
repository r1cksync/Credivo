import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', false);

let connectPromise: Promise<typeof mongoose> | null = null;

export function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  if (connectPromise) return connectPromise;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  connectPromise = mongoose
    .connect(uri, {
      dbName: 'credivo',
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
    })
    .then((m) => {
      console.log('[db] Connected to MongoDB Atlas');
      return m;
    })
    .catch((e) => {
      connectPromise = null;
      throw e;
    });
  return connectPromise;
}

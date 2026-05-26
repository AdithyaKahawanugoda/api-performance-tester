import { beforeAll, afterEach, afterAll } from 'vitest';
import mongoose from 'mongoose';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env['MONGODB_URI']!);
  }
  // Clear all collections before this file's tests so prior files don't leak data
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});

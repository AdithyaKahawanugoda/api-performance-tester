import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

export async function setup(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  process.env['NODE_ENV'] = 'test';
  process.env['MONGODB_URI'] = mongod.getUri();
  process.env['REDIS_URL'] = 'redis://localhost:6379';
  process.env['LOG_LEVEL'] = 'error';
  process.env['CORS_ORIGIN'] = 'http://localhost:3000';
}

export async function teardown(): Promise<void> {
  await mongod?.stop();
}

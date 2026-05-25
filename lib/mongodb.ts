import { MongoClient, ServerApiVersion } from 'mongodb';
import 'server-only';

const MONGODB_URI = process.env.MONGODB_URI!;

const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 5000,
});

export const COLLECTIONS = { USERS: 'users' } as const;

let connectionPromise: Promise<typeof client> | null = null;

client.on('close', () => {
  connectionPromise = null;
});

function getConnectedClient() {
  if (!connectionPromise) {
    connectionPromise = client.connect().then(() => {
      return client;
    }).catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }
  return connectionPromise;
}

export async function getDb() {
  await getConnectedClient();
  return client.db("miniprogram_manager");
}

export async function getUsersCollection() {
  await getConnectedClient();
  const db = client.db("miniprogram_manager");
  return db.collection(COLLECTIONS.USERS);
}

export async function ensureIndexes() {
  const col = await getUsersCollection();
  await col.createIndex({ username: 1 }, { unique: true });
}
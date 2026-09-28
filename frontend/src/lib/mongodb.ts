import {
  MongoClient,
  type Db,
  type Collection,
  type ObjectId,
} from "mongodb";
import type {
  UserDocument,
  TaskDocument,
  CategoryDocument,
  SessionDocument,
} from "./types";

/**
 * A single cached MongoClient per server instance.
 *
 * On Vercel the same instance is reused across warm invocations, so we hang
 * the client promise off globalThis rather than creating one per request.
 * Creating a client per request would burn connections against the Atlas Free
 * tier's 500-connection limit and add ~100ms to every cold request.
 */

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "MONGODB_URI is not set. Add it to .env.local (see .env.example) and to your Vercel environment variables.",
  );
}

export const DB_NAME = process.env.MONGODB_DB || "todo_app";

declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
  var __mongoIndexesReady: Promise<void> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  if (!globalThis.__mongoClientPromise) {
    const client = new MongoClient(uri as string, {
      tls: process.env.MONGODB_TLS === "false" ? false : true,
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10_000,
      retryWrites: true,
    });
    globalThis.__mongoClientPromise = client.connect();
  }
  return globalThis.__mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(DB_NAME);
}

/**
 * Every collection accessor goes through ensureIndexes() first.
 *
 * Index creation is a one-time cost per warm instance, so paying it here means
 * a cold start cannot serve a collection scan before the indexes exist.
 */
export async function getUsers(): Promise<Collection<UserDocument>> {
  await ensureIndexes();
  return (await getDb()).collection<UserDocument>("users");
}

export async function getTasks(): Promise<Collection<TaskDocument>> {
  await ensureIndexes();
  return (await getDb()).collection<TaskDocument>("tasks");
}

export async function getCategories(): Promise<Collection<CategoryDocument>> {
  await ensureIndexes();
  return (await getDb()).collection<CategoryDocument>("categories");
}

export async function getSessions(): Promise<Collection<SessionDocument>> {
  await ensureIndexes();
  return (await getDb()).collection<SessionDocument>("sessions");
}

/**
 * Inserts a document whose _id the driver generates, and returns that id.
 *
 * The document types declare _id as required because reads need it, which would
 * otherwise force every insert to mint an ObjectId by hand. This keeps the
 * happy path to "describe the fields, get the id back".
 *
 * The public signature is fully typed; only the body steps down to an untyped
 * collection, because the driver's own input type is a conditional that cannot
 * be satisfied for a schema with a required _id.
 */
export async function insertDoc<T extends { _id: ObjectId }>(
  collection: Collection<T>,
  document: Omit<T, "_id">,
): Promise<ObjectId> {
  const result = await (
    collection as unknown as Collection<Record<string, unknown>>
  ).insertOne(document);
  return result.insertedId;
}

/**
 * Indexes are created once per instance.
 *
 * Kept deliberately small because Atlas Free has 512 MB of storage:
 *   users      unique email
 *   categories unique (userId, name)
 *   tasks      three compound indexes, each also serving userId-only lookups
 *   sessions   unique tokenHash + a TTL index that auto-expires stale sessions
 */
function ensureIndexes(): Promise<void> {
  if (!globalThis.__mongoIndexesReady) {
    globalThis.__mongoIndexesReady = (async () => {
      const db = await getDb();
      await Promise.all([
        db.collection("users").createIndex({ email: 1 }, { unique: true }),
        db.collection("categories").createIndex(
          { userId: 1, name: 1 },
          { unique: true },
        ),
        db.collection("tasks").createIndex({ userId: 1, dueDate: 1 }),
        db.collection("tasks").createIndex({ userId: 1, status: 1, dueDate: 1 }),
        db.collection("tasks").createIndex({ userId: 1, categoryId: 1 }),
        db.collection("tasks").createIndex({ userId: 1, createdAt: -1 }),
        db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
        db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ]);
    })().catch((error: unknown) => {
      // Never let a transient failure here take down the app; the fallback
      // behaviour is a collection scan, which is slow but correct.
      globalThis.__mongoIndexesReady = undefined;
      console.error("[mongodb] failed to create indexes:", error);
    });
  }
  return globalThis.__mongoIndexesReady;
}

/** Explicit bootstrap, for callers that want the handle rather than a collection. */
export async function db(): Promise<Db> {
  await ensureIndexes();
  return getDb();
}

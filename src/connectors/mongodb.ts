import { MongoClient, ObjectId, Db, Collection } from 'mongodb';
import type { Adapter, QueryParams, AdapterConfig } from './base';

/**
 * Functional MongoDB adapter factory
 * Creates adapter instance without classes, following Encore.ts best practices
 */
export default function createMongoAdapter<T = any>(
  config: AdapterConfig & {
    table: string; // collection name in MongoDB
    uri: string;
    dbName: string;
  }
): Adapter<T> {
  let client: MongoClient;
  let db: Db;
  let collection: Collection;

  return {
    async connect() {
      client = new MongoClient(config.uri);
      await client.connect();
      db = client.db(config.dbName);
      collection = db.collection(config.table);
    },

    async disconnect() {
      if (client) {
        await client.close();
      }
    },

    async query(params: QueryParams = {}): Promise<T[]> {
      const filter = params.filter || {};

      // Convert string IDs to ObjectId for MongoDB
      if (filter._id && typeof filter._id === 'string') {
        filter._id = new ObjectId(filter._id);
      }

      let cursor = collection.find(filter);

      // Apply field selection
      if (params.select) {
        const projection: Record<string, number> = {};
        if (Array.isArray(params.select)) {
          params.select.forEach((field) => {
            projection[field] = 1;
          });
        } else if (typeof params.select === 'string' && params.select !== '*') {
          projection[params.select] = 1;
        }
        if (Object.keys(projection).length > 0) {
          cursor = cursor.project(projection);
        }
      }

      // Apply sorting
      if (params.orderBy && params.orderBy.length > 0) {
        const sort: Record<string, 1 | -1> = {};
        params.orderBy.forEach(({ field, direction }) => {
          sort[field] = direction === 'asc' ? 1 : -1;
        });
        cursor = cursor.sort(sort);
      }

      // Apply pagination
      if (params.offset) {
        cursor = cursor.skip(params.offset);
      }
      if (params.limit) {
        cursor = cursor.limit(params.limit);
      }

      const results = await cursor.toArray();
      return results.map((doc) => ({
        ...doc,
        id: doc._id?.toString(), // Convert ObjectId to string
      })) as T[];
    },

    async queryOne(id: string): Promise<T | null> {
      const objectId = new ObjectId(id);
      const doc = await collection.findOne({ _id: objectId });

      if (!doc) return null;

      return {
        ...doc,
        id: doc._id.toString(),
      } as T;
    },

    async insert(data: Omit<T, 'id'>): Promise<T> {
      const { id, ...docData } = data as any;
      const result = await collection.insertOne(docData);

      return {
        ...docData,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      } as T;
    },

    async update(id: string, data: Partial<T>): Promise<T | null> {
      const objectId = new ObjectId(id);
      const { id: _, ...updateData } = data as any;

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result || !result.value) return null;

      return {
        ...result.value,
        id: result.value._id.toString(),
      } as T;
    },

    async delete(id: string): Promise<boolean> {
      const objectId = new ObjectId(id);
      const result = await collection.deleteOne({ _id: objectId });
      return result.deletedCount > 0;
    },

    async count(filter: Record<string, any> = {}): Promise<number> {
      // Convert string IDs to ObjectId for MongoDB
      if (filter._id && typeof filter._id === 'string') {
        filter._id = new ObjectId(filter._id);
      }

      return await collection.countDocuments(filter);
    },
  };
}

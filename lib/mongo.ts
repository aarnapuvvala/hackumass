import { MongoClient, type Collection, type Document } from "mongodb"

export type PantryRecord = {
  name: string
  date: string
  days: string
  hours: string
  foods: string[]
  updatedAt: Date
}

const databaseName = "hackumass"

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>
}

export async function getMongoClient() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error("MONGODB_URI is not set")
  }
  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(uri)
    globalForMongo.mongoClientPromise = client.connect()
  }
  return globalForMongo.mongoClientPromise
}

export type StringIdDocument = { _id: string; [key: string]: any }

export async function mongoCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const client = await getMongoClient()
  return client.db(databaseName).collection<T>(name)
}

export async function pantryCollection(): Promise<Collection<PantryRecord>> {
  return mongoCollection<PantryRecord>("pantries")
}

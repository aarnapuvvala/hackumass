import { MongoClient, type Collection } from "mongodb"

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

export async function pantryCollection(): Promise<Collection<PantryRecord>> {
  const client = await getMongoClient()
  return client.db(databaseName).collection<PantryRecord>("pantries")
}

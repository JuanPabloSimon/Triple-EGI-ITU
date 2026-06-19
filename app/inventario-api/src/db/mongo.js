// src/db/mongo.js
import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

let client = null;
let db = null;

// Devuelve la base conectada, creando el cliente la primera vez (singleton).
export async function getMongoDb() {
  if (db) return db;

  try {
    client = new MongoClient(env.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(env.mongo.database);
    console.log(`[mongo] Conectado a MongoDB (${env.mongo.database})`);
    return db;
  } catch (err) {
    client = null;
    db = null;
    console.error("[mongo] No se pudo conectar:", err.message);
    throw err;
  }
}

// Devuelve directamente la colección de hardware (atajo de uso frecuente).
export async function getHardwareCollection() {
  const database = await getMongoDb();
  return database.collection(env.mongo.collection);
}

// Verifica que MongoDB responda (para el healthcheck de Kubernetes).
export async function pingMongo() {
  try {
    const database = await getMongoDb();
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

// Cierre ordenado al apagar el contenedor.
export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("[mongo] Conexión cerrada");
  }
}

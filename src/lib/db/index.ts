import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Une seule connexion (pool) par processus, conservée entre les rechargements à chaud en développement.
const globalPourDb = globalThis as unknown as { poolClans?: Pool };

export const pool =
  globalPourDb.poolClans ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });

if (process.env.NODE_ENV !== "production") globalPourDb.poolClans = pool;

export const db = drizzle(pool, { schema });

export type Db = typeof db;
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

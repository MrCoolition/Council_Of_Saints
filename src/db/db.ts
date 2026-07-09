import { attachDatabasePool } from "@vercel/functions";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  // Prevent excessive pools during local Next.js hot reload.
  var __sanctumPool: Pool | undefined;
}

function createPool(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true,
  });

  attachDatabasePool(pool);
  return pool;
}

export function hasDatabase() {
  return Boolean(getConnectionString());
}

export function getPool() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    throw new Error("Database connection string is not set");
  }

  if (!globalThis.__sanctumPool) {
    globalThis.__sanctumPool = createPool(connectionString);
  }

  return globalThis.__sanctumPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return getPool().query<T>(text, params);
}

export type SanctumPoolClient = PoolClient;

function getConnectionString() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL
  );
}

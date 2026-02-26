import { Pool } from 'pg'

const globalForDb = globalThis as unknown as { pool: Pool | undefined }

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }
  return globalForDb.pool
}

export async function query<T = unknown>(
  text: string,
  values?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool()
  const result = await pool.query(text, values)
  return { rows: (result.rows as T[]) || [], rowCount: result.rowCount ?? 0 }
}

export async function queryOne<T = unknown>(
  text: string,
  values?: unknown[]
): Promise<T | null> {
  const { rows } = await query<T>(text, values)
  return rows[0] ?? null
}

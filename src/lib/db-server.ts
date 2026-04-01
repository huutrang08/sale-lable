import { Pool, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  // Set default schema via server-side options — avoids running a query on
  // every new connection (which caused the pg DeprecationWarning).
  options: '-c search_path=sales',
});

/**
 * Execute a raw SQL query
 * @param text The SQL query string
 * @param params Optional parameters array
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  const res = await pool.query<T>(text, params);
  return res;
}

export default pool;

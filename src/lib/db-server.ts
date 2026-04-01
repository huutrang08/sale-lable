import { Pool, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Set to true if remote host requires SSL, but usually direct ip lacks valid cert
});

// Configure default schema
pool.on('connect', async (client) => {
  await client.query('SET search_path TO sales;');
});

/**
 * Execute a raw SQL query
 * @param text The SQL query string
 * @param params Optional parameters array
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

export default pool;

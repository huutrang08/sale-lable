import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgres://postgres:Abc%241243@14.224.185.1:5432/ship_partner',
  options: '-c search_path=sales'
});

async function run() {
  try {
    await pool.query('ALTER TABLE sales.orders ADD COLUMN discount NUMERIC(10, 2) DEFAULT 0.00;');
    console.log("Added discount column");
  } catch (err) {
    console.error(err.message);
  } finally {
    process.exit();
  }
}
run();

import pg from 'pg';
let pool;
let ready;
export async function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_NOT_CONFIGURED');
  pool ||= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 7000, idleTimeoutMillis: 10000 });
  ready ||= pool.query(`CREATE TABLE IF NOT EXISTS wozhi_rooms (
    id text PRIMARY KEY, control_hash text NOT NULL, screen_hash text NOT NULL,
    state jsonb NOT NULL, heartbeat jsonb, seen_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
    creator_hash text NOT NULL
  )`).catch(error => { ready = null; throw error; });
  await ready;
  return pool;
}
export async function closeDatabase() { if (pool) await pool.end(); pool = null; ready = null; }

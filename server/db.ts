/**
 * Database: PostgreSQL via pg (node-postgres)
 * On Replit: DATABASE_URL is injected automatically.
 * Locally: set DATABASE_URL in .env
 */
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Template literal wrapper compatible with postgres.js syntax
export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const query = strings.reduce((acc, str, i) => {
    if (i < values.length) {
      return acc + str + '$' + (i + 1);
    }
    return acc + str;
  }, '');

  return pool.query(query, values).then(res => res.rows as T[]);
}

// sql-first: convenience for single-row queries
sql.first = async <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T | undefined> => {
  const rows = await sql<T>(strings, ...values);
  return rows[0];
};

// sql.begin: simple transaction wrapper
sql.begin = async <T>(fn: (sql: typeof sql) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txSql = (strings: TemplateStringsArray, ...vals: unknown[]) => {
      const query = strings.reduce((acc, str, i) => {
        if (i < vals.length) {
          return acc + str + '$' + (i + 1);
        }
        return acc + str;
      }, '');
      return client.query(query, vals).then(res => res.rows as Record<string, unknown>[]);
    };
    const result = await fn(txSql as unknown as typeof sql);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

// sql.end: close pool
sql.end = async (): Promise<void> => {
  await pool.end();
};

export async function migrate(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS services (
      id          TEXT PRIMARY KEY,
      shop_id     TEXT NOT NULL DEFAULT 'shop1',
      name        TEXT NOT NULL,
      duration    INTEGER NOT NULL,
      price       NUMERIC NOT NULL,
      buffer      INTEGER NOT NULL DEFAULT 5,
      color       TEXT NOT NULL DEFAULT '#C89B3C'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id            TEXT PRIMARY KEY,
      shop_id       TEXT NOT NULL DEFAULT 'shop1',
      name          TEXT NOT NULL,
      phone         TEXT NOT NULL,
      notes         TEXT NOT NULL DEFAULT '',
      no_show_count INTEGER NOT NULL DEFAULT 0,
      is_frequent   BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)`;

  await sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id            TEXT PRIMARY KEY,
      shop_id       TEXT NOT NULL DEFAULT 'shop1',
      client_id     TEXT NOT NULL,
      client_name   TEXT NOT NULL,
      client_phone  TEXT NOT NULL,
      service_id    TEXT NOT NULL,
      service_name  TEXT NOT NULL,
      date          TEXT NOT NULL,
      start_time    TEXT NOT NULL,
      end_time      TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'Confirmada',
      notes         TEXT NOT NULL DEFAULT '',
      price         NUMERIC NOT NULL DEFAULT 0,
      duration      INTEGER NOT NULL DEFAULT 30,
      is_overbooked BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments(date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_appointments_shop   ON appointments(shop_id, date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS blocked_times (
      id         TEXT PRIMARY KEY,
      shop_id    TEXT NOT NULL DEFAULT 'shop1',
      label      TEXT NOT NULL,
      date       TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time   TEXT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_blocked_date ON blocked_times(date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      shop_id             TEXT PRIMARY KEY DEFAULT 'shop1',
      business_name       TEXT NOT NULL DEFAULT 'Agenda Barber Pro',
      open_time           TEXT NOT NULL DEFAULT '12:00',
      close_time          TEXT NOT NULL DEFAULT '23:00',
      working_days        TEXT NOT NULL DEFAULT '[0,2,3,4,5,6]',
      default_buffer      INTEGER NOT NULL DEFAULT 5,
      whatsapp_templates  TEXT NOT NULL DEFAULT '{}'
    )
  `;
}

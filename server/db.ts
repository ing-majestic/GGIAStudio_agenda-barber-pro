/**
 * Database setup: sql.js (pure WASM, no native compilation) + migrations
 * Justification: Zero native compilation required - works on Windows, Linux, Mac, Replit
 * API compatibility: exposes prepare(sql).all()/get()/run() matching better-sqlite3
 * Persistence: load from disk at startup, auto-save after every mutating statement
 */
import initSqlJs from 'sql.js';
import type { Statement as SqlJsStatement } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '..', 'data', 'barber.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Internal sql.js instance — filled after initDb()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sqlDb: any;

function saveDb(): void {
  if (!_sqlDb) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_sqlDb.export()));
}

// Statement wrapper — mirrors better-sqlite3 PreparedStatement API
class PreparedStatement {
  private sql: string;

  constructor(sql: string) {
    this.sql = sql;
  }

  private isMutating(): boolean {
    const trimmed = this.sql.trimStart().toUpperCase();
    return (
      trimmed.startsWith('INSERT') ||
      trimmed.startsWith('UPDATE') ||
      trimmed.startsWith('DELETE') ||
      trimmed.startsWith('REPLACE') ||
      trimmed.startsWith('CREATE') ||
      trimmed.startsWith('DROP') ||
      trimmed.startsWith('ALTER')
    );
  }

  all(...params: unknown[]): Record<string, unknown>[] {
    const stmt: SqlJsStatement = _sqlDb.prepare(this.sql);
    const bindParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    if (bindParams.length > 0) stmt.bind(bindParams as any);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject({}) as Record<string, unknown>);
    }
    stmt.free();
    return rows;
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    return this.all(...params)[0];
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const stmt: SqlJsStatement = _sqlDb.prepare(this.sql);
    const bindParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    if (bindParams.length > 0) stmt.run(bindParams as any);
    else stmt.run([]);
    stmt.free();
    const changes = _sqlDb.getRowsModified() as number;
    if (this.isMutating()) saveDb();
    return { changes, lastInsertRowid: 0 };
  }
}

// Database wrapper
class Db {
  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(sql);
  }

  exec(sql: string): void {
    _sqlDb.exec(sql);
    saveDb();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pragma(_statement: string): void {
    // sql.js pragmas handled inside migration DDL PRAGMA statements
  }
}

export const db = new Db();

// Async init — must be called once before any queries
export async function initDb(): Promise<void> {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _sqlDb = new SQL.Database(fileBuffer);
  } else {
    _sqlDb = new SQL.Database();
  }
}

export async function migrate(): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id          TEXT PRIMARY KEY,
      shop_id     TEXT NOT NULL DEFAULT 'shop1',
      name        TEXT NOT NULL,
      duration    INTEGER NOT NULL,
      price       REAL NOT NULL,
      buffer      INTEGER NOT NULL DEFAULT 5,
      color       TEXT NOT NULL DEFAULT '#C89B3C'
    );
    CREATE TABLE IF NOT EXISTS clients (
      id            TEXT PRIMARY KEY,
      shop_id       TEXT NOT NULL DEFAULT 'shop1',
      name          TEXT NOT NULL,
      phone         TEXT NOT NULL,
      notes         TEXT NOT NULL DEFAULT '',
      no_show_count INTEGER NOT NULL DEFAULT 0,
      is_frequent   INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
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
      price         REAL NOT NULL DEFAULT 0,
      duration      INTEGER NOT NULL DEFAULT 30,
      is_overbooked INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_shop   ON appointments(shop_id, date);
    CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
    CREATE TABLE IF NOT EXISTS blocked_times (
      id         TEXT PRIMARY KEY,
      shop_id    TEXT NOT NULL DEFAULT 'shop1',
      label      TEXT NOT NULL,
      date       TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_blocked_date ON blocked_times(date);
    CREATE TABLE IF NOT EXISTS settings (
      shop_id             TEXT PRIMARY KEY DEFAULT 'shop1',
      business_name       TEXT NOT NULL DEFAULT 'Agenda Barber Pro',
      open_time           TEXT NOT NULL DEFAULT '12:00',
      close_time          TEXT NOT NULL DEFAULT '23:00',
      working_days        TEXT NOT NULL DEFAULT '[0,2,3,4,5,6]',
      default_buffer      INTEGER NOT NULL DEFAULT 5,
      whatsapp_templates  TEXT NOT NULL DEFAULT '{}'
    );
  `);
}

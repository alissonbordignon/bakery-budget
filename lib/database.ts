import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "orcamentos-dreon.sqlite");

let database: Database.Database | undefined;

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      minimum_quantity REAL NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY NOT NULL,
      quote_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL DEFAULT '',
      event_date TEXT,
      valid_until TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      subtotal_cents INTEGER NOT NULL,
      deposit_percent REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY NOT NULL,
      quote_id TEXT NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_products_active_category ON products (active, category);
    CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items (quote_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes (created_at);
  `);
}

export function getDatabase(): Database.Database {
  if (database) return database;

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  createSchema(database);
  return database;
}

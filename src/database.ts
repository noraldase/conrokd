import Database from 'better-sqlite3'

export const db = new Database('database.sqlite')

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id TEXT PRIMARY KEY,
      active_wallet INTEGER
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT,
      address TEXT,
      encrypted_private_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

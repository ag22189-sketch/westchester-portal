import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", "data", "subscribers.db");

// Ensure data directory exists
import { mkdirSync } from "fs";
mkdirSync(join(__dirname, "..", "data"), { recursive: true });

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    town TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(email, town)
  )
`);

export function subscribe(email, towns) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO subscribers (email, town) VALUES (?, ?)"
  );
  const batch = db.transaction((towns) => {
    for (const town of towns) {
      insert.run(email, town);
    }
  });
  batch(towns);
}

export function unsubscribe(email) {
  db.prepare("DELETE FROM subscribers WHERE email = ?").run(email);
}

export function getSubscribers() {
  const rows = db.prepare("SELECT email, town FROM subscribers ORDER BY email").all();
  const grouped = {};
  for (const { email, town } of rows) {
    if (!grouped[email]) grouped[email] = [];
    grouped[email].push(town);
  }
  return grouped;
}

export function getTownsForEmail(email) {
  return db
    .prepare("SELECT town FROM subscribers WHERE email = ?")
    .all(email)
    .map((r) => r.town);
}

export default db;
